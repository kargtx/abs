import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BUILTIN_WORKOUTS } from "../data/workouts";
import { PLANS } from "../data/plans";
import { addDays, fromISO, nearestMonday, toISO, todayISO, uid } from "./date";
import type { Plan, Session, Settings, UserPlan, Workout } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  language: typeof navigator !== "undefined" && navigator.language?.startsWith("en") ? "en" : "ru",
  musicVolume: 0.5,
  voiceVolume: 1,
  voiceHints: true,
  beeps: true,
  weightKg: 70,
  defaultRest: 20,
  favoriteMusic: [],
  workoutMusic: {},
  count: true,
  countStyle: "cadence",
  tempo: 1,
  prep: 10,
  rate: 1.05,
  pitch: 1,
  voiceURI: "",
};

interface State {
  settings: Settings;
  userWorkouts: Workout[];
  sessions: Session[];
  userPlan: UserPlan | null;

  setSettings: (patch: Partial<Settings>) => void;
  toggleFavoriteMusic: (id: string) => void;
  setWorkoutMusic: (workoutId: string, musicId: string) => void;

  saveUserWorkout: (w: Workout) => void;
  deleteUserWorkout: (id: string) => void;
  copyToUser: (w: Workout) => Workout;

  addSession: (s: Session) => void;
  clearHistory: () => void;

  startPlan: (planId: string) => void;
  stopPlan: () => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      userWorkouts: [],
      sessions: [],
      userPlan: null,

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      toggleFavoriteMusic: (id) =>
        set((s) => {
          const fav = s.settings.favoriteMusic;
          return { settings: { ...s.settings, favoriteMusic: fav.includes(id) ? fav.filter((x) => x !== id) : [...fav, id] } };
        }),
      setWorkoutMusic: (workoutId, musicId) =>
        set((s) => ({ settings: { ...s.settings, workoutMusic: { ...s.settings.workoutMusic, [workoutId]: musicId } } })),

      saveUserWorkout: (w) =>
        set((s) => {
          const now = Date.now();
          const next = { ...w, source: "user" as const, updatedAt: now, createdAt: w.createdAt ?? now };
          const exists = s.userWorkouts.some((x) => x.id === w.id);
          return { userWorkouts: exists ? s.userWorkouts.map((x) => (x.id === w.id ? next : x)) : [...s.userWorkouts, next] };
        }),
      deleteUserWorkout: (id) => set((s) => ({ userWorkouts: s.userWorkouts.filter((w) => w.id !== id) })),
      copyToUser: (w) => {
        const copy: Workout = {
          ...w,
          id: "u-" + uid(),
          name: `${w.name} (моя версия)`,
          steps: w.steps.map((st) => ({ ...st })),
          source: "user",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        get().saveUserWorkout(copy);
        return copy;
      },

      addSession: (s) => set((st) => ({ sessions: [...st.sessions, s] })),
      clearHistory: () => set({ sessions: [] }),

      startPlan: (planId) => {
        if (!PLANS.some((p) => p.id === planId)) return;
        set({ userPlan: { planId, startDate: toISO(nearestMonday()), status: "active" } });
      },
      stopPlan: () => set((st) => ({ userPlan: st.userPlan ? { ...st.userPlan, status: "abandoned" } : null })),
    }),
    {
      name: "yadro-state-v1",
      version: 2,
      // v1 → v2: убраны расписания и премиум, добавлены настройки счёта
      migrate: (old) => {
        const o = (old ?? {}) as Partial<State> & { settings?: Partial<Settings> };
        return { ...o, settings: { ...DEFAULT_SETTINGS, ...(o.settings ?? {}) } } as State;
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) } };
      },
    },
  ),
);

export function allWorkouts(user: Workout[]): Workout[] {
  return [...BUILTIN_WORKOUTS, ...user];
}

export function findWorkout(id: string, user: Workout[]): Workout | undefined {
  return BUILTIN_WORKOUTS.find((w) => w.id === id) ?? user.find((w) => w.id === id);
}

/** Дней подряд с тренировками (сегодня или вчера — последний день серии). */
export function streak(sessions: Session[]): number {
  const days = new Set(sessions.map((s) => toISO(new Date(s.finishedAt))));
  let d = new Date();
  if (!days.has(toISO(d))) d = addDays(d, -1);
  let n = 0;
  while (days.has(toISO(d))) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export interface PlanProgress {
  plan: Plan;
  total: number;
  passed: number;
  done: number;
  missed: number;
  todayWorkoutId?: string;
  endDate: string;
  finished: boolean;
}

/** Прогресс активного плана: выполненным считается день, где есть сессия этой тренировки в эту дату. */
export function planProgress(up: UserPlan | null, sessions: Session[]): PlanProgress | null {
  if (!up || up.status !== "active") return null;
  const plan = PLANS.find((p) => p.id === up.planId);
  if (!plan) return null;
  const start = fromISO(up.startDate);
  const today = todayISO();
  const doneSet = new Set(sessions.map((s) => `${toISO(new Date(s.finishedAt))}|${s.workoutId}`));
  let passed = 0;
  let done = 0;
  let missed = 0;
  let todayWorkoutId: string | undefined;
  for (const d of plan.days) {
    const date = toISO(addDays(start, d.weekIndex * 7 + d.weekday - 1));
    const isDone = doneSet.has(`${date}|${d.workoutId}`);
    if (date === today) todayWorkoutId = d.workoutId;
    if (date <= today) {
      passed++;
      if (isDone) done++;
      else if (date < today) missed++;
    }
  }
  const endDate = toISO(addDays(start, plan.weeks * 7 - 1));
  return { plan, total: plan.days.length, passed, done, missed, todayWorkoutId, endDate, finished: today > endDate };
}
