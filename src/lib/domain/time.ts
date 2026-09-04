import type { Settings, TimeEntry, WorkSchedule } from "@/lib/db/types";
import { hmToMinutes, listDays, monthRange, weekdayOf } from "./dates";

export const DEFAULT_SCHEDULE: WorkSchedule = {
  weekdays: [1, 2, 3, 4, 5],
  periods: [
    { start: "08:00", end: "11:00" },
    { start: "15:00", end: "18:00" },
  ],
};

export function scheduleFor(settings: Settings, override?: WorkSchedule | null): WorkSchedule {
  return override && override.periods.length > 0 ? override : settings.schedule ?? DEFAULT_SCHEDULE;
}

export function expectedMinutesPerDay(schedule: WorkSchedule): number {
  return schedule.periods.reduce((acc, p) => acc + Math.max(0, hmToMinutes(p.end) - hmToMinutes(p.start)), 0);
}

export function isWorkingDay(date: string, schedule: WorkSchedule, holidays: string[]): boolean {
  return schedule.weekdays.includes(weekdayOf(date)) && !holidays.includes(date);
}

/** Dias úteis de uma competência, respeitando admissão e desligamento. */
export function workingDaysOfMonth(
  competence: string,
  schedule: WorkSchedule,
  holidays: string[],
  bounds?: { admissionDate?: string; terminationDate?: string }
): string[] {
  const { start, end } = monthRange(competence);
  return listDays(start, end).filter((d) => {
    if (bounds?.admissionDate && d < bounds.admissionDate) return false;
    if (bounds?.terminationDate && d > bounds.terminationDate) return false;
    return isWorkingDay(d, schedule, holidays);
  });
}

export interface DayComputation {
  workedMinutes: number;
  expectedMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
}

/**
 * Calcula minutos trabalhados, atraso e saída antecipada de um dia.
 * Regra simples e transparente: soma dos períodos (entrada→saída) menos intervalo informado.
 * Atraso = primeira entrada depois do início do primeiro período (acima da tolerância).
 * Saída antecipada = última saída antes do fim do último período.
 */
export function computeDay(
  periods: { in: string; out?: string }[],
  breakMinutes: number,
  schedule: WorkSchedule,
  lateTolerance: number,
  status: TimeEntry["status"],
  isWorking: boolean
): DayComputation {
  const expected = isWorking ? expectedMinutesPerDay(schedule) : 0;
  if (status !== "present") {
    return { workedMinutes: 0, expectedMinutes: expected, lateMinutes: 0, earlyLeaveMinutes: 0 };
  }
  const closed = periods.filter((p) => p.in && p.out);
  let worked = closed.reduce((acc, p) => acc + Math.max(0, hmToMinutes(p.out!) - hmToMinutes(p.in)), 0);
  worked = Math.max(0, worked - (breakMinutes || 0));

  let late = 0;
  let early = 0;
  if (isWorking && schedule.periods.length > 0 && periods.length > 0) {
    const firstIn = Math.min(...periods.map((p) => hmToMinutes(p.in)));
    const schedStart = hmToMinutes(schedule.periods[0].start);
    if (firstIn - schedStart > lateTolerance) late = firstIn - schedStart;
    const outs = closed.map((p) => hmToMinutes(p.out!));
    if (outs.length > 0 && closed.length === periods.length) {
      const lastOut = Math.max(...outs);
      const schedEnd = hmToMinutes(schedule.periods[schedule.periods.length - 1].end);
      if (schedEnd - lastOut > lateTolerance) early = schedEnd - lastOut;
    }
  }
  return { workedMinutes: worked, expectedMinutes: expected, lateMinutes: late, earlyLeaveMinutes: early };
}

export interface MonthSummary {
  competence: string;
  workingDays: string[];
  expectedMinutes: number;
  workedMinutes: number;
  deltaMinutes: number;
  absences: number;
  justifiedAbsences: number;
  lateCount: number;
  earlyLeaveCount: number;
  presentDays: number;
  extraMinutes: number;
  missingMinutes: number;
}

export function summarizeMonth(
  competence: string,
  entries: TimeEntry[],
  schedule: WorkSchedule,
  holidays: string[],
  bounds: { admissionDate?: string; terminationDate?: string },
  todayIso: string
): MonthSummary {
  const workingDays = workingDaysOfMonth(competence, schedule, holidays, bounds);
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const perDay = expectedMinutesPerDay(schedule);
  let expected = 0;
  let worked = 0;
  let absences = 0;
  let justified = 0;
  let lateCount = 0;
  let earlyCount = 0;
  let presentDays = 0;

  for (const d of workingDays) {
    const e = byDate.get(d);
    if (e?.status === "off") continue; // folga concedida não conta como prevista
    expected += perDay;
    if (!e) {
      if (d < todayIso) absences++;
      continue;
    }
    if (e.status === "absent") absences++;
    else if (e.status === "justified") justified++;
    else if (e.status === "present") {
      presentDays++;
      worked += e.workedMinutes;
      if (e.lateMinutes > 0) lateCount++;
      if (e.earlyLeaveMinutes > 0) earlyCount++;
    }
  }
  // Horas registradas em dias não previstos (ex.: sábado) também contam como trabalhadas.
  for (const e of entries) {
    if (!workingDays.includes(e.date) && e.status === "present") {
      worked += e.workedMinutes;
      presentDays++;
    }
  }
  const delta = worked - expected;
  return {
    competence,
    workingDays,
    expectedMinutes: expected,
    workedMinutes: worked,
    deltaMinutes: delta,
    absences,
    justifiedAbsences: justified,
    lateCount,
    earlyLeaveCount: earlyCount,
    presentDays,
    extraMinutes: Math.max(0, delta),
    missingMinutes: Math.max(0, -delta),
  };
}
