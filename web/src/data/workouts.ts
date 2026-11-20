import type { Difficulty, Step, Workout } from "../lib/types";

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
  ["first-touch", "Первое касание", "Мягкое знакомство с прессом: короткие подходы и отдых после каждого упражнения.", "chill",
    "crunch 10, rest 20s, alt-leg-raise 10, rest 20s, plank 20s"],
  ["morning-start", "Утренний старт", "Разбудите мышцы корпуса за пару минут до кофе.", "sunrise",
    "high-knees 30s, crunch 12, alt-crunch 16, rest 15s, plank 20s"],
  ["soft-core", "Мягкий кор", "Контроль и дыхание вместо скорости. Подходит, если давно не тренировались.", "chill",
    "alt-leg-raise 10, rest 20s, half-bridge 12, rest 20s, hip-extension 10, rest 20s, plank 20s"],
  ["five-for-you", "Пять минут для себя", "Ровный темп без сложных элементов — просто сделайте это сегодня.", "sunrise",
    "crunch 15, reach-crunch 12, rest 20s, cross-crunch 12, alt-crunch 20, rest 20s, reverse-crunch 10, rest 20s, plank 30s"],
  ["straight-back", "Ровная спина", "Пресс и мышцы спины вместе — для осанки и устойчивого корпуса.", "chill",
    "reverse-hip-extension 10, rest 15s, hip-extension 10, rest 15s, half-bridge 15, rest 15s, plank 25s, rest 15s, alt-leg-raise 10"],
  ["lower-start", "Нижний акцент: старт", "Первые шаги к нижней части пресса без перегрузки поясницы.", "groove",
    "reverse-crunch 10, rest 20s, alt-leg-raise 12, rest 20s, vertical-leg-crunch 12, rest 20s, knee-tuck-crunch 10"],
  ["easy-sides", "Бока без спешки", "Спокойная работа над косыми мышцами живота.", "groove",
    "alt-crunch 20, rest 15s, cross-crunch 14, rest 15s, scissors-side-crunch 10, rest 15s, side-plank 15s"],
  ["office-reboot", "Офисная перезагрузка", "Короткая встряска после долгого сидения: кардио плюс корпус.", "sunrise",
    "high-knees 30s, butt-kicks 30s, rest 15s, crunch 15, half-bridge 15, rest 15s, plank 30s"],
  ["plank-abc", "Планка-азбука", "Изучите основные варианты планки короткими отрезками.", "chill",
    "plank 20s, rest 15s, plank 20s, rest 15s, hip-extension 10, rest 15s, plank 30s"],
  ["evening-ten", "Вечерняя десятка", "Десять упражнений по одному подходу. Спокойно, но без пропусков.", "lofi",
    "crunch 12, reach-crunch 12, alt-crunch 16, reverse-crunch 10, rest 20s, alt-leg-raise 12, alt-leg-raise 10, rest 20s, cross-crunch 12, half-bridge 15, reverse-hip-extension 10, plank 30s"],
  ["balance-control", "Баланс и контроль", "Медленные движения, которые учат держать корпус неподвижным.", "lofi",
    "alt-leg-raise 12, rest 15s, hip-extension 12, rest 15s, plank 15s, rest 15s, side-plank 15s, rest 15s, plank 30s"],
];

const intermediate: Def[] = [
  ["core-rhythm", "Ритм кора", "Упражнения на время под ритм музыки: держите темп до конца отрезка.", "groove",
    "crunch 30s, bicycle 30s, rest 20s, leg-thrust 30s, russian-twist 30s, rest 20s, plank 40s"],
  ["obliques-focus", "Косые в фокусе", "Боковые мышцы корпуса — с разных углов и в разных режимах.", "pulse",
    "russian-twist 30s, cross-crunch 30s, side-pushup 30s, rest 20s, alt-crunch 30s, scissors-side-crunch 30s, rest 20s, bicycle 30s, side-plank 30s"],
  ["lower-two", "Нижний пресс 2.0", "Ноги работают, поясница прижата. Следите за техникой, а не за скоростью.", "groove",
    "reverse-crunch 15, rest 15s, flutter-kicks 30s, rest 15s, leg-raise-4 12, rest 15s, cross-scissors 30s, rest 15s, reverse-crunch-2 12, rest 15s, cross-scissors 30s"],
  ["pulse-abs", "Пульс и пресс", "Кардио-вставки между упражнениями на пресс держат пульс высоким.", "pulse",
    "high-knees 30s, crunch 20, mountain-climbers 30s, rest 20s, bicycle 20, mountain-climbers 30s, rest 20s, reverse-crunch 15, high-knees 30s"],
  ["reps-ladder", "Лестница повторов", "Число повторов растёт от круга к кругу. Дойдите до вершины.", "drive",
    "crunch 10, reverse-crunch 10, rest 15s, crunch 15, reverse-crunch 15, rest 15s, crunch 20, reverse-crunch 20, rest 15s, double-crunch 15"],
  ["steel-belt", "Стальной пояс", "Статика и динамика вперемешку — корпус как единое целое.", "drive",
    "plank 45s, commando-plank 20, rest 20s, side-plank 30s, side-pushup 12, rest 20s, plank-saw 30s, commando-plank 10"],
  ["cardio-core", "Кардио-ядро", "Жиросжигающий темп и короткий отдых.", "pulse",
    "high-knees 40s, mountain-climbers 30s, rest 15s, mountain-climbers 30s, bicycle 30s, rest 15s, high-knees 30s, flutter-kicks 30s, rest 15s, mountain-climbers 30s"],
  ["abs-chest", "Пресс и грудь", "Сочетание отжиманий и упражнений на пресс для верха корпуса.", "drive",
    "pushup 10, crunch 20, chest-pushup 10, rest 20s, bicycle 20, knee-pushup 12, double-crunch 15, rest 20s, pushup 10, toe-touch 15, plank 45s"],
  ["eight", "Восьмёрка", "Восемь упражнений на повторы почти без пауз.", "groove",
    "vertical-leg-crunch 20, double-crunch 20, reverse-crunch 15, rest 15s, cross-crunch 20, toe-touch 15, rest 15s, leg-thrust 15, bicycle 20, sit-up 15"],
  ["circle-seven", "Круг на семь", "Два круга одного комплекса — второй всегда тяжелее.", "lofi",
    "crunch 15, leg-raise-4 10, russian-twist 20, rest 30s, crunch 15, leg-raise-4 10, russian-twist 20, rest 30s, plank 45s"],
  ["intervals-30-15", "Интервалы 30/15", "30 секунд работы, 15 секунд отдыха. Просто и честно.", "pulse",
    "bicycle 30s, rest 15s, flutter-kicks 30s, rest 15s, mountain-climbers 30s, rest 15s, russian-twist 30s, rest 15s, plank-saw 30s, rest 15s, plank 30s"],
  ["no-breaks", "Без пауз", "Ни одного шага отдыха — дыхание держит ритм.", "drive",
    "crunch 20, reach-crunch 15, double-crunch 15, cross-crunch 20, reverse-crunch 15, single-leg-stretch 20, toe-touch 15"],
];

const advanced: Def[] = [
  ["limit", "Предел", "Длинные отрезки на время и короткий отдых для подготовленных.", "bass",
    "v-up 40s, bicycle 45s, rest 15s, windshield-wipers 40s, plank 45s, rest 15s, mountain-climbers 40s, mountain-climbers 45s, rest 15s, v-sit 30s"],
  ["blast", "Взрыв", "Прыжковые и взрывные движения вместе с прессом.", "bass",
    "jump-lunge 10, mountain-climbers 40s, rest 20s, v-up 15, mountain-climbers 40s, rest 20s, jump-lunge 10, flutter-kicks 40s"],
  ["hundred", "Сотня", "Сто скручиваний в разных вариантах — по 20 за подход.", "drive",
    "crunch 20, rest 15s, double-crunch 20, rest 15s, cross-crunch 20, rest 15s, reach-crunch 20, rest 15s, toe-touch 20"],
  ["iron-core", "Железный корпус", "Тяжёлые варианты планки и удержания на всё тело.", "bass",
    "plank 60s, commando-plank 12, rest 20s, side-plank 45s, mountain-climbers 16, rest 20s, plank-saw 45s, commando-plank 24, rest 20s, plank 45s"],
  ["double-round", "Двойной круг", "Два полных круга из шести упражнений.", "pulse",
    "v-up 15, russian-twist 30, leg-raise-4 15, rest 20s, windshield-wipers 12, double-leg-stretch 12, scissors-side-crunch 15, rest 30s, v-up 15, russian-twist 30, leg-raise-4 15, rest 20s, windshield-wipers 12, double-leg-stretch 12, scissors-side-crunch 15"],
  ["antigravity", "Антигравитация", "Ноги наверху почти весь комплекс — нижний пресс горит.", "groove",
    "leg-raise-4 20, reverse-crunch-2 15, rest 15s, toe-touch 20, leg-thrust 20, rest 15s, flutter-kicks 45s, cross-scissors 45s, rest 15s, cross-scissors 45s, v-sit 30s"],
  ["final-boss", "Финальный бой", "Самый длинный комплекс каталога. Разделите его на этапы в голове.", "bass",
    "high-knees 60s, jump-lunge 10, rest 20s, v-up 20, windshield-wipers 16, rest 20s, mountain-climbers 45s, mountain-climbers 20, rest 20s, double-leg-stretch 15, russian-twist 40, rest 20s, diamond-knee-pushup 12, rotation-pushup 10, rest 20s, plank 45s, plank 60s, rest 20s, high-knees 45s, sit-up 20, rest 20s, v-sit 40s"],
  ["abs-chest-pro", "Пресс и грудь PRO", "Сложные отжимания чередуются с жёсткими упражнениями на пресс.", "drive",
    "diamond-knee-pushup 12, v-up 15, chest-pushup 15, rest 20s, rotation-pushup 10, windshield-wipers 12, pike-fist-pushup 10, rest 20s, pushup 15, double-crunch 20, plank 60s"],
  ["tabata-core", "Табата-кор", "Восемь раундов по 20 секунд работы и 10 секунд отдыха.", "pulse",
    "mountain-climbers 20s, rest 10s, bicycle 20s, rest 10s, mountain-climbers 20s, rest 10s, flutter-kicks 20s, rest 10s, mountain-climbers 20s, rest 10s, bicycle 20s, rest 10s, mountain-climbers 20s, rest 10s, flutter-kicks 20s"],
  ["marathon", "Марафон", "Комплекс на выносливость: много повторов, мало остановок.", "lofi",
    "crunch 30, reverse-crunch 20, bicycle 30, rest 20s, sit-up 20, leg-raise-4 15, russian-twist 40, rest 20s, crunch-raise 15, oblique-roll-down 10, toe-touch 20, rest 20s, cross-crunch 30, single-leg-stretch 30, double-leg-stretch 15, rest 20s, scissors-side-crunch 20, side-pushup 20, plank 60s"],
  ["obliques-pro", "Косые PRO", "Продвинутая работа над боковыми мышцами и вращением.", "bass",
    "windshield-wipers 16, russian-twist 40, rest 15s, side-pushup 20, scissors-side-crunch 20, rest 15s, mountain-climbers 20, rotation-pushup 10, rest 15s, side-plank 45s, bicycle 40"],
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
