import "server-only";
import { Collections, getDoc, mapDocs } from "../collections";
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

/**
 * Monta a ficha mensal. Se já estiver paga (congelada), devolve o registro salvo.
 * Caso contrário, recalcula com os dados atuais, preservando ajustes/observações salvos.
 */
export async function buildPayrollMonth(
  collaboratorId: string,
  competence: string,
  overrides?: { adjustments?: PayrollMonth["adjustments"]; notes?: string }
): Promise<PayrollMonth | null> {
  const id = `${collaboratorId}_${competence}`;
  const [c, stored, settings] = await Promise.all([getDoc(Collections.collaborators(), collaboratorId), getDoc(Collections.payrollMonths(), id), getSettings()]);
  if (!c) return null;
  if (stored?.frozen) return stored;
  const entries = await timeEntriesOfMonth(collaboratorId, competence);
  const summary = computeMonthFor(c, competence, entries, settings);
  const adjustments = overrides?.adjustments ?? stored?.adjustments ?? [];
  const calc = computePayroll(c, summary, adjustments);
  const now = Date.now();
  return {
    id, collaboratorId, collaboratorName: c.name, competence,
    payType: c.payType, salary: c.salary, hourlyRate: c.hourlyRate,
    expectedMinutes: summary.expectedMinutes, workedMinutes: summary.workedMinutes,
    absences: summary.absences, lateCount: summary.lateCount, earlyLeaveCount: summary.earlyLeaveCount,
    referenceHourlyRate: calc.referenceHourlyRate, baseAmount: calc.baseAmount, adjustments,
    calculatedAmount: calc.calculatedAmount, paidAmount: stored?.paidAmount ?? null,
    status: "unpaid", paidAt: null, notes: overrides?.notes ?? stored?.notes, frozen: false,
    createdAt: stored?.createdAt ?? now, updatedAt: stored?.updatedAt ?? now, updatedBy: stored?.updatedBy ?? "",
  };
}

export async function payrollHistory(collaboratorId: string): Promise<PayrollMonth[]> {
  const snap = await Collections.payrollMonths().where("collaboratorId", "==", collaboratorId).get();
  return mapDocs(snap).sort((a, b) => b.competence.localeCompare(a.competence));
}
