import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MusicPicker, Sheet, Stepper, TopBar, useUi } from "../components/ui";
import { Fig, LEVEL_ACC } from "../components/Fig";
import { IconCopy, IconRest, IconTrash, IconUp } from "../components/Icons";
import { EXERCISE_BY_ID } from "../data/exercises";
import { MUSIC_BY_ID, NO_MUSIC } from "../data/music";
import { durationMin, fmtClock, totalSeconds } from "../lib/duration";
import { exName, useLang, useT } from "../lib/i18n";
import { useStore } from "../lib/store";
import { uid } from "../lib/date";
import type { Step, Workout } from "../lib/types";
import { ExerciseFilters, ExerciseTile, useExerciseFilter } from "./Exercises";

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function ExercisePicker({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const t = useT();
  const f = useExerciseFilter();
  return (
    <Sheet title={t("chooseExercise")} onClose={onClose}>
      <ExerciseFilters f={f} />
      <div className="grid">{f.list.map((e) => <ExerciseTile key={e.id} e={e} onClick={() => onPick(e.id)} />)}</div>
    </Sheet>
  );
}

export function BuilderScreen() {
  const { id = "new" } = useParams();
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const existing = useStore((s) => s.userWorkouts.find((w) => w.id === id));
  const count = useStore((s) => s.userWorkouts.length);
  const defaultRest = useStore((s) => s.settings.defaultRest);
  const save = useStore((s) => s.saveUserWorkout);
  const setWorkoutMusic = useStore((s) => s.setWorkoutMusic);
  const toast = useUi((s) => s.showToast);

  const [w, setW] = useState<Workout>(
    () =>
      existing ?? {
        id: "u-" + uid(),
        name: `${t("untitled")} ${count + 1}`,
        description: "",
        difficulty: "beginner",
        steps: [
          { kind: "exercise", exerciseId: "crunch", mode: "reps", value: 15 },
          { kind: "rest", mode: "time", value: defaultRest },
          { kind: "exercise", exerciseId: "plank", mode: "time", value: 30 },
        ],
        defaultMusicId: "chill",
        source: "user",
        hue: Math.floor(Math.random() * 360),
      },
  );
  const [picker, setPicker] = useState<null | { replace?: number }>(null);
  const [musicOpen, setMusicOpen] = useState(false);

  const setSteps = (steps: Step[]) => setW({ ...w, steps });
  const patch = (i: number, p: Partial<Step>) => setSteps(w.steps.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const bump = (i: number, d: number) => {
    const s = w.steps[i];
    patch(i, { value: s.mode === "reps" ? clamp(s.value + d, 1, 200) : clamp(s.value + d * 5, 5, 600) });
  };
  const move = (i: number) => {
    if (i === 0) return;
    const s = w.steps.slice();
    [s[i - 1], s[i]] = [s[i], s[i - 1]];
    setSteps(s);
  };

  const onSave = () => {
    if (!w.steps.some((s) => s.kind === "exercise")) return toast(t("needSteps"));
    save({ ...w, name: w.name.trim() || t("untitled") });
    setWorkoutMusic(w.id, w.defaultMusicId);
    toast(t("saved"));
    nav(`/workout/${w.id}`, { replace: true });
  };

  return (
    <div className="wrap" style={{ ["--acc" as string]: LEVEL_ACC.mine }}>
      <TopBar title={existing ? t("builderEdit") : t("builderNew")} back />
      <div className="field">
        <label htmlFor="wname">{t("name")}</label>
        <input id="wname" value={w.name} maxLength={40} onChange={(e) => setW({ ...w, name: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="wdesc">{t("description")}</label>
        <input id="wdesc" value={w.description} maxLength={200} onChange={(e) => setW({ ...w, description: e.target.value })} />
      </div>
      <button className="setrow wide-row" onClick={() => setMusicOpen(true)}>
        <span>{t("music")}</span>
        <span className="muted small">{w.defaultMusicId === NO_MUSIC ? t("noMusic") : MUSIC_BY_ID[w.defaultMusicId]?.name} ›</span>
      </button>

      <div className="section-t">{t("steps")} · {fmtClock(totalSeconds(w.steps))} ≈ {durationMin(w)} {t("min")}</div>
      {w.steps.map((st, i) => {
        const ex = st.exerciseId ? EXERCISE_BY_ID[st.exerciseId] : undefined;
        return (
          <div key={i} className={`card bstep ${st.kind === "rest" ? "rest-card" : ""}`}>
            {st.kind === "rest" ? (
              <div className="thumb rest-thumb"><IconRest size={24} /></div>
            ) : (
              <button className="thumb" onClick={() => setPicker({ replace: i })} aria-label={t("chooseExercise")}><Fig fig={ex!.fig} still /></button>
            )}
            <div className="body">
              <div className="t">{st.kind === "rest" ? t("rest") : exName(lang, ex!)}</div>
              <div className="row">
                <Stepper value={st.mode === "reps" ? `×${st.value}` : `${st.value} ${t("seconds")}`} onDec={() => bump(i, -1)} onInc={() => bump(i, 1)} />
                {st.kind === "exercise" && (
                  <button className="chip sm" onClick={() => patch(i, st.mode === "reps" ? { mode: "time", value: 30 } : { mode: "reps", value: 12 })}>
                    {st.mode === "reps" ? t("toTime") : t("toReps")}
                  </button>
                )}
              </div>
            </div>
            <div className="bactions">
              <button className="x" onClick={() => move(i)} disabled={i === 0} aria-label={t("up")}><IconUp size={16} /></button>
              <button className="x" onClick={() => setSteps([...w.steps.slice(0, i + 1), { ...st }, ...w.steps.slice(i + 1)])} aria-label={t("duplicate")}><IconCopy size={16} /></button>
              <button className="x" onClick={() => setSteps(w.steps.filter((_, j) => j !== i))} aria-label={t("delete")}><IconTrash size={16} /></button>
            </div>
          </div>
        );
      })}
      <div className="row" style={{ margin: "6px 0 12px" }}>
        <button className="btn ghost" onClick={() => setPicker({})}>+ {t("addExercise")}</button>
        <button className="btn ghost" onClick={() => setSteps([...w.steps, { kind: "rest", mode: "time", value: defaultRest }])}>+ {t("addRest")}</button>
      </div>
      {w.steps.length > 0 && (
        <button className="btn ghost" style={{ marginBottom: 12 }} onClick={() => setSteps([...w.steps, { kind: "rest", mode: "time", value: defaultRest }, ...w.steps.map((s) => ({ ...s }))])}>
          {t("repeatBlock")}
        </button>
      )}
      <button className="btn" onClick={onSave}>{t("save")}</button>

      {picker && (
        <ExercisePicker
          onClose={() => setPicker(null)}
          onPick={(exId) => {
            const isStatic = EXERCISE_BY_ID[exId]?.isStatic;
            if (picker.replace != null) patch(picker.replace, isStatic ? { exerciseId: exId, mode: "time", value: 30 } : { exerciseId: exId });
            else setSteps([...w.steps, { kind: "exercise", exerciseId: exId, mode: isStatic ? "time" : "reps", value: isStatic ? 30 : 12 }]);
            setPicker(null);
          }}
        />
      )}
      {musicOpen && <MusicPicker current={w.defaultMusicId} onClose={() => setMusicOpen(false)} onSelect={(m) => { setW({ ...w, defaultMusicId: m }); setMusicOpen(false); }} />}
    </div>
  );
}
