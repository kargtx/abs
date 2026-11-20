import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Confirm, TopBar, useUi } from "../components/ui";
import { PLANS } from "../data/plans";
import { BUILTIN_WORKOUTS } from "../data/workouts";
import { durationMin } from "../lib/duration";
import { WEEKDAYS_SHORT, WEEKS_FORMS, plural, useLang, useT } from "../lib/i18n";
import { findWorkout, planProgress, useStore } from "../lib/store";
import { addDays, fromISO, nearestMonday, toISO, todayISO } from "../lib/date";
import type { Plan } from "../lib/types";
import { WorkoutCard } from "./Workouts";

export function planMinutes(p: Plan): [number, number] {
  const mins = p.days.map((d) => {
    const w = BUILTIN_WORKOUTS.find((x) => x.id === d.workoutId);
    return w ? durationMin(w) : 0;
  });
  return [Math.min(...mins), Math.max(...mins)];
}

function planParams(p: Plan, lang: "ru" | "en", minLabel: string) {
  const [a, b] = planMinutes(p);
  return `${plural(lang, p.weeks, WEEKS_FORMS)} · ${a === b ? a : `${a}–${b}`} ${minLabel}`;
}

const planBg = (hue: number) =>
  `radial-gradient(120% 90% at 100% 0%, hsl(${hue} 60% 32%) 0%, hsl(${hue} 50% 18%) 42%, hsl(${hue} 20% 9%) 100%)`;

export function PlansScreen() {
  const t = useT();
  const lang = useLang();
  const up = useStore((s) => s.userPlan);
  return (
    <div className="wrap">
      <TopBar title={t("tabPlans")} />
      {PLANS.map((p) => (
        <Link key={p.id} to={`/plan/${p.id}`} className="series plan" style={{ background: planBg(p.hue), ["--acc" as string]: `hsl(${p.hue} 80% 62%)` }}>
          <div className="kicker">{up?.status === "active" && up.planId === p.id ? t("activePlan") : t("planKicker")}</div>
          <h2>{p.name}</h2>
          <div className="meta">{planParams(p, lang, t("minPerSession"))}</div>
        </Link>
      ))}
    </div>
  );
}

function PlanGrid({ p, start }: { p: Plan; start: Date }) {
  const lang = useLang();
  const today = todayISO();
  const trainDays = new Set(p.days.map((d) => toISO(addDays(start, d.weekIndex * 7 + d.weekday - 1))));
  return (
    <div className="cal">
      <div className="g">
        {WEEKDAYS_SHORT[lang].map((d) => <div key={d} className="w">{d}</div>)}
        {Array.from({ length: p.weeks * 7 }, (_, i) => {
          const d = addDays(start, i);
          const iso = toISO(d);
          return <div key={iso} className={`d ${trainDays.has(iso) ? "has" : ""} ${iso === today ? "today" : ""}`}>{d.getDate()}</div>;
        })}
      </div>
    </div>
  );
}

export function PlanDetailScreen() {
  const { id = "" } = useParams();
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const p = PLANS.find((x) => x.id === id);
  const [expanded, setExpanded] = useState(false);
  const [confirm, setConfirm] = useState<null | "replace" | "stop">(null);
  const up = useStore((s) => s.userPlan);
  const sessions = useStore((s) => s.sessions);
  const user = useStore((s) => s.userWorkouts);
  const startPlan = useStore((s) => s.startPlan);
  const stopPlan = useStore((s) => s.stopPlan);
  const toast = useUi((s) => s.showToast);

  if (!p) return (<div className="wrap"><TopBar title={t("notFound")} back /></div>);

  const acc = `hsl(${p.hue} 80% 62%)`;
  const isActive = up?.status === "active" && up.planId === p.id;
  const pp = isActive ? planProgress(up, sessions) : null;
  const start = isActive ? fromISO(up!.startDate) : nearestMonday();
  const todayW = pp?.todayWorkoutId ? findWorkout(pp.todayWorkoutId, user) : undefined;
  const uniq = [...new Set(p.days.map((d) => d.workoutId))].map((wid) => findWorkout(wid, user)!).filter(Boolean);

  const doStart = () => {
    startPlan(p.id);
    toast(t("planStarted", { date: nearestMonday().toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "long" }) }));
    setConfirm(null);
  };

  return (
    <div className="wrap" style={{ ["--acc" as string]: acc }}>
      <TopBar title={p.name} back />
      <div className="series plan static" style={{ background: planBg(p.hue) }}>
        <div className="kicker">{t("planKicker")}</div>
        <h2>{p.name}</h2>
        <div className="meta">{planParams(p, lang, t("minPerSession"))}</div>
        {pp && <div className="bar"><i style={{ width: `${(pp.done / pp.total) * 100}%` }} /></div>}
      </div>

      {pp && (
        <div className="hero">
          <div className="muted small">{t("activePlan")}</div>
          <div className="stats">
            <div className="stat"><b>{pp.passed}/{pp.total}</b><span>{t("daysL")}</span></div>
            <div className="stat"><b>{pp.done}</b><span>{t("completed")}</span></div>
            <div className="stat"><b>{pp.missed}</b><span>{t("missed")}</span></div>
          </div>
          {todayW && <button className="btn" style={{ marginTop: 12 }} onClick={() => nav(`/workout/${todayW.id}`)}>{t("todayWorkout")}: {todayW.name}</button>}
        </div>
      )}

      <p className={`muted lead ${expanded ? "" : "clamp5"}`}>{p.description}</p>
      <button className="acc-text small" onClick={() => setExpanded(!expanded)}>{expanded ? t("readLess") : t("readMore")}</button>

      <div className="section-t">{t("scheduleTitle")}</div>
      <p className="muted small" style={{ marginTop: -4 }}>{t("startsMonday")}</p>
      <PlanGrid p={p} start={start} />

      <div className="section-t">{t("benefits")}</div>
      {p.benefits.map((b, i) => (
        <div key={i} className="card">
          <div className="num" style={{ color: acc }}>{i + 1}</div>
          <div className="body"><div className="t">{b.title}</div><div className="s">{b.text}</div></div>
        </div>
      ))}

      <div className="section-t">{t("planWorkouts")}</div>
      {uniq.map((w) => <WorkoutCard key={w.id} w={w} />)}

      <div className="sticky">
        {isActive ? (
          <button className="btn ghost" onClick={() => setConfirm("stop")}>{t("stopPlan")}</button>
        ) : (
          <button className="btn" onClick={() => (up?.status === "active" ? setConfirm("replace") : doStart())}>{t("startPlan")}</button>
        )}
      </div>

      {confirm === "replace" && <Confirm text={t("planReplaceQ")} okLabel={t("startPlan")} onCancel={() => setConfirm(null)} onOk={doStart} />}
      {confirm === "stop" && <Confirm text={`${t("stopPlan")}?`} okLabel={t("stopPlan")} danger onCancel={() => setConfirm(null)} onOk={() => { stopPlan(); setConfirm(null); }} />}
    </div>
  );
}
