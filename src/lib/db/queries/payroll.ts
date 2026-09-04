import "server-only";
import { cache } from "react";
import { Collections, getDoc, mapDocs } from "../collections";
import { getCollaborator } from "./collaborators";
import { getSettings } from "../settings";
import { scheduleFor, summarizeMonth } from "@/lib/domain/time";
import { computePayroll } from "@/lib/domain/payroll";
import { monthRange, todayISO } from "@/lib/domain/dates";
import type { Collaborator, PayrollMonth, Settings, TimeEntry } from "../types";

export async function timeEntriesOfMonth(collaboratorId: string, competence: string): Promise<TimeEntry[]> {
  const { start, end } = monthRange(competence);
  const snap = await Collections.timeEntries().where("collaboratorId", "==", collaboratorId).where("date", ">=", start).where("date", "<=", end).get();
  return mapDocs(snap).sort((a, b) => a.date.localeCompare(b.date));
}

export function computeMonthFor(c: Collaborator, competence: string, entries: TimeEntry[], settings: Settings) {
  const schedule = scheduleFor(settings, c.schedule);
  return summarizeMonth(competence, entries, schedule, settings.holidays, { admissionDate: c.admissionDate, terminationDate: c.terminationDate ?? undefined }, todayISO(settings.timezone));
}

/** Monta a ficha a partir de dados já carregados (sem consultas). */
function assemble(c: Collaborator, competence: string, stored: PayrollMonth | null, entries: TimeEntry[], settings: Settings, overrides?: { adjustments?: PayrollMonth["adjustments"]; notes?: string }): PayrollMonth {
  const id = `${c.id}_${competence}`;
  if (stored?.frozen) return stored;
  const summary = computeMonthFor(c, competence, entries, settings);
  const adjustments = overrides?.adjustments ?? stored?.adjustments ?? [];
  const calc = computePayroll(c, summary, adjustments);
  const now = Date.now();
  return {
    id, collaboratorId: c.id, collaboratorName: c.name, competence,
    payType: c.payType, salary: c.salary, hourlyRate: c.hourlyRate,
    expectedMinutes: summary.expectedMinutes, workedMinutes: summary.workedMinutes,
    absences: summary.absences, lateCount: summary.lateCount, earlyLeaveCount: summary.earlyLeaveCount,
    referenceHourlyRate: calc.referenceHourlyRate, baseAmount: calc.baseAmount, adjustments,
    calculatedAmount: calc.calculatedAmount, paidAmount: stored?.paidAmount ?? null,
    status: "unpaid", paidAt: null, notes: overrides?.notes ?? stored?.notes, frozen: false, payableId: stored?.payableId ?? null,
    createdAt: stored?.createdAt ?? now, updatedAt: stored?.updatedAt ?? now, updatedBy: stored?.updatedBy ?? "",
  };
}

/** Jornada do mês de todos os colaboradores em uma única consulta (por requisição). */
const monthEntriesAll = cache(async (competence: string): Promise<TimeEntry[]> => {
  const { start, end } = monthRange(competence);
  return mapDocs(await Collections.timeEntries().where("date", ">=", start).where("date", "<=", end).get());
});
/** Fechamentos da competência em uma única consulta (por requisição). */
const payrollStoredAll = cache(async (competence: string): Promise<PayrollMonth[]> => {
  return mapDocs(await Collections.payrollMonths().where("competence", "==", competence).get());
});

/**
 * Fichas mensais de vários colaboradores: 3 consultas no total (jornada do mês,
 * fechamentos da competência e configurações), em vez de 3–4 por colaborador.
 */
export async function buildPayrollMonths(collaborators: Collaborator[], competence: string): Promise<PayrollMonth[]> {
  if (collaborators.length === 0) return [];
  const [entries, stored, settings] = await Promise.all([monthEntriesAll(competence), payrollStoredAll(competence), getSettings()]);
  const storedById = new Map(stored.map((p) => [p.collaboratorId, p]));
  return collaborators.map((c) => assemble(c, competence, storedById.get(c.id) ?? null, entries.filter((e) => e.collaboratorId === c.id), settings));
}

/**
 * Monta a ficha mensal de um colaborador. Se já estiver paga (congelada), devolve o
 * registro salvo; caso contrário recalcula, preservando ajustes/observações salvos.
 */
export async function buildPayrollMonth(
  collaboratorId: string,
  competence: string,
  overrides?: { adjustments?: PayrollMonth["adjustments"]; notes?: string }
): Promise<PayrollMonth | null> {
  const id = `${collaboratorId}_${competence}`;
  const [c, stored, settings, entries] = await Promise.all([getCollaborator(collaboratorId), getDoc(Collections.payrollMonths(), id), getSettings(), timeEntriesOfMonth(collaboratorId, competence)]);
  if (!c) return null;
  return assemble(c, competence, stored, entries, settings, overrides);
}

export async function payrollHistory(collaboratorId: string): Promise<PayrollMonth[]> {
  const snap = await Collections.payrollMonths().where("collaboratorId", "==", collaboratorId).get();
  return mapDocs(snap).sort((a, b) => b.competence.localeCompare(a.competence));
}
