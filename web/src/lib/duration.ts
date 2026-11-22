import { EXERCISE_BY_ID } from "../data/exercises";
import type { Step, Workout } from "./types";

/** Длительность шага в секундах (F-3.9): время, либо повторы × темп упражнения. */
export function stepSeconds(step: Step): number {
  if (step.kind === "rest" || step.mode === "time") return step.value;
  const ex = step.exerciseId ? EXERCISE_BY_ID[step.exerciseId] : undefined;
  return step.value * (step.pace ?? ex?.secondsPerRep ?? 2);
}

export function totalSeconds(steps: Step[]): number {
  return steps.reduce((s, st) => s + stepSeconds(st), 0);
}

/** Минуты с округлением вверх, минимум 1. */
export function durationMin(w: Pick<Workout, "steps">): number {
  return Math.max(1, Math.ceil(totalSeconds(w.steps) / 60));
}

export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function fmtStepValue(step: Step): string {
  return step.mode === "time" ? fmtClock(step.value) : String(step.value);
}

/** Оценка калорий по MET: ккал = MET × 3.5 × кг / 200 × минуты. */
export function kcalFor(met: number, weightKg: number, seconds: number): number {
  return (met * 3.5 * weightKg) / 200 * (seconds / 60);
}
