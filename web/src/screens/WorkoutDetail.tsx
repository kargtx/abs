import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Confirm, MusicPicker, TopBar } from "../components/ui";
import { Fig } from "../components/Fig";
import { IconRest, IconRight } from "../components/Icons";
import { EXERCISE_BY_ID } from "../data/exercises";
import { MUSIC_BY_ID, NO_MUSIC } from "../data/music";
import { durationMin, fmtClock } from "../lib/duration";
import { unlockAudio } from "../lib/audio";
import { LEVEL_LABEL, exName, useLang, useT } from "../lib/i18n";
import { findWorkout, useStore } from "../lib/store";
import { accOf } from "./Workouts";

export function useWorkoutMusic(workoutId: string, fallback: string) {
  const map = useStore((s) => s.settings.workoutMusic);
  return map[workoutId] ?? fallback;
}

export function WorkoutDetailScreen() {
  const { id = "" } = useParams();
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const user = useStore((s) => s.userWorkouts);
  const sessions = useStore((s) => s.sessions);
  const w = findWorkout(id, user);
  const setWorkoutMusic = useStore((s) => s.setWorkoutMusic);
  const copyToUser = useStore((s) => s.copyToUser);
  const deleteUserWorkout = useStore((s) => s.deleteUserWorkout);
  const musicId = useWorkoutMusic(id, w?.defaultMusicId ?? NO_MUSIC);
  const [picker, setPicker] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  if (!w) return (<div className="wrap"><TopBar title={t("notFound")} back /></div>);

  const isUser = w.source === "user";
  const acc = accOf(w);
  const musicName = musicId === NO_MUSIC ? t("noMusic") : MUSIC_BY_ID[musicId]?.name ?? t("noMusic");
  const exCount = w.steps.filter((s) => s.kind === "exercise").length;
  const restTotal = w.steps.filter((s) => s.kind === "rest").reduce((a, s) => a + s.value, 0);
  const done = sessions.filter((s) => s.workoutId === w.id).length;

  const customize = () => {
    if (isUser) return nav(`/builder/${w.id}`);
    const copy = copyToUser(w);
    nav(`/builder/${copy.id}`);
  };

  return (
    <div className="wrap" style={{ ["--acc" as string]: acc }}>
      <TopBar
        title={w.name}
        back
        right={
          <button className="btn sm ghost" onClick={customize}>{isUser ? t("edit") : t("customize")}</button>
        }
      />
      <div className="hero">
        <div className="stats" style={{ marginTop: 0 }}>
          <div className="stat"><b>{durationMin(w)} {t("min")}</b><span>{t("durationL")}</span></div>
          <div className="stat"><b>{exCount}</b><span>{t("exercisesL")}</span></div>
          <div className="stat"><b>{fmtClock(restTotal)}</b><span>{t("restL")}</span></div>
        </div>
        <div className="muted small" style={{ marginTop: 10 }}>
          {isUser ? t("myWorkouts") : LEVEL_LABEL[lang][w.difficulty]}{done ? ` · ${t("completed")}: ${done}` : ""}
        </div>
      </div>
      {w.description && <p className="muted lead">{w.description}</p>}

      <button className="setrow wide-row" onClick={() => setPicker(true)}>
        <span>{t("music")}: <b>{musicName}</b></span>
        <span className="acc-text small">{t("change")}</span>
      </button>

      <div className="section-t">{t("steps")}</div>
      {w.steps.map((st, i) => {
        if (st.kind === "rest") {
          return (
            <div key={i} className="card rest-card">
              <div className="thumb rest-thumb"><IconRest size={24} /></div>
              <div className="body"><div className="t">{t("rest")}</div><div className="s">{st.value} {t("seconds")}</div></div>
            </div>
          );
        }
        const ex = EXERCISE_BY_ID[st.exerciseId!];
        const val = st.mode === "time" ? `${st.value} ${t("seconds")}` : `×${st.value}`;
        const side = ex.bilateral ? (st.mode === "time" ? ` · ${t("halfPerSide", { n: Math.round(st.value / 2) })}` : ` · ${t("perSide")}`) : "";
        return (
          <Link key={i} to={`/exercise/${ex.id}`} className="card">
            <div className="thumb"><Fig fig={ex.fig} color={acc} period={ex.secondsPerRep} /></div>
            <div className="body"><div className="t">{exName(lang, ex)}</div><div className="s">{val}{side}</div></div>
            <span className="chev"><IconRight size={18} /></span>
          </Link>
        );
      })}
      {isUser && <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => setConfirmDel(true)}>{t("delete")}</button>}

      <div className="sticky"><button className="btn" onClick={() => { unlockAudio(); nav(`/play/${w.id}`); }}>{t("startWorkout")}</button></div>

      {picker && <MusicPicker current={musicId} onClose={() => setPicker(false)} onSelect={(m) => { setWorkoutMusic(w.id, m); setPicker(false); }} />}
      {confirmDel && (
        <Confirm text={t("deleteWorkoutQ")} okLabel={t("delete")} danger onCancel={() => setConfirmDel(false)}
          onOk={() => { deleteUserWorkout(w.id); nav("/mine", { replace: true }); }} />
      )}
    </div>
  );
}
