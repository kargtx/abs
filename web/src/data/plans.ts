import type { Plan, PlanDay } from "../lib/types";

/** Генерирует расписание: на каждой неделе в указанные дни — тренировка по правилу. */
function gen(weeks: number, weekdays: number[], pick: (week: number, dayIdx: number) => string): PlanDay[] {
  const out: PlanDay[] = [];
  for (let w = 0; w < weeks; w++) weekdays.forEach((wd, i) => out.push({ weekIndex: w, weekday: wd, workoutId: pick(w, i) }));
  return out;
}

const byStage = (stages: string[][], weeks: number) => (w: number, i: number) => {
  const stage = stages[Math.min(stages.length - 1, Math.floor((w / weeks) * stages.length))];
  return stage[i % stage.length];
};

export const PLANS: Plan[] = [
  {
    id: "zero-start",
    name: "Старт с нуля",
    description:
      "Четыре недели, чтобы привыкнуть тренироваться регулярно. Три коротких занятия в неделю, нагрузка растёт постепенно, а каждое упражнение повторяется достаточно часто, чтобы закрепить технику. Подходит тем, кто начинает впервые или возвращается после долгого перерыва.",
    weeks: 4,
    hue: 150,
    benefits: [
      { title: "Привычка", text: "Короткие занятия легко вписать в любой день." },
      { title: "Техника", text: "Базовые движения повторяются, пока не станут привычными." },
      { title: "Без перегрузки", text: "Объём растёт плавно, неделя за неделей." },
    ],
    days: gen(4, [1, 3, 5], byStage([["first-touch", "soft-core", "plank-abc"], ["five-for-you", "easy-sides", "lower-start"], ["evening-ten", "balance-control", "straight-back"]], 4)),
  },
  {
    id: "lower-six",
    name: "Нижний пресс за 6 недель",
    description:
      "Программа с акцентом на нижнюю часть живота: подъёмы ног, обратные скручивания и удержания. Первые недели учат держать поясницу прижатой, затем добавляются длинные отрезки на время и продвинутые варианты.",
    weeks: 6,
    hue: 200,
    benefits: [
      { title: "Акцент", text: "Упражнения подобраны для нижней части пресса." },
      { title: "Контроль", text: "Учит работать без прогиба в пояснице." },
      { title: "Прогрессия", text: "От новичкового до продвинутого уровня за 6 недель." },
    ],
    days: gen(6, [1, 3, 5], byStage([["lower-start"], ["lower-two"], ["antigravity", "lower-two"]], 6)),
  },
  {
    id: "plank-month",
    name: "Месяц планки",
    description:
      "Пять дней в неделю — статическая работа на мышцы всего корпуса. Время удержания растёт, а варианты планки становятся сложнее. Хорошо дополняет любую другую программу.",
    weeks: 4,
    hue: 260,
    benefits: [
      { title: "Весь корпус", text: "Работают пресс, спина, плечи и ягодицы." },
      { title: "Осанка", text: "Сильный корпус помогает держать спину ровно." },
      { title: "Мало времени", text: "Большинство занятий короче десяти минут." },
    ],
    days: gen(4, [1, 2, 3, 4, 5], byStage([["plank-abc", "balance-control"], ["steel-belt", "plank-abc"], ["steel-belt"], ["iron-core", "steel-belt"]], 4)),
  },
  {
    id: "waist",
    name: "Тонкая талия",
    description:
      "Четыре недели для косых мышц живота: повороты, боковые планки и скручивания с вращением. Каждая неделя усложняет предыдущую.",
    weeks: 4,
    hue: 320,
    benefits: [
      { title: "Косые мышцы", text: "Работа над боками под разными углами." },
      { title: "Вращение", text: "Корпус становится сильнее в поворотах." },
      { title: "Разнообразие", text: "Три уровня сложности в одной программе." },
    ],
    days: gen(4, [1, 3, 5], byStage([["easy-sides", "five-for-you"], ["obliques-focus", "easy-sides"], ["obliques-focus"], ["obliques-pro", "obliques-focus"]], 4)),
  },
  {
    id: "cardio-core-6",
    name: "Кардио и кор",
    description:
      "Шесть недель интервальных тренировок: пресс плюс кардио-вставки, чтобы держать пульс высоким. Четыре занятия в неделю.",
    weeks: 6,
    hue: 20,
    benefits: [
      { title: "Выносливость", text: "Пульс остаётся высоким почти всю тренировку." },
      { title: "Энергозатраты", text: "Кардио-вставки увеличивают расход калорий." },
      { title: "Темп", text: "Интервалы учат держать ритм до конца." },
    ],
    days: gen(6, [1, 2, 4, 6], byStage([["office-reboot", "morning-start"], ["cardio-core", "pulse-abs"], ["intervals-30-15", "cardio-core"], ["tabata-core", "intervals-30-15"]], 6)),
  },
  {
    id: "strength-eight",
    name: "Восемь недель силы",
    description:
      "Самая длинная программа: от средних тренировок до самых сложных в каталоге. Четыре занятия в неделю, к концу — полноценные длинные комплексы.",
    weeks: 8,
    hue: 0,
    benefits: [
      { title: "Сила", text: "Объём и сложность растут каждые две недели." },
      { title: "Полный путь", text: "Проходит через весь каталог среднего и продвинутого уровня." },
      { title: "Результат", text: "К финалу вы пройдёте самый длинный комплекс." },
    ],
    days: gen(8, [1, 2, 4, 5], byStage([["core-rhythm", "lower-two", "obliques-focus", "steel-belt"], ["eight", "circle-seven", "no-breaks", "abs-chest"], ["limit", "hundred", "iron-core", "double-round"], ["marathon", "final-boss", "abs-chest-pro", "obliques-pro"]], 8)),
  },
  {
    id: "morning-month",
    name: "Утренняя зарядка",
    description: "Четыре недели коротких утренних тренировок каждый будний день. Две-четыре минуты, чтобы проснуться.",
    weeks: 4,
    hue: 45,
    benefits: [
      { title: "Бодрость", text: "Лёгкое кардио и пресс сразу после пробуждения." },
      { title: "Быстро", text: "Каждое занятие — несколько минут." },
      { title: "Регулярность", text: "Пять дней в неделю формируют привычку." },
    ],
    days: gen(4, [1, 2, 3, 4, 5], (_w, i) => (i % 2 === 0 ? "morning-start" : "office-reboot")),
  },
];
