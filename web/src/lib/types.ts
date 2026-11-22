export type Difficulty = "beginner" | "intermediate" | "advanced";
export type ExerciseType = "resistance" | "cardio" | "stretch" | "isometric";
export type Equipment = "none" | "dumbbell" | "mat";
export type Muscle =
  | "abs"
  | "lowerAbs"
  | "obliques"
  | "lowerBack"
  | "hipFlexors"
  | "chest"
  | "triceps"
  | "shoulders"
  | "glutes"
  | "legs";


export interface Exercise {
  id: string;
  number: number;
  name: string;
  nameEn: string;
  difficulty: Difficulty;
  type: ExerciseType;
  equipment: Equipment[];
  muscles: Muscle[];
  description: string;
  instructions: string[];
  commonMistakes: string[];
  secondsPerRep: number;
  /** «На каждую сторону»: на половине времени — смена стороны. */
  bilateral: boolean;
  /** Статика: без счёта повторов. */
  isStatic: boolean;
  /** Ключ анимации фигурки (data/figures.ts). */
  fig: string;
  /** MET для оценки калорий. */
  met: number;
}

export type StepMode = "reps" | "time";

export interface Step {
  kind: "exercise" | "rest";
  exerciseId?: string;
  mode: StepMode;
  /** Повторы или секунды. */
  value: number;
  /** Темп повторений, секунд на повтор (если задан для шага). */
  pace?: number;
}

export interface Workout {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  steps: Step[];
  defaultMusicId: string;
  source: "builtin" | "user";
  /** Цвет обложки (оттенок HSL). */
  hue: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface MusicPack {
  id: string;
  name: string;
  genre: string;
  bpm: number;
}

export interface PlanDay {
  weekIndex: number; // 0..weeks-1
  weekday: number; // 1 = пн .. 7 = вс
  workoutId: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  weeks: number;
  hue: number;
  benefits: { title: string; text: string }[];
  days: PlanDay[];
}

export interface UserPlan {
  planId: string;
  startDate: string; // YYYY-MM-DD (понедельник)
  status: "active" | "done" | "abandoned";
}

export interface Session {
  id: string;
  workoutId: string;
  workoutName: string;
  startedAt: number;
  finishedAt: number;
  activeSeconds: number;
  completedSteps: number;
  totalSteps: number;
  kcal: number;
}

export interface Settings {
  language: "ru" | "en";
  musicVolume: number; // 0..1
  voiceVolume: number; // 0..1
  voiceHints: boolean;
  beeps: boolean;
  weightKg: number;
  defaultRest: number;
  favoriteMusic: string[];
  workoutMusic: Record<string, string>;
  /** Считать повторы вслух. */
  count: boolean;
  /** Стиль счёта: каденс «Раз-два» (P4P) или порядковые номера (1, 2, 3...). */
  countStyle?: "cadence" | "ordinal";
  /** Множитель темпа счёта (1 — норма, <1 — быстрее). */
  tempo: number;
  /** Подготовка перед стартом, с. */
  prep: number;
  rate: number;
  pitch: number;
  voiceURI: string;
}
