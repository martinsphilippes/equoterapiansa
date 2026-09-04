import "server-only";
import { Collections, mapDocs } from "../collections";
import { getSettings } from "../settings";
import { listCollaborators, pendingDocumentsCount } from "./collaborators";
import { entriesOfDay } from "./time";
import { appointmentsInRange } from "./practitioners";
import { buildPayrollMonths } from "./payroll";
import { isWorkingDay, scheduleFor } from "@/lib/domain/time";
import { addDays, addMonths, currentCompetence, monthRange, nowHM, todayISO } from "@/lib/domain/dates";

/**
 * Indicadores do painel com número fixo de consultas (não cresce com a base):
 * colaboradores, jornada de hoje, jornada do mês, agenda (hoje + 7 dias), praticantes ativos,
 * fechamentos do mês anterior, tipos e documentos. Avaliações e relatórios usam o resumo
 * mantido no próprio praticante (assessmentSummary / lastReportAt).
 */
export async function dashboardData() {
  const settings = await getSettings();
  const today = todayISO(settings.timezone);
  const competence = currentCompetence(settings.timezone);
  const prevCompetence = addMonths(competence, -1);
  const { start, end } = monthRange(competence);
  const weekEnd = addDays(today, 7);

  const [collaborators, todayEntries, weekAppts, practitionersSnap, monthEntriesSnap] = await Promise.all([
    listCollaborators({ status: "active" }),
    entriesOfDay(today),
    appointmentsInRange(today, weekEnd),
    Collections.practitioners().where("status", "in", ["active", "reassessment"]).get(),
    Collections.timeEntries().where("date", ">=", start).where("date", "<=", end).get(),
  ]);
  const practitioners = mapDocs(practitionersSnap);
  const todayAppts = weekAppts.filter((a) => a.date === today);

  // Colaboradores
  const expectedToday = collaborators.filter((c) => isWorkingDay(today, scheduleFor(settings, c.schedule), settings.holidays));
  const presentIds = new Set(todayEntries.filter((e) => e.status === "present").map((e) => e.collaboratorId));
  const presentToday = expectedToday.filter((c) => presentIds.has(c.id)).length + todayEntries.filter((e) => e.status === "present" && !expectedToday.some((c) => c.id === e.collaboratorId)).length;
  const absentToday = expectedToday.filter((c) => !presentIds.has(c.id) && !todayEntries.some((e) => e.collaboratorId === c.id && (e.status === "justified" || e.status === "off"))).length;
  const monthMinutes = mapDocs(monthEntriesSnap).reduce((a, e) => a + (e.status === "present" ? e.workedMinutes : 0), 0);
  const [prevMonths, docsCollab, docsPract] = await Promise.all([
    buildPayrollMonths(collaborators, prevCompetence),
    pendingDocumentsCount("collaborator", collaborators.map((c) => c.id)),
    pendingDocumentsCount("practitioner", practitioners.map((p) => p.id)),
  ]);
  const pendingPayments = prevMonths.filter((m) => m.status === "unpaid").length;

  // Praticantes (resumos denormalizados)
  const limit = addMonths(competence, -settings.assessmentIntervalMonths) + today.slice(7);
  const assessmentsPending = practitioners.filter((p) => { const last = p.assessmentSummary?.lastDate ?? null; return !last || last < limit; });
  const reportsPending = practitioners.filter((p) => (p.assessmentSummary?.count ?? 0) >= 2 && (p.lastReportAt ?? 0) < (p.assessmentSummary?.lastCreatedAt ?? 0));

  // Operação
  const now = nowHM(settings.timezone);
  const upcoming = weekAppts.filter((a) => (a.status === "scheduled" || a.status === "confirmed") && (a.date > today || a.startTime >= now)).slice(0, 6);

  return {
    today, competence, prevCompetence,
    collaborators: { active: collaborators.length, presentToday, absentToday, expectedToday: expectedToday.length, monthMinutes, pendingPayments },
    practitioners: { active: practitioners.length, appointmentsToday: todayAppts.length, presentToday: todayAppts.filter((a) => a.status === "done").length, missedToday: todayAppts.filter((a) => a.status === "missed").length, pendingToday: todayAppts.filter((a) => a.status === "scheduled" || a.status === "confirmed").length, assessmentsPending },
    operation: { upcoming, reportsPending, documentsPending: docsCollab.length + docsPract.length, docsCollab, docsPract },
  };
}
