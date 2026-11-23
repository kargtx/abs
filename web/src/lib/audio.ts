import { MUSIC_BY_ID, type MusicStyle } from "../data/music";

let ctx: AudioContext | null = null;

export function audioCtx(): AudioContext {
  if (!ctx && typeof window !== "undefined") {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
  return ctx!;
}

export function audioReady(): boolean {
  return !!ctx && ctx.state === "running";
}

/**
 * Валидный MP3 тишины (44.1 кГц стерео).
 * Непрерывное фоновое воспроизведение через <audio> переводит сессию iOS в режим Media Playback,
 * благодаря чему Web Audio и речь звучат даже при включенном аппаратном переключателе бесшумного режима (Mute switch).
 */
const SILENT_MP3 =
  "data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////////////////////////////////////8AAABhTEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAAAnGMHkkIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADgnABGiAAQBCqgCRMAAgEAH///////////////7+n/9FTuQsQH//////2NG0jWUGlio5gLQTOtIoeR2WX////X4s9Atb/JRVCbBUpeRUq//////////////////9RUi0f2jn/+xDECgPCjAEQAABN4AAANIAAAAQVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";

let keepAlive: HTMLAudioElement | null = null;

/**
 * Разблокировка звука. Вызывать прямо в синхронном обработчике нажатия пользователя (touch/click).
 * iOS Safari:
 * 1. AudioSession переводится в "playback" (Safari 17+).
 * 2. Запускается HTML5 <audio> с тишиной (обходит аппаратный Silent Switch для Web Audio).
 * 3. AudioContext создается и выводится из suspended внутри пользовательского жеста.
 * 4. Сбрасывается зависшая очередь SpeechSynthesis и безопасно разблокируется TTS.
 */
export function unlockAudio() {
  if (typeof window === "undefined") return;

  // 1. Safari 17+ / iOS 17+: аудиосессия воспроизведения
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = "playback";
  } catch { /* не поддерживается */ }

  // 2. Фоновый HTML5 audio для перевода iOS в media playback (обход Silent Switch)
  try {
    if (!keepAlive) {
      keepAlive = new Audio(SILENT_MP3);
      keepAlive.loop = true;
      keepAlive.preload = "auto";
      keepAlive.setAttribute("playsinline", "");
      keepAlive.setAttribute("webkit-playsinline", "");
    }
    void keepAlive.play().catch(() => {});
  } catch { /* нет <audio> */ }

  // 3. Web Audio: резюм контекста в жесте пользователя
  try {
    const c = audioCtx();
    if (c) {
      if (c.state === "suspended") void c.resume().catch(() => {});
      const b = c.createBuffer(1, 1, 22050);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
    }
  } catch { /* нет Web Audio */ }

  // 4. Синтез речи: сброс зависшей очереди и прогрев
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      // На iOS WebKit пустая строка или пробел с volume=0 может зависнуть в pending навсегда.
      // Знак "." с volume=0.01 отрабатывает нормальный жизненный цикл без звука и разблокирует TTS.
      const u = new SpeechSynthesisUtterance(".");
      u.volume = 0.01;
      retainUtterance(u);
      window.speechSynthesis.speak(u);
    }
  } catch { /* нет синтеза речи */ }
}

/** Приостановить фоновый аудиотрек (после тренировки). */
export function releaseAudio() {
  if (keepAlive) {
    try {
      keepAlive.pause();
      keepAlive.currentTime = 0;
    } catch {}
  }
}

// Автоматический возврат AudioContext при касаниях и возврате на вкладку на iOS
if (typeof window !== "undefined") {
  const resumeOnInteraction = () => {
    if (ctx && ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
  };
  window.addEventListener("touchstart", resumeOnInteraction, { passive: true });
  window.addEventListener("touchend", resumeOnInteraction, { passive: true });
  window.addEventListener("click", resumeOnInteraction, { passive: true });

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        if (ctx && ctx.state === "suspended") {
          void ctx.resume().catch(() => {});
        }
        if (keepAlive && keepAlive.paused && ctx && ctx.state === "running") {
          void keepAlive.play().catch(() => {});
        }
      }
    });
  }
}

const midiHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

let noiseBuf: AudioBuffer | null = null;
function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function degreeNote(style: MusicStyle, deg: number): number {
  const s = style.scale;
  return style.root + s[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7);
}

/** Генеративный музыкальный движок: барабаны, бас, аккорды и арпеджио по стилю подборки. */
class MusicEngine {
  private timer: number | null = null;
  private master: GainNode | null = null;
  private style: MusicStyle | null = null;
  private bpm = 100;
  private step = 0;
  private nextTime = 0;
  private volume = 0.5;
  private ducked = false;
  currentId: string | null = null;

  start(id: string, volume: number) {
    const def = MUSIC_BY_ID[id];
    if (!def) return this.stop();
    if (this.currentId === id && this.timer) return this.setVolume(volume);
    this.stop();
    const c = audioCtx();
    this.style = def.style;
    this.bpm = def.bpm;
    this.volume = volume;
    this.master = c.createGain();
    this.master.gain.setValueAtTime(0, c.currentTime);
    this.master.connect(c.destination);
    this.master.gain.linearRampToValueAtTime(this.targetGain(), c.currentTime + 0.6);
    this.step = 0;
    this.nextTime = c.currentTime + 0.08;
    this.currentId = id;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const m = this.master;
    if (m && ctx) {
      m.gain.cancelScheduledValues(ctx.currentTime);
      m.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      setTimeout(() => m.disconnect(), 500);
    }
    this.master = null;
    this.currentId = null;
  }

  pause() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.master && ctx) this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  }

  resume() {
    if (!this.master || this.timer || !ctx) return;
    this.nextTime = ctx.currentTime + 0.05;
    this.master.gain.setTargetAtTime(this.targetGain(), ctx.currentTime, 0.1);
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master && ctx) this.master.gain.setTargetAtTime(this.targetGain(), ctx.currentTime, 0.05);
  }

  /** Приглушение музыки на время голосовых подсказок. */
  duck(on: boolean) {
    this.ducked = on;
    if (this.master && ctx && this.timer) this.master.gain.setTargetAtTime(this.targetGain(), ctx.currentTime, 0.12);
  }

  private targetGain() {
    return this.volume * 0.35 * (this.ducked ? 0.3 : 1);
  }

  private schedule() {
    const c = ctx!;
    const sixteenth = 60 / this.bpm / 4;
    while (this.nextTime < c.currentTime + 0.12) {
      const swing = this.step % 2 === 1 ? (this.style!.swing * sixteenth) : 0;
      this.playStep(this.step, this.nextTime + swing);
      this.nextTime += sixteenth;
      this.step++;
    }
  }

  private playStep(step: number, t: number) {
    const st = this.style!;
    const c = ctx!;
    const out = this.master!;
    const i = step % 16;
    const bar = Math.floor(step / 16);
    const chordDeg = st.chords[bar % st.chords.length];
    const sixteenth = 60 / this.bpm / 4;

    if (st.kick[i] === "x") {
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.32);
    }
    const hit = (dur: number, freq: number, level: number) => {
      const src = c.createBufferSource();
      src.buffer = noise(c);
      const f = c.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(level, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f).connect(g).connect(out);
      src.start(t);
      src.stop(t + dur + 0.02);
    };
    if (st.snare[i] === "x") hit(0.18, 1500, 0.45);
    if (st.hat[i] === "x") hit(0.05, 7000, i % 4 === 0 ? 0.18 : 0.1);

    if (st.bass[i] === "x") {
      const o = c.createOscillator();
      o.type = st.lead === "sine" ? "triangle" : "sawtooth";
      o.frequency.value = midiHz(degreeNote(st, chordDeg) - 12);
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 420;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + sixteenth * 1.8);
      o.connect(f).connect(g).connect(out);
      o.start(t);
      o.stop(t + sixteenth * 2);
    }

    // Пэд: аккорд на весь такт.
    if (i === 0) {
      const barDur = sixteenth * 16;
      [0, 2, 4].forEach((k) => {
        const o = c.createOscillator();
        o.type = "triangle";
        o.frequency.value = midiHz(degreeNote(st, chordDeg + k));
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.3);
        g.gain.linearRampToValueAtTime(0.0001, t + barDur);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + barDur + 0.05);
      });
    }

    // Арпеджио по восьмым.
    if (i % 2 === 0) {
      const pattern = [0, 2, 4, 7, 4, 2, 0, 4];
      const o = c.createOscillator();
      o.type = st.lead === "saw" ? "sawtooth" : st.lead;
      o.frequency.value = midiHz(degreeNote(st, chordDeg + pattern[(i / 2) % 8]) + 12);
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 2400;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0005, t + sixteenth * 1.6);
      o.connect(f).connect(g).connect(out);
      o.start(t);
      o.stop(t + sixteenth * 2);
    }
  }
}

export const music = new MusicEngine();

let voiceVolume = 1;
let voiceEnabled = true;
let beepsEnabled = true;
let voiceLang = "ru-RU";
let voiceURI = "";
let voiceRate = 1.05;
let voicePitch = 1;

export function configureVoice(opts: { volume: number; enabled: boolean; beeps: boolean; lang: "ru" | "en"; uri?: string; rate?: number; pitch?: number }) {
  voiceVolume = opts.volume;
  voiceEnabled = opts.enabled;
  beepsEnabled = opts.beeps;
  voiceLang = opts.lang === "ru" ? "ru-RU" : "en-US";
  voiceURI = opts.uri ?? "";
  voiceRate = opts.rate ?? 1.05;
  voicePitch = opts.pitch ?? 1;
}

export function beep(freq = 880, dur = 0.12, level = 0.4) {
  if (!beepsEnabled) return;
  try {
    const c = audioCtx();
    if (!c) return;
    if (c.state === "suspended") void c.resume().catch(() => {});
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level * Math.max(0.05, voiceVolume), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    /* контекст недоступен или закрыт */
  }
}

let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  try {
    const v = window.speechSynthesis.getVoices();
    if (v && v.length > 0) cachedVoices = v;
  } catch { /* нет getVoices */ }
  return cachedVoices;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  refreshVoices();
  try {
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  } catch { /* */ }
}

export function listVoices(): SpeechSynthesisVoice[] {
  return refreshVoices();
}

/** Выбранный голос, иначе лучший голос языка интерфейса. */
export function currentVoice(uri = voiceURI, lang = voiceLang): SpeechSynthesisVoice | undefined {
  const all = listVoices();
  const pre = lang.slice(0, 2).toLowerCase();
  return (
    all.find((v) => v.voiceURI === uri) ??
    all.find((v) => v.lang.toLowerCase().startsWith(pre) && /google/i.test(v.name)) ??
    all.find((v) => v.lang.toLowerCase().startsWith(pre) && /milena|yuri|katya|siri/i.test(v.name)) ??
    all.find((v) => v.lang.toLowerCase().startsWith(pre))
  );
}

// Защита от сборщика мусора iOS Safari (WebKit GC bug):
// На iOS если не держать ссылку на utterance глобально, сборщик мусора JSC
// уничтожает объект прямо посреди фразы, обрывая звук.
const activeUtterances = new Set<SpeechSynthesisUtterance>();

function retainUtterance(u: SpeechSynthesisUtterance) {
  activeUtterances.add(u);
  if (typeof window !== "undefined") {
    (window as unknown as { __activeUtterance?: SpeechSynthesisUtterance }).__activeUtterance = u;
  }

  let timer: number | null = null;
  const cleanup = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    activeUtterances.delete(u);
    if (typeof window !== "undefined" && (window as unknown as { __activeUtterance?: SpeechSynthesisUtterance }).__activeUtterance === u) {
      delete (window as unknown as { __activeUtterance?: SpeechSynthesisUtterance }).__activeUtterance;
    }
  };

  // Предохранитель от зависших utterances (макс 15 сек на фразу)
  timer = window.setTimeout(cleanup, 15000);

  const prevEnd = u.onend;
  const prevErr = u.onerror;
  u.onend = (e) => {
    cleanup();
    prevEnd?.call(u, e);
  };
  u.onerror = (e) => {
    cleanup();
    prevErr?.call(u, e);
  };
}

let speechTimer: number | null = null;

/** Произнести фразу. queue — не прерывать текущую речь; rate — множитель скорости; noDuck — не приглушать музыку (для ритмичного счёта). */
export function speak(text: string, opts: { queue?: boolean; rate?: number; force?: boolean; noDuck?: boolean } = {}) {
  const clean = text?.trim();
  if (!clean || (!voiceEnabled && !opts.force) || typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const u = new SpeechSynthesisUtterance(clean);
  const v = currentVoice();
  u.lang = v?.lang ?? voiceLang;
  if (v) u.voice = v;
  u.volume = Math.max(0.1, voiceVolume);
  u.rate = voiceRate * (opts.rate ?? 1);
  u.pitch = voicePitch;

  if (!opts.noDuck) {
    u.onstart = () => music.duck(true);
    u.onend = () => music.duck(false);
    u.onerror = () => music.duck(false);
  }

  retainUtterance(u);

  if (speechTimer) {
    clearTimeout(speechTimer);
    speechTimer = null;
  }

  const doSpeak = () => {
    try {
      window.speechSynthesis.speak(u);
    } catch {
      music.duck(false);
    }
  };

  if (!opts.queue && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
    // Safari / WebKit bug: вызов speak() на том же тике сразу после cancel() сбрасывает новую фразу.
    // Короткий таймаут 30мс дает движку Safari освободить аудиоочередь.
    speechTimer = window.setTimeout(doSpeak, 30);
  } else {
    doSpeak();
  }
}

export function stopSpeech() {
  if (speechTimer) {
    clearTimeout(speechTimer);
    speechTimer = null;
  }
  activeUtterances.clear();
  if (typeof window !== "undefined") {
    delete (window as unknown as { __activeUtterance?: SpeechSynthesisUtterance }).__activeUtterance;
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }
  music.duck(false);
}

const NUM_RU = ["", "Раз", "Два", "Три", "Четыре", "Пять", "Шесть", "Семь", "Восемь", "Девять", "Десять", "Одиннадцать", "Двенадцать",
  "Тринадцать", "Четырнадцать", "Пятнадцать", "Шестнадцать", "Семнадцать", "Восемнадцать", "Девятнадцать", "Двадцать"];

const NUM_RU_TENS: Record<number, string> = {
  10: "Десять",
  20: "Двадцать",
  30: "Тридцать",
  40: "Сорок",
  50: "Пятьдесят",
  60: "Шестьдесят",
  70: "Семьдесят",
  80: "Восемьдесят",
  90: "Девяносто",
  100: "Сто",
};

/** Слово для круглой отметки повторов (10, 20, 30...). */
export function countMilestoneWord(n: number, lang: "ru" | "en"): string {
  if (lang === "en") return String(n);
  return NUM_RU_TENS[n] ?? (NUM_RU[n] ?? String(n));
}

/** Слово для счёта повторов. */
export function countWord(n: number, lang: "ru" | "en"): string {
  if (lang === "en") return String(n);
  return NUM_RU[n] ?? String(n);
}
