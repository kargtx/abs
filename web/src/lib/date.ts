export const pad = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** 1 = понедельник … 7 = воскресенье. */
export function isoWeekday(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1;
}

/** Ближайший понедельник: сегодня, если сегодня понедельник, иначе следующий. */
export function nearestMonday(from: Date = new Date()): Date {
  const wd = isoWeekday(from);
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return wd === 1 ? d : addDays(d, 8 - wd);
}

export function startOfWeek(d: Date): Date {
  return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), 1 - isoWeekday(d));
}

/** Ячейки месячной сетки (пн–вс), 6 недель по 7 дней. */
export function monthGrid(year: number, month: number): Date[] {
  const first = startOfWeek(new Date(year, month, 1));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export const todayISO = () => toISO(new Date());

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
