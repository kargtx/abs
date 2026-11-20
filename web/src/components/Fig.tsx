import { useEffect, useRef } from "react";
import { FIGURES, type Pose, type Pt } from "../data/figures";
import type { Difficulty } from "../lib/types";

/** Цвет акцента по уровню. */
export const LEVEL_ACC: Record<Difficulty | "mine", string> = {
  beginner: "var(--six)",
  intermediate: "var(--mid)",
  advanced: "var(--insane)",
  mine: "var(--mine)",
};

interface Entry {
  fig: string;
  period: number;
  clock?: () => number | null;
  still?: boolean;
  els: { tor: SVGPolylineElement; l1: SVGPolylineElement; l2: SVGPolylineElement; arm: SVGPolylineElement; hd: SVGCircleElement };
}

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const pts = (a: Pt[]) => a.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

function draw(e: Entry, t: number) {
  const f = FIGURES[e.fig] ?? FIGURES.crunch;
  const A = f.A;
  const B = f.B;
  const P = {} as Record<keyof Pose, Pt>;
  for (const k of ["h", "s", "p", "k1", "f1", "e", "w"] as const) P[k] = lerp(A[k], B[k], t);
  P.k2 = lerp(A.k2 ?? A.k1, B.k2 ?? B.k1, t);
  P.f2 = lerp(A.f2 ?? A.f1, B.f2 ?? B.f1, t);
  e.els.tor.setAttribute("points", pts([P.s, P.p]));
  e.els.l1.setAttribute("points", pts([P.p, P.k1, P.f1]));
  e.els.l2.setAttribute("points", pts([P.p, P.k2, P.f2]));
  e.els.arm.setAttribute("points", pts([P.s, P.e, P.w]));
  e.els.hd.setAttribute("cx", P.h[0].toFixed(1));
  e.els.hd.setAttribute("cy", P.h[1].toFixed(1));
}

// Один общий цикл анимации для всех фигурок на странице.
const registry = new Set<Entry>();
let running = false;
const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function loop(ts: number) {
  registry.forEach((e) => {
    if (e.still || reduced) return;
    const c = e.clock ? e.clock() : ts / 1000;
    if (c == null) return draw(e, 0);
    draw(e, (1 - Math.cos((c / e.period) * Math.PI * 2)) / 2);
  });
  if (registry.size) requestAnimationFrame(loop);
  else running = false;
}

/**
 * Анимированная фигурка упражнения.
 * period — секунд на повтор; clock — внешние часы (секунды от начала шага), null — фигурка замирает.
 */
export function Fig({ fig, color = "var(--acc)", period = 2, clock, still, className = "" }: {
  fig: string; color?: string; period?: number; clock?: () => number | null; still?: boolean; className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const entry = useRef<Entry>();
  if (entry.current) Object.assign(entry.current, { fig, period, clock, still });

  useEffect(() => {
    const svg = ref.current!;
    const q = <T extends Element>(s: string) => svg.querySelector(s) as T;
    const e: Entry = {
      fig, period, clock, still,
      els: { tor: q(".tor"), l1: q(".l1"), l2: q(".l2"), arm: q(".arm"), hd: q(".hd") },
    };
    entry.current = e;
    draw(e, still || reduced ? 0.5 : 0);
    registry.add(e);
    if (!running) { running = true; requestAnimationFrame(loop); }
    return () => { registry.delete(e); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (entry.current && (still || reduced)) draw(entry.current, 0.5); }, [fig, still]);

  return (
    <svg ref={ref} className={`fig ${className}`} viewBox="0 0 110 95" aria-hidden="true">
      <line x1="4" y1="89" x2="106" y2="89" stroke="currentColor" strokeOpacity=".14" strokeWidth="1.2" strokeLinecap="round" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <polyline className="l2" stroke={color} strokeOpacity=".45" strokeWidth="5" />
        <polyline className="tor" stroke="var(--text)" strokeWidth="6" />
        <polyline className="l1" stroke={color} strokeWidth="5" />
        <polyline className="arm" stroke="var(--text)" strokeWidth="4.2" />
      </g>
      <circle className="hd" r="5.6" fill="var(--text)" />
    </svg>
  );
}
