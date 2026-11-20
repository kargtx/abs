import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TopBar } from "../components/ui";
import { Fig, LEVEL_ACC } from "../components/Fig";
import { IconSearch } from "../components/Icons";
import { EXERCISES, EXERCISE_BY_ID } from "../data/exercises";
import { DIFF_LABEL, EQUIPMENT_LABEL, MUSCLE_LABEL, TYPE_LABEL, exName, useLang, useT } from "../lib/i18n";
import type { Exercise, Muscle } from "../lib/types";

const GROUPS: (Muscle | "")[] = ["", "abs", "lowerAbs", "obliques", "chest", "glutes"];

export function useExerciseFilter() {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<Muscle | "">("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return EXERCISES.filter(
      (e) =>
        (!s || e.name.toLowerCase().includes(s) || e.nameEn.toLowerCase().includes(s) || String(e.number) === s.replace("#", "").trim()) &&
        (!group || e.muscles.includes(group)),
    ).sort((a, b) => a.number - b.number);
  }, [q, group]);
  return { q, setQ, group, setGroup, list };
}

export function ExerciseFilters({ f }: { f: ReturnType<typeof useExerciseFilter> }) {
  const t = useT();
  const lang = useLang();
  return (
    <>
      <label className="search">
        <IconSearch size={18} />
        <input type="search" placeholder={t("search")} value={f.q} onChange={(e) => f.setQ(e.target.value)} aria-label={t("search")} />
      </label>
      <div className="chips">
        {GROUPS.map((g) => (
          <button key={g || "all"} className={`chip ${f.group === g ? "on" : ""}`} onClick={() => f.setGroup(g)}>
            {g ? MUSCLE_LABEL[lang][g] : t("all")}
          </button>
        ))}
      </div>
    </>
  );
}

export function ExerciseTile({ e, onClick }: { e: Exercise; onClick?: () => void }) {
  const lang = useLang();
  const inner = (
    <>
      <div className="pic"><span className="tile-num">#{e.number}</span><Fig fig={e.fig} period={e.secondsPerRep} /></div>
      <div className="t">{exName(lang, e)}</div>
      <div className="s">{DIFF_LABEL[lang][e.difficulty]}{e.bilateral ? ` · ${lang === "ru" ? "две стороны" : "both sides"}` : ""}</div>
    </>
  );
  return onClick ? <button className="tile" onClick={onClick}>{inner}</button> : <Link to={`/exercise/${e.id}`} className="tile">{inner}</Link>;
}

export function ExercisesScreen() {
  const t = useT();
  const f = useExerciseFilter();
  return (
    <div className="wrap" style={{ ["--acc" as string]: LEVEL_ACC.beginner }}>
      <TopBar title={t("tabExercises")} />
      <ExerciseFilters f={f} />
      {f.list.length ? <div className="grid">{f.list.map((e) => <ExerciseTile key={e.id} e={e} />)}</div> : <p className="muted">{t("nothingFound")}</p>}
    </div>
  );
}

export function ExerciseDetailScreen() {
  const { id = "" } = useParams();
  const t = useT();
  const lang = useLang();
  const e = EXERCISE_BY_ID[id];
  if (!e) return (<div className="wrap"><TopBar title={t("notFound")} back /></div>);
  return (
    <div className="wrap" style={{ ["--acc" as string]: LEVEL_ACC[e.difficulty] }}>
      <TopBar title={`# ${e.number}`} back />
      <div className="bigpic"><Fig fig={e.fig} period={e.secondsPerRep} /></div>
      <h2 className="ex-title">{exName(lang, e)}</h2>
      {e.nameEn !== e.name && <p className="muted small" style={{ margin: "4px 0 0" }}>{e.name}</p>}
      <div className="tags">
        <span className="tag acc">{DIFF_LABEL[lang][e.difficulty]}</span>
        <span className="tag">{TYPE_LABEL[lang][e.type]}</span>
        <span className="tag">{t("equipment")}: {e.equipment.map((q) => EQUIPMENT_LABEL[lang][q]).join(", ")}</span>
        {e.bilateral && <span className="tag">{lang === "ru" ? "Две стороны" : "Both sides"}</span>}
      </div>
      <p className="lead">{e.description}</p>
      <div className="section-t">{t("instructions")}</div>
      <ol className="steps">{e.instructions.map((s, i) => <li key={i}>{s}</li>)}</ol>
      <div className="section-t">{t("mistakes")}</div>
      <ul className="steps">{e.commonMistakes.map((s, i) => <li key={i}>{s}</li>)}</ul>
      <div className="section-t">{t("muscles")}</div>
      <div className="tags">{e.muscles.map((m) => <span key={m} className="tag">{MUSCLE_LABEL[lang][m]}</span>)}</div>
    </div>
  );
}
