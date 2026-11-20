import type { Difficulty, Step, Workout } from "../lib/types";

// Сгенерировано. Названия — как в исходном приложении.
// Средний и продвинутый уровни: исходный состав шагов (tz/workouts.json).
// Новичок: исходные названия, состав собран заново. Описания — собственные.

/**
 * Компактная запись шагов: "crunch 15, rest 20s, plank 30s".
 * Число — повторы, "Ns" — секунды, "rest Ns" — отдых.
 */
export function parseSteps(src: string): Step[] {
  return src
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((tok) => {
      const [id, raw] = tok.split(/\s+/);
      const isTime = raw.endsWith("s");
      const value = parseInt(raw, 10);
      if (!Number.isFinite(value)) throw new Error(`Bad step: ${tok}`);
      if (id === "rest") return { kind: "rest", mode: "time", value } as Step;
      return { kind: "exercise", exerciseId: id, mode: isTime ? "time" : "reps", value } as Step;
    });
}

type Def = [id: string, name: string, description: string, music: string, steps: string];

const beginner: Def[] = [
  ["8-minutes", "8 Minutes", "Восемь минут базовых упражнений с короткими паузами.", "sunrise",
    "crunch 20, rest 15s, alt-leg-raise 16, reach-crunch 15, rest 15s, cross-crunch 16, reverse-crunch 12, rest 15s, plank 30s, rest 15s, thigh-crunch 20, back-bicycle 30s, rest 15s, half-bridge 15, vertical-leg-crunch 15, rest 15s, side-plank-elbow 40s, alt-crunch 16"],
  ["six-pack-women-edition", "Six Pack - Women Edition", "Короткий комплекс на прямую и нижнюю часть пресса.", "groove",
    "crunch 15, alt-crunch 16, reverse-crunch 10, rest 15s, plank 30s, thigh-crunch 15"],
  ["lower-abs", "Lower Abs", "Первые шаги к нижнему прессу без перегрузки поясницы.", "lofi",
    "reverse-crunch 12, alt-leg-raise 16, rest 20s, back-bicycle 30s, vertical-leg-crunch 15, rest 20s, reverse-crunch 12"],
  ["super-fast", "Super Fast", "Три упражнения, две минуты.", "pulse",
    "crunch 20, back-bicycle 30s, plank 30s"],
  ["abs-chest", "Abs + Chest", "Отжимания с колен и базовые скручивания.", "groove",
    "knee-pushup 10, crunch 20, rest 20s, knee-pushup 10, reach-crunch 15, rest 20s, diamond-knee-pushup 8, cross-crunch 16, rest 20s, knee-pushup 12, reverse-crunch 12, rest 20s, plank 40s, rest 20s, knee-pushup 10, thigh-crunch 20, alt-leg-raise 16, half-bridge 15"],
  ["50-crunch-challenge", "50 Crunch Challenge", "Пятьдесят скручиваний в пяти вариантах.", "hiphop",
    "crunch 10, reach-crunch 10, thigh-crunch 10, alt-crunch 10, crunch 10"],
  ["dummies", "Dummies", "Самое мягкое начало: короткие подходы и отдых после каждого упражнения.", "chill",
    "crunch 10, rest 20s, alt-leg-raise 10, rest 20s, half-bridge 12, rest 20s, plank 20s, rest 20s, reach-crunch 10, rest 20s, side-plank-elbow 20s"],
  ["get-ripped", "Get Ripped", "Плотный комплекс для тех, кто освоил базу.", "drive",
    "crunch 20, reverse-crunch 15, cross-crunch 20, rest 15s, plank 45s, alt-crunch 20, rest 15s, mountain-climbers 30s, vertical-leg-crunch 20, rest 15s, side-plank-elbow 40s, reach-crunch 20"],
  ["2-min", "2 Min", "Две минуты — меньше, чем варится кофе.", "sunrise",
    "crunch 15, alt-leg-raise 12, plank 30s"],
  ["5-minute-plank", "5 Minute Plank", "Пять минут планок: прямая, боковые и снова прямая.", "chill",
    "plank 60s, rest 15s, side-plank-elbow 60s, rest 15s, plank 45s, rest 15s, side-plank-cross 40s, rest 15s, plank 45s"],
  ["1-1", "1&1", "По минуте на каждое упражнение с короткими паузами.", "lofi",
    "crunch 60s, rest 15s, back-bicycle 60s, rest 15s, plank 60s, rest 15s, alt-crunch 60s"],
  ["wake-up", "Wake Up!", "Лёгкое кардио и пресс сразу после пробуждения.", "sunrise",
    "high-knees 30s, crunch 15, butt-kicks 30s, rest 15s, alt-crunch 16, plank 30s, half-bridge 12"],
];

const intermediate: Def[] = [
  ["creed", "Creed", "Статика и упражнения на время с короткими паузами — для тех, кто не сдаётся.", "drive",
    "side-plank-cross 15s, scissors-side-crunch 15s, rest 30s, leg-thrust 30s, russian-twist 30s, rest 30s, plank 30s, crunch 30s, rest 30s, leg-thrust 30s, side-plank-cross 15s"],
  ["six-pack", "Six Pack", "Семь упражнений на повторы подряд, без отдыха.", "groove",
    "vertical-leg-crunch 25, windshield-wipers 8, double-crunch 30, leg-raise-4 10, cross-crunch 15, leg-to-leg-crunch 10, toe-touch 20"],
  ["obliques", "Obliques", "Боковые мышцы корпуса: планки и скручивания на время.", "sunrise",
    "double-crunch 30s, leg-to-leg-crunch 30s, oblique-roll-down 30s, side-plank-cross 30s, rest 30s, russian-twist 30s, leg-to-leg-crunch 30s, double-crunch 30s, side-plank-cross 15s"],
  ["ready-for-summer", "Ready for summer", "Короткий интенсивный комплекс на три минуты.", "latin",
    "reverse-crunch 40s, rest 20s, x-crunch 40s, rest 20s, leg-raise-4 40s, rest 20s, toe-touch 40s"],
  ["8-minutes-level-2", "8 Minutes - Level 2", "Восемь упражнений на повторы с тремя короткими паузами.", "pulse",
    "reverse-crunch 40, leg-thrust 40, rest 15s, leg-raise-4 20, alt-leg-raise 40, rest 15s, toe-touch 40, alt-crunch 20, rest 15s, knee-tuck-crunch 40, leg-to-leg-crunch 20"],
  ["abs-chest-level-2", "Abs + Chest Level 2", "Отжимания и пресс по очереди для всего верха корпуса.", "groove",
    "knee-pushup 20, leg-raise-4 10, vertical-leg-crunch 20, diamond-knee-pushup 20, rest 30s, pushup 30, x-crunch 20, reverse-crunch 30, rotation-pushup 5, rest 40s, chest-pushup 20, toe-touch 20, chest-pushup 20, reverse-crunch 20, rest 40s, oblique-twist-crunch 20, vertical-leg-crunch 20, reverse-crunch 20, rotation-pushup 5, knee-pushup 20, diamond-knee-pushup 10"],
  ["hottie", "Hottie", "Смешанный комплекс: повторы, время и частые короткие паузы.", "pulse",
    "hip-extension 10, rest 10s, hip-extension 10, rest 10s, reach-crunch 30, cross-scissors 30s, rest 10s, half-bridge 10, rest 10s, half-bridge 10, reach-crunch 25, cross-scissors 30s, rest 10s, reverse-hip-extension 25, rest 10s, reverse-hip-extension 25, rest 10s, reach-crunch 25, cross-scissors 30s, rest 10s, single-leg-stretch 40s"],
  ["show-it-all", "Show it all", "Длинный комплекс на повторы с отдыхом после каждой пары упражнений.", "groove",
    "hindu-pushup 15, rest 10s, hindu-pushup 15, rest 10s, hindu-pushup 15, rest 10s, reverse-crunch 30, leg-thrust 20, rest 10s, reverse-crunch 30, leg-thrust 20, rest 10s, vertical-leg-crunch 30, rest 10s, diamond-knee-pushup 25, rest 10s, diamond-knee-pushup 25, rest 10s, diamond-knee-pushup 25, rest 10s, reverse-crunch 30, leg-raise-4 20, rest 10s, pike-fist-pushup 10, rest 15s, pike-fist-pushup 10"],
  ["super-fast-level-2", "Super Fast - Level 2", "Четыре упражнения — когда совсем нет времени.", "pulse",
    "vertical-leg-crunch 30, leg-thrust 30, rest 10s, vertical-leg-crunch 30, leg-thrust 30"],
  ["lower-abs-level-2", "Lower Abs - Level 2", "Нижний пресс: подъёмы ног и обратные скручивания.", "lofi",
    "reverse-crunch-2 30, rest 10s, alt-leg-raise 30s, rest 10s, reverse-crunch 30, rest 10s, cross-scissors 30s, rest 10s, leg-raise-4 20, rest 10s, cross-scissors 30s, rest 10s, leg-raise-4 20, rest 10s, cross-scissors 30s"],
  ["2-2", "2&2", "Минута работы, короткий отдых — шесть раз.", "pulse",
    "vertical-leg-crunch 60s, rest 15s, vertical-leg-crunch 60s, rest 15s, leg-to-leg-crunch 60s, rest 15s, leg-to-leg-crunch 60s, rest 15s, leg-thrust 60s, rest 15s, leg-thrust 60s"],
  ["fat-burn", "Fat Burn", "Высокий темп и короткие паузы для расхода энергии.", "groove",
    "alt-leg-swing 30s, vertical-leg-crunch 30, rest 15s, alt-leg-swing 30s, vertical-leg-crunch 30, rest 15s, mountain-climbers 30s, bicycle 30s, rest 15s, mountain-climbers 30s, bicycle 30s, rest 15s, alt-leg-swing 30s, side-pushup 10"],
];

const advanced: Def[] = [
  ["flat-belly", "Flat Belly", "Длинная тренировка на весь пресс с частыми короткими паузами.", "groove",
    "jump-lunge 30s, crunch 20s, toe-touch 20s, oblique-roll-down 20s, jump-lunge 30s, crunch 20s, reverse-crunch 20s, leg-thrust 20s, high-knees 30s, leg-to-leg-crunch 20s, side-plank-elbow 20s, leg-thrust 20s, jump-lunge 30s, high-knees 30s, leg-raise-4 20s, vertical-leg-crunch 20s, reach-crunch 20s, plank 30s, side-plank-elbow 30s, russian-twist 20s, butt-kicks 45s, jump-lunge 45s, leg-thrust 20s, reverse-crunch 20s, plank 45s"],
  ["insane", "Insane", "Много упражнений, высокий объём, минимум отдыха.", "hiphop",
    "alt-crunch 10, rest 20s, alt-leg-raise 20, rest 20s, bicycle 20, windshield-wipers 10, rest 15s, vertical-leg-crunch 20, v-up 15, knee-tuck-crunch 20, rest 10s, leg-thrust 20, leg-raise-4 10, double-crunch 20, cross-crunch 10, rest 30s, alt-crunch 5, alt-leg-raise 10, bicycle 10, windshield-wipers 5, vertical-leg-crunch 10, v-up 10, knee-tuck-crunch 10, leg-thrust 10, leg-raise-4 5, double-crunch 10, cross-crunch 5"],
  ["insane-level-2", "Insane - Level 2", "Продолжение Insane: ещё больше повторов.", "hiphop",
    "cross-scissors 20, wide-v-up 10, dumbbell-crunch 20, side-plank-elbow 10, rest 45s, reach-crunch 20, leg-thrust 15, oblique-twist-crunch 15, reach-crunch 20, leg-thrust 15, oblique-twist-crunch 15, rest 30s, double-leg-stretch 30, vertical-leg-crunch 30, side-plank-elbow 20, leg-raise-4 10, reverse-crunch 30, leg-raise-4 10, leg-thrust 30, rest 30s, oblique-twist-crunch 15, knee-tuck-crunch 20, wide-v-up 20, leg-thrust 20, vertical-leg-crunch 20"],
  ["8-minutes-level-3", "8 Minutes - Level 3", "Восемь упражнений продвинутого уровня без пауз.", "groove",
    "toe-touch 50, dumbbell-crunch 50, rest 15s, cross-crunch 25, double-crunch 50, rest 15s, leg-raise-4 25, cross-scissors 50"],
  ["insane-level-3", "Insane - Level 3", "Самый длинный комплекс серии Insane.", "groove",
    "vertical-leg-crunch 30, plank 60s, bicycle 30, plank 60s, rest 30s, reverse-crunch 30, plank 60s, leg-thrust 30, cross-scissors 60s, rest 30s, double-crunch 40s, leg-to-leg-crunch 40s, side-plank 40s, oblique-twist-crunch 40s, rest 30s, side-plank-cross 40s, reverse-crunch 30, reach-crunch 30, vertical-leg-crunch 40s, rest 30s, toe-touch 30, reverse-crunch 30, leg-thrust 30, leg-raise-4 10"],
  ["spartan-ab", "Spartan Ab", "Жёсткий комплекс на силу и выносливость корпуса.", "pulse",
    "cross-scissors 30s, leg-raise-4 15, rest 20s, vertical-leg-crunch 25, reverse-crunch-2 25, rest 15s, plank-saw 20, rest 10s, v-sit 20s, rest 10s, leg-thrust 25, crunch-raise 25, rest 10s, flutter-kicks 40s, rest 15s, toe-touch 25, leg-raise-4 20"],
  ["100-crunch-challenge", "100 Crunch Challenge", "Сто скручиваний в разных вариантах.", "hiphop",
    "reach-crunch 25, rest 15s, reach-crunch 25, rest 15s, reach-crunch 25, rest 15s, reach-crunch 25"],
  ["six-pack-level-2", "Six Pack - Level 2", "Продвинутая версия Six Pack: больше упражнений и повторов.", "drive",
    "commando-plank 30s, rest 10s, commando-plank 30s, rest 10s, flutter-kicks 30s, rest 10s, flutter-kicks 30s, rest 10s, flutter-kicks 30s, rest 10s, v-sit 30s, rest 10s, v-sit 30s, rest 10s, v-sit 30s, rest 10s, toe-touch 25, rest 10s, toe-touch 25, rest 10s, toe-touch 25, rest 10s, leg-raise-4 20, rest 10s, leg-raise-4 20, rest 10s, leg-raise-4 20"],
  ["oblique-level-2", "Oblique - Level 2", "Продвинутая работа над косыми мышцами.", "hiphop",
    "side-plank-cross 10, rest 15s, side-plank-cross 10, rest 15s, side-plank-cross 10, rest 15s, side-pushup 10, rest 15s, side-pushup 10, rest 15s, side-pushup 10, rest 15s, back-bicycle 30s, rest 15s, back-bicycle 30s, rest 15s, back-bicycle 30s, rest 15s, double-crunch 30s, rest 15s, double-crunch 30s, rest 15s, double-crunch 30s, rest 15s, leg-to-leg-crunch 25, rest 15s, leg-to-leg-crunch 25"],
  ["abs-chest-level-3", "Abs+Chest - Level 3", "Сложные отжимания вперемешку с пресс-упражнениями.", "hiphop",
    "commando-plank 30s, rest 10s, commando-plank 30s, rest 10s, explosive-pushup 20s, rest 10s, explosive-pushup 20s, rest 10s, vertical-leg-crunch 30, diamond-knee-pushup 30, rest 10s, vertical-leg-crunch 30, diamond-knee-pushup 30, rest 10s, diamond-knee-pushup 30, vertical-leg-crunch 30, rest 10s, leg-raise-4 20, rest 10s, leg-raise-4 20, rest 10s, star-pushup 30"],
  ["3-3", "3&3", "Длинные отрезки работы с короткими паузами.", "groove",
    "toe-touch 60s, rest 10s, toe-touch 60s, rest 10s, toe-touch 60s, rest 10s, cross-crunch 60s, rest 10s, cross-crunch 60s, rest 10s, cross-crunch 60s, rest 10s, leg-raise-4 60s, rest 10s, leg-raise-4 60s, rest 10s, leg-raise-4 60s"],
  ["bruce-lee-abs", "Bruce Lee Abs", "Быстрые взрывные упражнения в стиле единоборств.", "bass",
    "oblique-roll-down 30s, rest 10s, oblique-roll-down 30s, rest 10s, v-up 30s, rest 10s, leg-thrust 30, rest 10s, wide-v-up 30s, rest 10s, windshield-wipers 30s, rest 10s, x-crunch 30s, rest 10s, plank-saw 30s, rest 10s, side-pushup 15s"],
];

function build(defs: Def[], difficulty: Difficulty, hueBase: number): Workout[] {
  return defs.map(([id, name, description, music, steps], i) => ({
    id,
    name,
    description,
    difficulty,
    steps: parseSteps(steps),
    defaultMusicId: music,
    source: "builtin",
    hue: (hueBase + i * 23) % 360,
  }));
}

export const BUILTIN_WORKOUTS: Workout[] = [
  ...build(beginner, "beginner", 140),
  ...build(intermediate, "intermediate", 20),
  ...build(advanced, "advanced", 330),
];
