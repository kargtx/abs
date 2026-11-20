import { MUSIC_BY_ID, type MusicStyle } from "../data/music";

let ctx: AudioContext | null = null;

export function audioCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function audioReady(): boolean {
  return !!ctx && ctx.state === "running";
}

/** Короткий беззвучный WAV: проигрывание через <audio> переводит iOS в режим «воспроизведение». */
function silentWavUrl(): string {
  const n = 4000; // 0,5 с при 8 кГц
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + n, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, "data"); v.setUint32(40, n, true);
  new Uint8Array(buf, 44).fill(128);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

let keepAlive: HTMLAudioElement | null = null;

/**
 * Разблокировка звука. Вызывать прямо в обработчике нажатия.
 * iOS Safari: AudioContext и синтез речи включаются только из жеста пользователя,
 * а Web Audio глушится переключателем «Без звука», если не перевести сессию в режим воспроизведения.
 */
export function unlockAudio() {
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = "playback"; // Safari 17+
  } catch { /* не поддерживается */ }
  try {
    if (!keepAlive) {
      keepAlive = new Audio(silentWavUrl());
      keepAlive.loop = true;
      keepAlive.setAttribute("playsinline", "");
    }
    void keepAlive.play().catch(() => {});
  } catch { /* нет <audio> */ }
  try {
    const c = audioCtx();
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(c.destination);
    s.start(0);
  } catch { /* нет Web Audio */ }
  try {
    if ("speechSynthesis" in window && !speechSynthesis.speaking) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      speechSynthesis.speak(u);
    }
  } catch { /* нет синтеза речи */ }
}

/** Остановить фоновый беззвучный трек (после тренировки). */
export function releaseAudio() {
  keepAlive?.pause();
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
    this.master.gain.value = 0;
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
  const c = audioCtx();
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
}

export function listVoices(): SpeechSynthesisVoice[] {
  try {
    return speechSynthesis.getVoices() ?? [];
  } catch {
    return [];
  }
}

/** Выбранный голос, иначе лучший голос языка интерфейса. */
export function currentVoice(uri = voiceURI, lang = voiceLang): SpeechSynthesisVoice | undefined {
  const all = listVoices();
  const pre = lang.slice(0, 2).toLowerCase();
  return (
    all.find((v) => v.voiceURI === uri) ??
    all.find((v) => v.lang.toLowerCase().startsWith(pre) && /google/i.test(v.name)) ??
    all.find((v) => v.lang.toLowerCase().startsWith(pre))
  );
}

/** Произнести фразу. queue — не прерывать текущую речь; rate — множитель скорости. */
export function speak(text: string, opts: { queue?: boolean; rate?: number; force?: boolean } = {}) {
  if ((!voiceEnabled && !opts.force) || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  const v = currentVoice();
  u.lang = v?.lang ?? voiceLang;
  if (v) u.voice = v;
  u.volume = voiceVolume;
  u.rate = voiceRate * (opts.rate ?? 1);
  u.pitch = voicePitch;
  u.onstart = () => music.duck(true);
  u.onend = () => music.duck(false);
  u.onerror = () => music.duck(false);
  // Safari иногда теряет фразу, если cancel() вызван без активной речи.
  if (!opts.queue && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

export function stopSpeech() {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  music.duck(false);
}

const NUM_RU = ["", "Раз", "Два", "Три", "Четыре", "Пять", "Шесть", "Семь", "Восемь", "Девять", "Десять", "Одиннадцать", "Двенадцать",
  "Тринадцать", "Четырнадцать", "Пятнадцать", "Шестнадцать", "Семнадцать", "Восемнадцать", "Девятнадцать", "Двадцать"];

/** Слово для счёта повторов. */
export function countWord(n: number, lang: "ru" | "en"): string {
  if (lang === "en") return String(n);
  return NUM_RU[n] ?? String(n);
}
