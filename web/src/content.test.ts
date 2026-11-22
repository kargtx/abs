import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("navigator", { language: "ru-RU" });
vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });

const { EXERCISES, EXERCISE_BY_ID } = await import("./data/exercises");
const { BUILTIN_WORKOUTS, parseSteps } = await import("./data/workouts");
const { PLANS } = await import("./data/plans");
const { MUSIC_BY_ID } = await import("./data/music");
const { durationMin, totalSeconds } = await import("./lib/duration");
const { nearestMonday, isoWeekday, monthGrid, toISO } = await import("./lib/date");
const { plural, WEEKS_FORMS } = await import("./lib/i18n");

describe("content", () => {
  it("has at least 55 exercises with unique ids and all F-6.3 fields", () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(55);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
    for (const e of EXERCISES) {
      expect(e.description.length).toBeGreaterThan(10);
      expect(e.instructions.length).toBeGreaterThanOrEqual(2);
      expect(e.commonMistakes.length).toBeGreaterThanOrEqual(1);
      expect(e.muscles.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("has ≥30 workouts across 3 levels referencing existing exercises and music", () => {
    expect(BUILTIN_WORKOUTS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(BUILTIN_WORKOUTS.map((w) => w.id)).size).toBe(BUILTIN_WORKOUTS.length);
    expect(new Set(BUILTIN_WORKOUTS.map((w) => w.difficulty)).size).toBe(3);
    for (const w of BUILTIN_WORKOUTS) {
      expect(MUSIC_BY_ID[w.defaultMusicId], w.id).toBeTruthy();
      for (const s of w.steps) if (s.kind === "exercise") expect(EXERCISE_BY_ID[s.exerciseId!], `${w.id}:${s.exerciseId}`).toBeTruthy();
      expect(durationMin(w)).toBeGreaterThanOrEqual(1);
      expect(durationMin(w)).toBeLessThanOrEqual(35);
    }
  });

  it("uses the original exercise names from appendix C and the catalog numbers", async () => {
    const fs = await import("node:fs");
    const md = fs.readFileSync(new URL("../../tz/APPENDIX_C_exercises.md", import.meta.url), "utf8");
    const names = [...md.matchAll(/^\| \d+ \| (.+?) \|/gm)].map((m) => m[1]);
    expect(names).toHaveLength(55);
    const ours = new Set(EXERCISES.map((e) => e.name));
    for (const n of names) expect(ours.has(n), n).toBe(true);
    const catalog = JSON.parse(fs.readFileSync(new URL("../../tz/exercise_catalog.json", import.meta.url), "utf8")) as Record<string, string>;
    for (const [num, name] of Object.entries(catalog)) {
      const e = EXERCISES.find((x) => x.name === name);
      expect(e?.number, name).toBe(Number(num.replace("# ", "")));
    }
  });

  it("every exercise has an animation", async () => {
    const { FIGURES } = await import("./data/figures");
    for (const e of EXERCISES) expect(FIGURES[e.fig], e.id).toBeTruthy();
  });

  it("has ≥6 plans referencing existing workouts", () => {
    expect(PLANS.length).toBeGreaterThanOrEqual(6);
    const ids = new Set(BUILTIN_WORKOUTS.map((w) => w.id));
    for (const p of PLANS) for (const d of p.days) {
      expect(ids.has(d.workoutId), `${p.id}:${d.workoutId}`).toBe(true);
      expect(d.weekIndex).toBeLessThan(p.weeks);
    }
  });
});

describe("duration (F-3.9)", () => {
  it("sums time, reps × pace and rest, rounding up", () => {
    const steps = parseSteps("crunch 10, rest 20s, plank 30s");
    // crunch: 10 × 2 s = 20, rest 20, plank 30 → 70 s → 2 мин
    expect(totalSeconds(steps)).toBe(70);
    expect(durationMin({ steps })).toBe(2);
  });
});

describe("dates", () => {
  it("nearestMonday returns today on Monday, next Monday otherwise", () => {
    expect(toISO(nearestMonday(new Date(2026, 10, 16)))).toBe("2026-11-16"); // пн
    expect(toISO(nearestMonday(new Date(2026, 10, 20)))).toBe("2026-11-23"); // пт
    expect(toISO(nearestMonday(new Date(2026, 10, 22)))).toBe("2026-11-23"); // вс
  });
  it("month grid starts on Monday", () => {
    const g = monthGrid(2026, 10);
    expect(isoWeekday(g[0])).toBe(1);
    expect(g).toHaveLength(42);
  });
  it("russian plural for weeks", () => {
    expect(plural("ru", 1, WEEKS_FORMS)).toBe("1 неделя");
    expect(plural("ru", 4, WEEKS_FORMS)).toBe("4 недели");
    expect(plural("ru", 8, WEEKS_FORMS)).toBe("8 недель");
    expect(plural("ru", 11, WEEKS_FORMS)).toBe("11 недель");
  });
});
