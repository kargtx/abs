import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Fig } from "../components/Fig";
import { IconClose, IconNext, IconPause, IconPlay, IconPrev } from "../components/Icons";
import { EXERCISE_BY_ID } from "../data/exercises";
import { NO_MUSIC } from "../data/music";
import { BUILTIN_WORKOUTS } from "../data/workouts";
import { audioCtx, audioReady, beep, configureVoice, countWord, music, releaseAudio, speak, stopSpeech, unlockAudio } from "../lib/audio";
import { fmtClock, kcalFor } from "../lib/duration";
import { exName, plural, useLang, useT } from "../lib/i18n";
import { findWorkout, streak, useStore } from "../lib/store";
import { uid } from "../lib/date";
import type { Exercise, Step } from "../lib/types";
import { useWorkoutMusic } from "./WorkoutDetail";
import { accOf } from "./Workouts";

type Item =
  | { type: "prep"; dur: number; ex: Exercise }
  | { type: "work"; step: Step; ex: Exercise; idx: number; of: number }
  | { type: "rest"; dur: number; next?: Exercise };

const REST_MET = 2;
/** Пауза перед первым повтором: успеть произнести название. */
const LEAD = 1.2;
const RING = 276.5;

function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const req = async () => {
      try { lock = await navigator.wakeLock.request("screen"); } catch { /* не поддерживается */ }
    };
    void req();
    const onVis = () => document.visibilityState === "visible" && void req();
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); void lock?.release(); };
  }, [active]);
}

export function PlayerScreen() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const t = useT();
  const lang = useLang();
  const user = useStore((s) => s.userWorkouts);
  const settings = useStore((s) => s.settings);
  const sessions = useStore((s) => s.sessions);
  const addSession = useStore((s) => s.addSession);
  const w = findWorkout(id, user);
  const musicId = useWorkoutMusic(id, w?.defaultMusicId ?? NO_MUSIC);

  const seq: Item[] = useMemo(() => {
    if (!w) return [];
    const works = w.steps.filter((s) => s.kind === "exercise");
    const out: Item[] = [];
    const first = EXERCISE_BY_ID[works[0]?.exerciseId ?? ""];
    if (first) out.push({ type: "prep", dur: Math.max(3, settings.prep), ex: first });
    let k = 0;
    w.steps.forEach((s, i) => {
      if (s.kind === "rest") {
        const n = w.steps.slice(i + 1).find((x) => x.kind === "exercise");
        out.push({ type: "rest", dur: s.value, next: n ? EXERCISE_BY_ID[n.exerciseId!] : undefined });
      } else {
        out.push({ type: "work", step: s, ex: EXERCISE_BY_ID[s.exerciseId!], idx: k++, of: works.length });
      }
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w?.id]);

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [extra, setExtra] = useState(0);
  const [, setTick] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);

  const stepStart = useRef(performance.now());
  const pausedAt = useRef<number | null>(null);
  const lastSec = useRef(-1);
  const rep = useRef(0);
  const half = useRef(false);
  const mute = useRef(0);
  const spent = useRef<number[]>([]);
  const completed = useRef<Set<number>>(new Set());
  const startedAt = useRef(Date.now());
  const saved = useRef(false);

  useWakeLock(!done);

  useEffect(() => {
    configureVoice({
      volume: settings.voiceVolume, enabled: settings.voiceHints, beeps: settings.beeps, lang,
      uri: settings.voiceURI, rate: settings.rate, pitch: settings.pitch,
    });
  }, [settings.voiceVolume, settings.voiceHints, settings.beeps, lang, settings.voiceURI, settings.rate, settings.pitch]);

  const el = () => ((pausedAt.current ?? performance.now()) - stepStart.current) / 1000;
  const cur = seq[i];
  const tempo = (ex: Exercise) => ex.secondsPerRep * (settings.tempo || 1);
  /** Шаг на повторы ведётся счётом: длительность = повторы × темп. */
  const pacedReps = (it: Item | undefined) => it?.type === "work" && it.step.mode === "reps" && settings.count && !it.ex.isStatic;
  const durOf = (it: Item | undefined): number => {
    if (!it) return 0;
    if (it.type === "prep") return it.dur;
    if (it.type === "rest") return it.dur + extra;
    if (it.step.mode === "time") return it.step.value;
    return pacedReps(it) ? LEAD + it.step.value * tempo(it.ex) : 0;
  };
  const counting = (it: Item | undefined) => it?.type === "work" && settings.count && !it.ex.isStatic;

  const announce = useCallback((it: Item) => {
    mute.current = performance.now() + 1500;
    if (it.type === "prep") speak(lang === "ru" ? `Приготовьтесь. ${it.ex.nameEn}` : `Get ready. ${it.ex.nameEn}`);
    else if (it.type === "rest") speak(lang === "ru" ? `Отдых.${it.next ? ` Далее — ${it.next.nameEn}` : ""}` : `Rest.${it.next ? ` Next: ${it.next.nameEn}` : ""}`);
    else {
      beep(1180, 0.3, 0.3);
      const val = it.step.mode === "reps" ? (lang === "ru" ? `, ${it.step.value} повторов` : `, ${it.step.value} reps`) : "";
      speak((it.idx === 0 ? (lang === "ru" ? "Начали! " : "Go! ") : "") + exName(lang, it.ex) + val);
    }
  }, [lang]);

  const finish = useCallback(() => {
    setDone(true);
    music.stop();
    beep(880, 0.15);
    setTimeout(() => beep(1175, 0.15), 180);
    setTimeout(() => beep(1568, 0.35), 360);
    speak(lang === "ru" ? "Поздравляем! Тренировка завершена." : "Congratulations! Workout complete.");
  }, [lang]);

  const enter = useCallback((j: number, countCurrent: boolean) => {
    if (seq[i]) {
      spent.current[i] = (spent.current[i] ?? 0) + el();
      if (countCurrent && seq[i].type === "work") completed.current.add(i);
    }
    setExtra(0);
    if (j >= seq.length) return finish();
    const k = Math.max(0, j);
    setI(k);
    setPaused(false);
    stepStart.current = performance.now();
    pausedAt.current = null;
    lastSec.current = -1;
    rep.current = 0;
    half.current = false;
    announce(seq[k]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, seq, finish, announce]);

  /** Переход по кнопкам: шаги отдыха пропускаются. */
  const skip = useCallback((d: number) => {
    let j = i + d;
    while (j > 0 && j < seq.length && seq[j].type === "rest") j += d;
    enter(Math.max(0, j), d > 0);
  }, [i, seq, enter]);

  // Старт.
  useEffect(() => {
    if (!w || !seq.length) return;
    audioCtx();
    stepStart.current = performance.now();
    announce(seq[0]);
    if (musicId !== NO_MUSIC) music.start(musicId, settings.musicVolume);
    // Плеер открыт без нажатия (перезагрузка, прямая ссылка): iOS не даст включить звук — просим тап.
    const chk = setTimeout(() => { if (!audioReady()) setNeedsTap(true); }, 500);
    return () => { clearTimeout(chk); music.stop(); stopSpeech(); releaseAudio(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => music.setVolume(settings.musicVolume), [settings.musicVolume]);

  // Тик: время считается от performance.now, без накопления ошибки.
  useEffect(() => {
    if (done || paused || !cur) return;
    const h = setInterval(() => {
      const now = performance.now();
      const e = el();
      const dur = durOf(cur);
      const left = dur - e;
      const sec = Math.ceil(left);

      if (dur > 0 && sec !== lastSec.current) {
        lastSec.current = sec;
        if (sec <= 3 && sec >= 1 && !(pacedReps(cur))) beep(sec === 1 ? 990 : 740, 0.12);
      }

      if (cur.type === "work") {
        // Половина времени: смена стороны или подсказка.
        if (cur.step.mode === "time" && !half.current && dur >= 20 && left <= dur / 2) {
          half.current = true;
          mute.current = now + 1600;
          if (cur.ex.bilateral) { speak(lang === "ru" ? "Смените сторону" : "Switch sides"); beep(600, 0.2); }
          else speak(lang === "ru" ? "Половина" : "Halfway");
        }
        // Счёт повторов вслух.
        if (counting(cur)) {
          const T = tempo(cur.ex);
          const r = Math.floor((e - LEAD) / T + 0.5);
          const max = cur.step.mode === "reps" ? cur.step.value : Infinity;
          if (r > rep.current && r <= max) {
            rep.current = r;
            if (now > mute.current && (cur.step.mode === "reps" || left > 1.5)) speak(countWord(r, lang), { rate: 1.15 });
          }
        }
      }

      if (dur > 0 && left <= 0) return enter(i + 1, true);
      setTick((x) => x + 1);
    }, 100);
    return () => clearInterval(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, paused, cur, i, extra, enter, lang, settings.count, settings.tempo]);

  const togglePause = useCallback(() => {
    if (done) return;
    if (paused) {
      if (pausedAt.current != null) stepStart.current += performance.now() - pausedAt.current;
      pausedAt.current = null;
      setPaused(false);
      music.resume();
    } else {
      pausedAt.current = performance.now();
      setPaused(true);
      music.pause();
      stopSpeech();
    }
  }, [paused, done]);

  // Media Session и клавиатура.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !w || !cur) return;
    const name = cur.type === "rest" ? t("rest") : exName(lang, cur.ex);
    navigator.mediaSession.metadata = new MediaMetadata({ title: name, artist: w.name, album: t("appName") });
    navigator.mediaSession.setActionHandler("play", togglePause);
    navigator.mediaSession.setActionHandler("pause", togglePause);
    navigator.mediaSession.setActionHandler("nexttrack", () => skip(1));
    navigator.mediaSession.setActionHandler("previoustrack", () => skip(-1));
  }, [w, cur, lang, t, togglePause, skip]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || confirmExit) return;
      if (e.code === "Space") { e.preventDefault(); togglePause(); }
      if (e.code === "ArrowRight") skip(1);
      if (e.code === "ArrowLeft") skip(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, confirmExit, togglePause, skip]);

  const totals = () => {
    let active = 0;
    let kcal = 0;
    seq.forEach((it, k) => {
      const s = spent.current[k] ?? 0;
      active += s;
      const met = it.type === "work" ? it.ex.met : REST_MET;
      kcal += kcalFor(met, settings.weightKg, s);
    });
    return { active, kcal, exDone: completed.current.size };
  };

  useEffect(() => {
    if (!done || saved.current || !w) return;
    const { active, kcal, exDone } = totals();
    if (!exDone) return;
    saved.current = true;
    addSession({
      id: uid(), workoutId: w.id, workoutName: w.name, startedAt: startedAt.current, finishedAt: Date.now(),
      activeSeconds: Math.round(active), completedSteps: exDone, totalSteps: seq.filter((x) => x.type === "work").length, kcal: Math.round(kcal),
    });
  });

  if (!w || !cur) return <div className="player"><p className="stage">{t("notFound")}</p></div>;
  const acc = accOf(w);

  if (done) {
    const { active, kcal, exDone } = totals();
    const series = w.source === "builtin" ? BUILTIN_WORKOUTS.filter((x) => x.difficulty === w.difficulty) : [];
    const nextW = series[series.findIndex((x) => x.id === w.id) + 1];
    const st = streak(sessions);
    return (
      <div className="player" style={{ ["--acc" as string]: acc }}>
        <div className="stage">
          <div className="finish">
            <div className="trophy">🏆</div>
            <h2>{t("doneTitle")}</h2>
            <p className="muted">{w.name} · {fmtClock(active)}</p>
            <div className="stats">
              <div className="stat"><b>{exDone}</b><span>{t("exercisesL")}</span></div>
              <div className="stat"><b>{Math.round(kcal)}</b><span>{t("kcal")}</span></div>
              <div className="stat"><b>{st}</b><span>{plural(lang, st, { ru: ["день", "дня", "дней"], en: ["day", "days"] }).replace(/^\d+ /, "")} {t("inRow")}</span></div>
            </div>
            <p className="muted small">{t("totalWorkouts")}: {sessions.length}</p>
          </div>
          <div className="finish-actions">
            <button className="btn" onClick={() => nav(`/workout/${w.id}`, { replace: true })}>{t("great")}</button>
            {nextW && <button className="btn ghost" onClick={() => nav(`/workout/${nextW.id}`, { replace: true })}>{t("nextWorkout")}: {nextW.name}</button>}
            <button className="btn ghost" onClick={() => { unlockAudio(); nav(`/workout/${w.id}`, { replace: true }); setTimeout(() => nav(`/play/${w.id}`), 0); }}>{t("repeat")}</button>
          </div>
        </div>
      </div>
    );
  }

  const e = el();
  const dur = durOf(cur);
  const left = Math.max(0, dur - e);
  const works = seq.filter((x) => x.type === "work").length;
  const curWork = cur.type === "work" ? cur.idx : seq.slice(0, i).filter((x) => x.type === "work").length;
  const label = cur.type === "prep" ? t("getReady") : cur.type === "rest" ? t("restNext") : t("exerciseOf", { k: cur.idx + 1, n: cur.of });
  const shownEx = cur.type === "work" ? cur.ex : cur.type === "prep" ? cur.ex : cur.next;
  const isRepsManual = cur.type === "work" && cur.step.mode === "reps" && !pacedReps(cur);
  const isPaced = pacedReps(cur);
  const figClock = cur.type === "work" && !paused ? () => el() - LEAD : () => null;
  const ringColor = cur.type === "rest" ? "var(--mine)" : "var(--acc)";

  let ringFrac = dur ? left / dur : 1;
  let center: React.ReactNode = Math.ceil(left);
  if (isPaced && cur.type === "work") {
    ringFrac = 1 - rep.current / cur.step.value;
    center = <>{rep.current}<small>/{cur.step.value}</small></>;
  } else if (isRepsManual && cur.type === "work") {
    ringFrac = 1;
    center = <>×{cur.step.value}</>;
  }

  return (
    <div className="player" style={{ ["--acc" as string]: acc }}>
      {needsTap && (
        <button className="sound-tap" onClick={() => {
          unlockAudio();
          setNeedsTap(false);
          announce(cur);
          if (musicId !== NO_MUSIC) music.start(musicId, settings.musicVolume);
        }}>🔊 {t("tapForSound")}</button>
      )}
      <div className="phead">
        <button className="back" onClick={() => { if (!paused) togglePause(); setConfirmExit(true); }} aria-label={t("exit")}><IconClose size={20} /></button>
        <div className="prog">
          {Array.from({ length: works }, (_, k) => (
            <i key={k} className={k < curWork ? "d" : k === curWork && cur.type === "work" ? "c" : ""} />
          ))}
        </div>
        <span className="muted small mono">{fmtClock((Date.now() - startedAt.current) / 1000)}</span>
      </div>

      <div className="stage">
        <div className={`phase ${cur.type === "rest" ? "rest" : ""}`}>{label}</div>
        <div className="exname">{shownEx ? exName(lang, shownEx) : ""}</div>
        {cur.type === "work" && cur.ex.bilateral && cur.step.mode === "time" && (
          <div className="side">{half.current ? t("side2") : t("side1")}</div>
        )}
        <div className="figbox">{shownEx && <Fig key={shownEx.id + i} fig={shownEx.fig} period={tempo(shownEx)} clock={figClock} />}</div>
        <div className="ringwrap">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--line)" strokeWidth="7" />
            <circle cx="50" cy="50" r="44" fill="none" stroke={ringColor} strokeWidth="7" strokeLinecap="round"
              strokeDasharray={RING} strokeDashoffset={(RING * (1 - ringFrac)).toFixed(1)} />
          </svg>
          <div className="tm">{center}</div>
        </div>
        {cur.type === "work" && counting(cur) && cur.step.mode === "time" && (
          <div className="muted small">{t("repWord")} <b className="text">{rep.current}</b></div>
        )}
        <div className="hint">{paused ? t("pause") : cur.type === "work" ? cur.ex.instructions[cur.ex.instructions.length - 1] : ""}</div>
      </div>

      {cur.type === "rest" && (
        <div className="rest-actions">
          <button className="btn ghost" onClick={() => setExtra((x) => x + 10)}>{t("plus10")}</button>
          <button className="btn ghost" onClick={() => enter(i + 1, true)}>{t("skip")}</button>
        </div>
      )}
      {cur.type === "work" && cur.step.mode === "reps" && (
        <div className="rest-actions one">
          <button className={`btn ${isPaced ? "ghost" : ""}`} onClick={() => enter(i + 1, true)}>{t("done")}</button>
        </div>
      )}

      <div className="controls">
        <button onClick={() => skip(-1)} aria-label={t("back")}><IconPrev size={26} /></button>
        <button className="main" onClick={() => { unlockAudio(); togglePause(); }} aria-label={paused ? t("resume") : t("pause")}>
          {paused ? <IconPlay size={30} /> : <IconPause size={30} />}
        </button>
        <button onClick={() => skip(1)} aria-label={t("next")}><IconNext size={26} /></button>
      </div>

      {confirmExit && (
        <div className="modal center">
          <div className="dialog" role="alertdialog" aria-modal="true">
            <h3>{t("exitQ")}</h3>
            <p className="muted">{t("exitText")}</p>
            <div className="dialog-actions column">
              <button className="btn" onClick={() => { setConfirmExit(false); togglePause(); }} autoFocus>{t("stay")}</button>
              {completed.current.size > 0 && (
                <button className="btn ghost" onClick={() => { setConfirmExit(false); spent.current[i] = (spent.current[i] ?? 0) + el(); finish(); }}>{t("finishEarly")}</button>
              )}
              <button className="btn danger" onClick={() => { music.stop(); stopSpeech(); nav(-1); }}>{t("exit")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
