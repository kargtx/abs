import type { MusicPack } from "../lib/types";

/**
 * Музыка синтезируется в браузере (Web Audio), поэтому не требует лицензий и загрузки.
 * Параметры описывают стиль генератора.
 */
export interface MusicStyle {
  root: number; // MIDI-нота тоники
  scale: number[]; // ступени лада в полутонах
  chords: number[]; // ступени аккордов по тактам
  kick: string; // 16 шагов: x — удар
  snare: string;
  hat: string;
  bass: string; // 16 шагов: x — нота баса
  lead: "saw" | "square" | "triangle" | "sine";
  swing: number;
}

export interface MusicDef extends MusicPack {
  style: MusicStyle;
}

const minor = [0, 2, 3, 5, 7, 8, 10];
const major = [0, 2, 4, 5, 7, 9, 11];
const dorian = [0, 2, 3, 5, 7, 9, 10];

export const MUSIC: MusicDef[] = [
  { id: "chill", name: "Тихая волна", genre: "Chill", bpm: 92,
    style: { root: 57, scale: minor, chords: [0, 5, 3, 4], kick: "x.......x.......", snare: "....x.......x...", hat: "..x...x...x...x.", bass: "x.....x...x.....", lead: "sine", swing: 0.1 } },
  { id: "sunrise", name: "Рассвет", genre: "Pop", bpm: 112,
    style: { root: 60, scale: major, chords: [0, 4, 5, 3], kick: "x...x...x...x...", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", bass: "x..x..x.x..x..x.", lead: "triangle", swing: 0 } },
  { id: "groove", name: "Грув", genre: "Funk", bpm: 104,
    style: { root: 52, scale: dorian, chords: [0, 3, 0, 4], kick: "x..x..x...x.....", snare: "....x.......x..x", hat: "xxx.xxx.xxx.xxx.", bass: "x.xx..x.x.x..x..", lead: "square", swing: 0.15 } },
  { id: "lofi", name: "Ночной лоу-фай", genre: "Lo-fi", bpm: 84,
    style: { root: 55, scale: minor, chords: [0, 3, 6, 4], kick: "x......x..x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", bass: "x.......x.......", lead: "sine", swing: 0.22 } },
  { id: "pulse", name: "Пульс", genre: "House", bpm: 124,
    style: { root: 53, scale: minor, chords: [0, 0, 5, 6], kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x.", bass: ".xx..xx..xx..xx.", lead: "saw", swing: 0 } },
  { id: "drive", name: "Драйв", genre: "Electro", bpm: 128,
    style: { root: 50, scale: minor, chords: [0, 6, 5, 4], kick: "x...x...x...x...", snare: "....x.......x...", hat: "xxxxxxxxxxxxxxxx", bass: "x.x.x.x.x.x.x.x.", lead: "saw", swing: 0 } },
  { id: "bass", name: "Тяжёлый бас", genre: "Drum & Bass", bpm: 172,
    style: { root: 45, scale: minor, chords: [0, 5, 6, 4], kick: "x.........x.....", snare: "....x.......x...", hat: "x.xxx.xxx.xxx.xx", bass: "x..x......x..x..", lead: "square", swing: 0 } },
  { id: "latin", name: "Солнечный ритм", genre: "Latin", bpm: 100,
    style: { root: 57, scale: major, chords: [0, 3, 4, 3], kick: "x..x..x.x..x..x.", snare: "...x..x....x..x.", hat: "x.xx.xx.x.xx.xx.", bass: "x..x..x...x..x..", lead: "triangle", swing: 0.08 } },
  { id: "hiphop", name: "Бит с улицы", genre: "Hip Hop", bpm: 90,
    style: { root: 48, scale: minor, chords: [0, 0, 3, 4], kick: "x.....x.x.......", snare: "....x.......x...", hat: "x.x.x.xxx.x.x.x.", bass: "x.....x.x.....x.", lead: "square", swing: 0.18 } },
];

export const MUSIC_BY_ID: Record<string, MusicDef> = Object.fromEntries(MUSIC.map((m) => [m.id, m]));
export const NO_MUSIC = "none";
