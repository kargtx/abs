#!/usr/bin/env bash
# Сборка и выкладка на сервер под pm2. Нужен вход по SSH-ключу.
# Запуск: bash deploy.sh
# Адрес сервера берётся из переменной HOST или из файла .deploy.env (не попадает в git):
#   HOST=user@server
#   PORT=4444
set -euo pipefail
cd "$(dirname "$0")"
[ -f .deploy.env ] && . ./.deploy.env
: "${HOST:?Укажите HOST=user@server в .deploy.env или в окружении}"
PORT="${PORT:-4444}"
DIR="apps/press/dist"

npm run build
tar -czf /tmp/press-dist.tgz -C dist .
scp -o BatchMode=yes /tmp/press-dist.tgz "$HOST:/tmp/press-dist.tgz"
ssh -o BatchMode=yes "$HOST" "set -e
  mkdir -p ~/$DIR && rm -rf ~/$DIR/* && tar -xzf /tmp/press-dist.tgz -C ~/$DIR && rm /tmp/press-dist.tgz
  pm2 describe press >/dev/null 2>&1 || pm2 serve ~/$DIR $PORT --spa --name press
  pm2 restart press >/dev/null && pm2 save >/dev/null
  curl -s -o /dev/null -w 'press: HTTP %{http_code}\n' http://127.0.0.1:$PORT/"
rm -f /tmp/press-dist.tgz
