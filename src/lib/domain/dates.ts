export const DEFAULT_TZ = "America/Sao_Paulo";

/** Data de hoje (YYYY-MM-DD) no fuso da instituição. */
export function todayISO(tz = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Hora atual (HH:mm) no fuso da instituição. */
export function nowHM(tz = DEFAULT_TZ): string {
  const parts = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h === "24" ? "00" : h}:${m}`;
}

export function currentCompetence(tz = DEFAULT_TZ): string {
  return todayISO(tz).slice(0, 7);
}

export function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesToHM(total: number): string {
  const sign = total < 0 ? "-" : "";
  const abs = Math.abs(Math.round(total));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${m.toString().padStart(2, "0")}`;
}

export function minutesToClock(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Dia da semana (0=domingo) de uma data ISO, sem depender do fuso local. */
export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function daysInMonth(competence: string): number {
  const [y, m] = competence.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthRange(competence: string): { start: string; end: string } {
  return { start: `${competence}-01`, end: `${competence}-${daysInMonth(competence).toString().padStart(2, "0")}` };
}

export function addMonths(competence: string, delta: number): string {
  const [y, m] = competence.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return dt.toISOString().slice(0, 7);
}

export function listDays(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function startOfWeek(iso: string): string {
  // Semana começando na segunda-feira
  const wd = weekdayOf(iso);
  const diff = wd === 0 ? -6 : 1 - wd;
  return addDays(iso, diff);
}

export function ageFrom(birthISO: string | undefined, todayIso = todayISO()): number | null {
  if (!birthISO) return null;
  const [by, bm, bd] = birthISO.split("-").map(Number);
  const [ty, tm, td] = todayIso.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age--;
  return age;
}

export function isoToBR(iso?: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export function competenceLabel(competence: string): string {
  const [y, m] = competence.split("-").map(Number);
  return `${MONTHS[m - 1]}/${y}`;
}
export function monthName(m: number) {
  return MONTHS[m - 1];
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export function weekdayLabel(iso: string, short = false): string {
  const w = WEEKDAYS[weekdayOf(iso)];
  return short ? w.slice(0, 3) : w;
}

export function formatDateTime(ms: number, tz = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, dateStyle: "short", timeStyle: "short" }).format(new Date(ms));
}
