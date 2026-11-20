import { useEffect, useRef, useState, type ReactNode } from "react";
import { create } from "zustand";
import { useNavigate } from "react-router-dom";
import { IconBack, IconClose, IconMusic, IconPlay, IconStar, IconStop } from "./Icons";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/store";
import { MUSIC, NO_MUSIC } from "../data/music";
import { music, unlockAudio } from "../lib/audio";

/* ---------- тосты ---------- */

interface UiState {
  toast: string | null;
  showToast: (s: string) => void;
}
export const useUi = create<UiState>((set) => ({
  toast: null,
  showToast: (toast) => {
    set({ toast });
    setTimeout(() => set((s) => (s.toast === toast ? { toast: null } : s)), 2200);
  },
}));

export function Toast() {
  const toast = useUi((s) => s.toast);
  if (!toast) return null;
  return <div className="toast" role="status">{toast}</div>;
}

/* ---------- заголовок экрана ---------- */

export function TopBar({ title, back, right }: { title: string; back?: boolean; right?: ReactNode }) {
  const nav = useNavigate();
  const t = useT();
  return (
    <header className="top">
      {back && (
        <button className="back" onClick={() => (history.length > 1 ? nav(-1) : nav("/"))} aria-label={t("back")}>
          <IconBack size={20} />
        </button>
      )}
      <h1>{title}</h1>
      {right}
    </header>
  );
}

/* ---------- нижний лист ---------- */

export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} ref={ref} tabIndex={-1}>
        <div className="grab" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="x" onClick={onClose} aria-label={t("close")}><IconClose size={20} /></button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ text, okLabel, onOk, onCancel, danger }: { text: string; okLabel: string; onOk: () => void; onCancel: () => void; danger?: boolean }) {
  const t = useT();
  return (
    <div className="modal center" onClick={onCancel}>
      <div className="dialog" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <p>{text}</p>
        <div className="dialog-actions">
          <button className="btn ghost" onClick={onCancel}>{t("cancel")}</button>
          <button className={`btn ${danger ? "danger" : ""}`} onClick={onOk} autoFocus>{okLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- элементы настроек ---------- */

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="setrow">
      <span>{label}</span>
      <button className={`toggle ${checked ? "on" : ""}`} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />
    </div>
  );
}

export function Stepper({ value, onDec, onInc, label }: { value: ReactNode; onDec: () => void; onInc: () => void; label?: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button onClick={onDec} aria-label="−">−</button>
      <b>{value}</b>
      <button onClick={onInc} aria-label="+">+</button>
    </div>
  );
}

/* ---------- выбор музыки ---------- */

export function MusicPicker({ current, onSelect, onClose }: { current: string; onSelect: (id: string) => void; onClose: () => void }) {
  const t = useT();
  const [tab, setTab] = useState<"all" | "fav">("all");
  const [previewing, setPreviewing] = useState<string | null>(null);
  const fav = useStore((s) => s.settings.favoriteMusic);
  const toggleFav = useStore((s) => s.toggleFavoriteMusic);
  const vol = useStore((s) => s.settings.musicVolume);
  const timer = useRef<number>();

  useEffect(() => () => { music.stop(); clearTimeout(timer.current); }, []);

  const preview = (id: string) => {
    clearTimeout(timer.current);
    if (previewing === id) { music.stop(); setPreviewing(null); return; }
    unlockAudio();
    music.start(id, Math.max(0.3, vol));
    setPreviewing(id);
    timer.current = window.setTimeout(() => { music.stop(); setPreviewing(null); }, 20000);
  };

  const list = tab === "all" ? MUSIC : MUSIC.filter((m) => fav.includes(m.id));
  const row = (id: string, name: string, sub?: string, controls = true) => (
    <div key={id} className={`card ${current === id ? "sel" : ""}`}>
      <button className="card-main" onClick={() => onSelect(id)}>
        <div className="num"><IconMusic size={18} /></div>
        <div className="body"><div className="t">{name}</div>{sub && <div className="s">{sub}</div>}</div>
      </button>
      {controls && (
        <>
          <button className="x" onClick={() => preview(id)} aria-label={previewing === id ? t("stop") : t("preview")}>
            {previewing === id ? <IconStop size={18} /> : <IconPlay size={18} />}
          </button>
          <button className={`x star ${fav.includes(id) ? "on" : ""}`} onClick={() => toggleFav(id)} aria-label={t("favorites")} aria-pressed={fav.includes(id)}>
            <IconStar size={18} filled={fav.includes(id)} />
          </button>
        </>
      )}
    </div>
  );
  return (
    <Sheet title={t("music")} onClose={onClose}>
      <div className="chips">
        <button className={`chip ${tab === "all" ? "on" : ""}`} onClick={() => setTab("all")}>{t("all")}</button>
        <button className={`chip ${tab === "fav" ? "on" : ""}`} onClick={() => setTab("fav")}>{t("favorites")}</button>
      </div>
      {tab === "all" && row(NO_MUSIC, t("noMusic"), undefined, false)}
      {list.map((m) => row(m.id, m.name, `${m.genre} · ${m.bpm} BPM`))}
      {tab === "fav" && list.length === 0 && <p className="muted">{t("favEmpty")}</p>}
    </Sheet>
  );
}
