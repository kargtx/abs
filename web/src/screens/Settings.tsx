import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Confirm, Stepper, Toggle, TopBar, useUi } from "../components/ui";
import { IconRight } from "../components/Icons";
import { useLang, useT } from "../lib/i18n";
import { DEFAULT_SETTINGS, useStore } from "../lib/store";
import { unlockAudio, beep, configureVoice, currentVoice, listVoices, speak } from "../lib/audio";

const VERSION = "0.2.0";
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, +v.toFixed(2)));

function useVoices() {
  const [voices, setVoices] = useState(listVoices());
  useEffect(() => {
    const upd = () => setVoices(listVoices());
    upd();
    try { speechSynthesis.addEventListener("voiceschanged", upd); } catch { /* нет синтеза речи */ }
    return () => { try { speechSynthesis.removeEventListener("voiceschanged", upd); } catch { /* */ } };
  }, []);
  return voices;
}

function useApplyVoice() {
  const s = useStore((st) => st.settings);
  const lang = useLang();
  return () => configureVoice({ volume: s.voiceVolume, enabled: true, beeps: true, lang, uri: s.voiceURI, rate: s.rate, pitch: s.pitch });
}

export function SettingsScreen() {
  const t = useT();
  const lang = useLang();
  const s = useStore((st) => st.settings);
  const set = useStore((st) => st.setSettings);
  const clearHistory = useStore((st) => st.clearHistory);
  const toast = useUi((st) => st.showToast);
  const [confirm, setConfirm] = useState<null | "history" | "reset">(null);
  useVoices();
  const apply = useApplyVoice();
  const voice = currentVoice(s.voiceURI, lang === "ru" ? "ru-RU" : "en-US");
  const tempoLabel = s.tempo === 1 ? t("normal") : `×${(1 / s.tempo).toFixed(1)}`;

  const testVoice = () => {
    unlockAudio();
    apply();
    beep();
    speak(lang === "ru" ? "Приготовьтесь. Брюшное скручивание. Раз. Два. Три." : "Get ready. Crunch. One. Two. Three.", { force: true });
  };

  const supportHref = `mailto:support@example.com?subject=${encodeURIComponent(`Пресс ${VERSION}`)}&body=${encodeURIComponent(
    `\n\n---\nВерсия: ${VERSION}\nБраузер: ${navigator.userAgent}`,
  )}`;

  return (
    <div className="wrap">
      <TopBar title={t("tabSettings")} />

      <div className="section-t" style={{ marginTop: 0 }}>{t("voiceAndCount")}</div>
      <Toggle label={t("voiceHints")} checked={s.voiceHints} onChange={(v) => set({ voiceHints: v })} />
      <Toggle label={t("countAloud")} checked={s.count} onChange={(v) => set({ count: v })} />
      <div className="setrow">
        <span>{t("countTempo")}</span>
        <Stepper value={tempoLabel} onDec={() => set({ tempo: clamp(s.tempo + 0.1, 0.5, 2) })} onInc={() => set({ tempo: clamp(s.tempo - 0.1, 0.5, 2) })} />
      </div>
      <Toggle label={t("beeps")} checked={s.beeps} onChange={(v) => set({ beeps: v })} />
      <Link to="/voices" className="setrow">
        <span>{t("voice")}</span>
        <span className="muted small">{voice?.name ?? t("byDefault")} ›</span>
      </Link>
      <div className="setrow">
        <span>{t("speechRate")}</span>
        <Stepper value={s.rate.toFixed(1)} onDec={() => set({ rate: clamp(s.rate - 0.1, 0.6, 1.6) })} onInc={() => set({ rate: clamp(s.rate + 0.1, 0.6, 1.6) })} />
      </div>
      <div className="setrow">
        <span>{t("pitch")}</span>
        <Stepper value={s.pitch.toFixed(1)} onDec={() => set({ pitch: clamp(s.pitch - 0.1, 0.5, 2) })} onInc={() => set({ pitch: clamp(s.pitch + 0.1, 0.5, 2) })} />
      </div>
      <div className="setrow col">
        <span>{t("voiceVolume")}</span>
        <input type="range" min={0} max={1} step={0.05} value={s.voiceVolume} onChange={(e) => set({ voiceVolume: Number(e.target.value) })} aria-label={t("voiceVolume")} />
      </div>
      <button className="btn ghost" onClick={testVoice}>{t("testVoice")}</button>

      <div className="section-t">{t("workoutSection")}</div>
      <div className="setrow">
        <span>{t("prep")}</span>
        <Stepper value={`${s.prep} ${t("seconds")}`} onDec={() => set({ prep: Math.max(3, s.prep - 5) })} onInc={() => set({ prep: Math.min(30, s.prep + 5) })} />
      </div>
      <div className="setrow">
        <span>{t("defaultRest")}</span>
        <Stepper value={`${s.defaultRest} ${t("seconds")}`} onDec={() => set({ defaultRest: Math.max(5, s.defaultRest - 5) })} onInc={() => set({ defaultRest: Math.min(90, s.defaultRest + 5) })} />
      </div>
      <div className="setrow col">
        <span>{t("musicVolume")}</span>
        <input type="range" min={0} max={1} step={0.05} value={s.musicVolume} onChange={(e) => set({ musicVolume: Number(e.target.value) })} aria-label={t("musicVolume")} />
      </div>
      <div className="setrow">
        <span>{t("weight")}</span>
        <Stepper value={`${s.weightKg} ${t("kg")}`} onDec={() => set({ weightKg: Math.max(30, s.weightKg - 1) })} onInc={() => set({ weightKg: Math.min(250, s.weightKg + 1) })} />
      </div>

      <div className="section-t">{t("language")}</div>
      <div className="chips">
        <button className={`chip ${s.language === "ru" ? "on" : ""}`} onClick={() => set({ language: "ru" })}>Русский</button>
        <button className={`chip ${s.language === "en" ? "on" : ""}`} onClick={() => set({ language: "en" })}>English</button>
      </div>

      <div className="section-t">{t("data")}</div>
      <p className="muted small lead">{t("dataNote")}</p>
      <button className="btn ghost" onClick={() => setConfirm("history")}>{t("clearHistory")}</button>
      <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => setConfirm("reset")}>{t("resetAll")}</button>

      <div className="section-t">{t("support")}</div>
      <a href={supportHref} className="setrow">{t("writeSupport")} <IconRight size={18} /></a>
      <Link to="/info/privacy" className="setrow">{t("privacy")} <IconRight size={18} /></Link>
      <Link to="/info/terms" className="setrow">{t("terms")} <IconRight size={18} /></Link>
      <p className="muted small" style={{ textAlign: "center" }}>{t("appName")} {VERSION}</p>

      {confirm === "history" && (
        <Confirm text={t("clearHistoryQ")} okLabel={t("delete")} danger onCancel={() => setConfirm(null)}
          onOk={() => { clearHistory(); setConfirm(null); toast(t("historyCleared")); }} />
      )}
      {confirm === "reset" && (
        <Confirm text={t("resetQ")} okLabel={t("delete")} danger onCancel={() => setConfirm(null)}
          onOk={() => { useStore.setState({ settings: { ...DEFAULT_SETTINGS }, userWorkouts: [], sessions: [], userPlan: null }); setConfirm(null); }} />
      )}
    </div>
  );
}

export function VoicesScreen() {
  const t = useT();
  const lang = useLang();
  const voices = useVoices();
  const s = useStore((st) => st.settings);
  const set = useStore((st) => st.setSettings);
  const cur = currentVoice(s.voiceURI, lang === "ru" ? "ru-RU" : "en-US");
  const pre = lang === "ru" ? "ru" : "en";
  const mine = voices.filter((v) => v.lang.toLowerCase().startsWith(pre));
  const other = voices.filter((v) => !v.lang.toLowerCase().startsWith(pre));

  const pick = (uri: string) => {
    set({ voiceURI: uri });
    unlockAudio();
    configureVoice({ volume: s.voiceVolume, enabled: true, beeps: true, lang, uri, rate: s.rate, pitch: s.pitch });
    speak(lang === "ru" ? "Приготовьтесь. Брюшное скручивание. Раз. Два. Три." : "Get ready. Crunch. One. Two. Three.", { force: true });
  };
  const row = (v: SpeechSynthesisVoice) => (
    <button key={v.voiceURI} className="card" onClick={() => pick(v.voiceURI)}>
      <div className="body"><div className="t">{v.name}</div><div className="s">{v.lang}{v.localService ? "" : ` · ${t("online")}`}</div></div>
      {cur?.voiceURI === v.voiceURI ? <span className="done-badge">✓</span> : <span className="chev">▶</span>}
    </button>
  );
  return (
    <div className="wrap">
      <TopBar title={t("voice")} back />
      <p className="muted small lead" style={{ marginTop: -6 }}>{t("voicesNote")}</p>
      {!voices.length && <p className="muted">{t("noVoices")}</p>}
      {mine.length > 0 && <><div className="section-t">{lang === "ru" ? "Русские" : "English"}</div>{mine.map(row)}</>}
      {other.length > 0 && <><div className="section-t">{t("otherLangs")}</div>{other.map(row)}</>}
    </div>
  );
}

const INFO: Record<string, { title: string; body: string[] }> = {
  privacy: {
    title: "Политика конфиденциальности",
    body: [
      "Приложение работает без аккаунта и без оплаты: свои тренировки, история и настройки хранятся только в этом браузере (localStorage) и никуда не передаются.",
      "Приложение не использует аналитику, рекламу, геолокацию, контакты и камеру.",
      "Удалить все данные можно в «Настройки → Данные → Сбросить все данные».",
    ],
  },
  terms: {
    title: "Условия использования",
    body: [
      "Тренировки носят общий характер и не заменяют консультацию врача. При боли, головокружении или дискомфорте прекратите упражнение.",
      "Оценка калорий приблизительная и рассчитывается по MET-модели.",
    ],
  },
};

export function InfoScreen() {
  const { page = "" } = useParams();
  const info = INFO[page];
  if (!info) return <Navigate to="/settings" replace />;
  return (
    <div className="wrap">
      <TopBar title={info.title} back />
      {info.body.map((p, i) => <p key={i} className="lead">{p}</p>)}
    </div>
  );
}
