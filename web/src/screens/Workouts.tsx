import { Link, useNavigate, useParams } from "react-router-dom";
import { TopBar } from "../components/ui";
import { Fig, LEVEL_ACC } from "../components/Fig";
import { IconCheck, IconRight } from "../components/Icons";
import { BUILTIN_WORKOUTS } from "../data/workouts";
import { EXERCISE_BY_ID } from "../data/exercises";
import { durationMin, fmtClock } from "../lib/duration";
import { LEVEL_LABEL, plural, useLang, useT } from "../lib/i18n";
import { findWorkout, planProgress, streak, useStore } from "../lib/store";
import type { Difficulty, Workout } from "../lib/types";

export const LEVELS: Difficulty[] = ["beginner", "intermediate", "advanced"];

export function firstFig(w: Workout) {
  const st = w.steps.find((s) => s.kind === "exercise");
  return (st?.exerciseId && EXERCISE_BY_ID[st.exerciseId]?.fig) || "crunch";
}

export function accOf(w: Workout) {
  return w.source === "user" ? LEVEL_ACC.mine : LEVEL_ACC[w.difficulty];
}

function useDoneCounts() {
  const sessions = useStore((s) => s.sessions);
  const counts: Record<string, number> = {};
  sessions.forEach((s) => (counts[s.workoutId] = (counts[s.workoutId] ?? 0) + 1));
  return counts;
}

/** Карточка тренировки: номер в серии или миниатюра, длительность, число упражнений, отметка «выполнено» / «далее». */
export function WorkoutCard({ w, idx, isNext, done }: { w: Workout; idx?: number; isNext?: boolean; done?: number }) {
  const t = useT();
  const lang = useLang();
  const ex = w.steps.filter((s) => s.kind === "exercise").length;
  const acc = accOf(w);
  return (
    <Link to={`/workout/${w.id}`} className="card" style={{ ["--acc" as string]: acc }}>
      {idx != null ? <div className="num" style={{ color: acc }}>{idx}</div> : <div className="thumb"><Fig fig={firstFig(w)} color={acc} still /></div>}
      <div className="body">
        <div className="t">{w.name}</div>
        <div className="s">{durationMin(w)} {t("min")} · {plural(lang, ex, EX_FORMS)}</div>
      </div>
      {done ? <span className="done-badge">✓ {done > 1 ? `${done}×` : ""}</span> : isNext ? <span className="next-badge">{t("next")}</span> : <span className="chev"><IconRight size={18} /></span>}
    </Link>
  );
}

export const EX_FORMS = { ru: ["упражнение", "упражнения", "упражнений"] as [string, string, string], en: ["exercise", "exercises"] as [string, string] };
const WORKOUT_FORMS = { ru: ["тренировка", "тренировки", "тренировок"] as [string, string, string], en: ["workout", "workouts"] as [string, string] };
const DAY_FORMS = { ru: ["день подряд", "дня подряд", "дней подряд"] as [string, string, string], en: ["day streak", "day streak"] as [string, string] };
const SERIES_FIG: Record<Difficulty, string> = { beginner: "crunch", intermediate: "bicycle", advanced: "climbers" };

function TodayCard() {
  const t = useT();
  const up = useStore((s) => s.userPlan);
  const sessions = useStore((s) => s.sessions);
  const user = useStore((s) => s.userWorkouts);
  const pp = planProgress(up, sessions);
  if (!pp) return null;
  const w = pp.todayWorkoutId ? findWorkout(pp.todayWorkoutId, user) : undefined;
  return (
    <Link to={w ? `/workout/${w.id}` : `/plan/${pp.plan.id}`} className="hero today">
      <div className="muted small">{t("activePlan")} · {pp.plan.name}</div>
      <div className="today-t">{w ? `${t("todayWorkout")}: ${w.name}` : t("restDay")}</div>
      <div className="bar"><i style={{ width: `${(pp.done / pp.total) * 100}%` }} /></div>
      <div className="muted small">{t("dayOf", { k: pp.passed, n: pp.total })} · ✓ {pp.done}{pp.missed ? ` · ${pp.missed} ${t("missed")}` : ""}</div>
    </Link>
  );
}

export function HomeScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const sessions = useStore((s) => s.sessions);
  const counts = useDoneCounts();
  const tot = sessions.length;
  const secs = sessions.reduce((a, s) => a + s.activeSeconds, 0);
  const st = streak(sessions);
  const recent = [...sessions].reverse().slice(0, 5);

  return (
    <div className="wrap">
      <TopBar title={t("appName")} />
      <div className="hero">
        <div className="muted small">{t("yourProgress")}</div>
        <div className="stats">
          <div className="stat"><b>{tot}</b><span>{plural(lang, tot, WORKOUT_FORMS).replace(/^\d+ /, "")}</span></div>
          <div className="stat"><b>{Math.round(secs / 60)}</b><span>{t("minutes")}</span></div>
          <div className="stat"><b>{st}</b><span>{plural(lang, st, DAY_FORMS).replace(/^\d+ /, "")}</span></div>
        </div>
      </div>

      <TodayCard />

      <div className="section-t">{t("levels")}</div>
      {LEVELS.map((lvl) => {
        const ws = BUILTIN_WORKOUTS.filter((w) => w.difficulty === lvl);
        const n = ws.filter((w) => counts[w.id]).length;
        return (
          <button key={lvl} className={`series ${lvl}`} onClick={() => nav(`/level/${lvl}`)}>
            <Fig fig={SERIES_FIG[lvl]} color={LEVEL_ACC[lvl]} className="series-fig" />
            <div className="kicker">{t("levelKicker")} · {plural(lang, ws.length, WORKOUT_FORMS)}</div>
            <h2>{LEVEL_LABEL[lang][lvl]}</h2>
            <div className="meta">{t("passedOf", { n, total: ws.length })}</div>
            <div className="bar"><i style={{ width: `${Math.round((n / ws.length) * 100)}%` }} /></div>
          </button>
        );
      })}

      <div className="section-t">{t("history")}</div>
      {recent.length ? (
        recent.map((h) => (
          <Link key={h.id} to={`/workout/${h.workoutId}`} className="card">
            <div className="num" style={{ color: "var(--six)" }}><IconCheck size={20} /></div>
            <div className="body">
              <div className="t">{h.workoutName}</div>
              <div className="s">
                {new Date(h.finishedAt).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "long" })} ·{" "}
                {new Date(h.finishedAt).toLocaleTimeString(lang === "ru" ? "ru-RU" : "en-US", { hour: "2-digit", minute: "2-digit" })} · {fmtClock(h.activeSeconds)}
              </div>
            </div>
          </Link>
        ))
      ) : (
        <p className="muted">{t("noHistory")}</p>
      )}
    </div>
  );
}

const LEVEL_DESC: Record<"ru" | "en", Record<Difficulty, string>> = {
  ru: {
    beginner: "Короткие тренировки, чтобы освоить базовые движения и привыкнуть заниматься регулярно.",
    intermediate: "Больше упражнений на время и меньше отдыха. Для тех, кто уже уверенно держит технику.",
    advanced: "Длинные подходы, сложные упражнения и короткий отдых. Для подготовленных.",
  },
  en: {
    beginner: "Short workouts to learn the basics and build a habit.",
    intermediate: "More timed sets and less rest, for those with solid technique.",
    advanced: "Long sets, hard moves and short rest. For trained athletes.",
  },
};

export function LevelScreen() {
  const { lvl = "beginner" } = useParams();
  const lang = useLang();
  const level = (LEVELS.includes(lvl as Difficulty) ? lvl : "beginner") as Difficulty;
  const counts = useDoneCounts();
  const ws = BUILTIN_WORKOUTS.filter((w) => w.difficulty === level);
  const next = ws.find((w) => !counts[w.id])?.id;
  return (
    <div className="wrap" style={{ ["--acc" as string]: LEVEL_ACC[level] }}>
      <TopBar title={LEVEL_LABEL[lang][level]} back />
      <p className="muted lead">{LEVEL_DESC[lang][level]}</p>
      {ws.map((w, i) => <WorkoutCard key={w.id} w={w} idx={i + 1} isNext={w.id === next} done={counts[w.id]} />)}
    </div>
  );
}

export function MineScreen() {
  const t = useT();
  const nav = useNavigate();
  const user = useStore((s) => s.userWorkouts);
  const counts = useDoneCounts();
  return (
    <div className="wrap" style={{ ["--acc" as string]: LEVEL_ACC.mine }}>
      <TopBar title={t("myWorkouts")} />
      {user.length ? (
        user.map((w) => <WorkoutCard key={w.id} w={w} done={counts[w.id]} />)
      ) : (
        <div className="hero">
          <b>{t("emptyTitle")}</b>
          <p className="muted lead" style={{ margin: "6px 0 0" }}>{t("myEmpty")}</p>
        </div>
      )}
      <button className="btn" style={{ marginTop: 16 }} onClick={() => nav("/builder/new")}>+ {t("builderNew")}</button>
    </div>
  );
}
