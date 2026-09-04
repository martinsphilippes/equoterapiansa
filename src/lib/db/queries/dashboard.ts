import "server-only";
import { Collections, mapDocs } from "../collections";
import { getSettings } from "../settings";
import { listCollaborators, pendingDocumentsCount } from "./collaborators";
import { entriesOfDay } from "./time";
import { appointmentsInRange } from "./practitioners";
import { buildPayrollMonth } from "./payroll";
import { isWorkingDay, scheduleFor } from "@/lib/domain/time";
import { addMonths, currentCompetence, monthRange, nowHM, todayISO } from "@/lib/domain/dates";

export async function dashboardData() {
  const settings = await getSettings();
  const today = todayISO(settings.timezone);
  const competence = currentCompetence(settings.timezone);
  const prevCompetence = addMonths(competence, -1);
  const { start, end } = monthRange(competence);

  const [collaborators, todayEntries, todayAppts, practitionersSnap, assessmentsSnap, reportsSnap, monthEntriesSnap] = await Promise.all([
    listCollaborators({ status: "active" }),
    entriesOfDay(today),
    appointmentsInRange(today, today),
    Collections.practitioners().where("status", "in", ["active", "reassessment"]).get(),
    Collections.assessments().get(),
    Collections.reports().get(),
    Collections.timeEntries().where("date", ">=", start).where("date", "<=", end).get(),
  ]);
  const practitioners = mapDocs(practitionersSnap);
  const assessments = mapDocs(assessmentsSnap);
  const reports = mapDocs(reportsSnap);

  // Colaboradores
  const expectedToday = collaborators.filter((c) => isWorkingDay(today, scheduleFor(settings, c.schedule), settings.holidays));
  const presentIds = new Set(todayEntries.filter((e) => e.status === "present").map((e) => e.collaboratorId));
  const presentToday = expectedToday.filter((c) => presentIds.has(c.id)).length + todayEntries.filter((e) => e.status === "present" && !expectedToday.some((c) => c.id === e.collaboratorId)).length;
  const absentToday = expectedToday.filter((c) => !presentIds.has(c.id) && !todayEntries.some((e) => e.collaboratorId === c.id && (e.status === "justified" || e.status === "off"))).length;
  const monthMinutes = mapDocs(monthEntriesSnap).reduce((a, e) => a + (e.status === "present" ? e.workedMinutes : 0), 0);
  const prevMonths = await Promise.all(collaborators.map((c) => buildPayrollMonth(c.id, prevCompetence)));
  const pendingPayments = prevMonths.filter((m) => m && m.status === "unpaid").length;

  // Praticantes
  const lastAssessmentByP = new Map<string, string>();
  for (const a of assessments) if (!lastAssessmentByP.has(a.practitionerId) || lastAssessmentByP.get(a.practitionerId)! < a.date) lastAssessmentByP.set(a.practitionerId, a.date);
  const limit = addMonths(competence, -settings.assessmentIntervalMonths) + today.slice(7);
  const assessmentsPending = practitioners.filter((p) => { const last = lastAssessmentByP.get(p.id); return !last || last < limit; });
  const lastReportByP = new Map<string, number>();
  for (const r of reports) lastReportByP.set(r.practitionerId, Math.max(lastReportByP.get(r.practitionerId) ?? 0, r.createdAt));
  const reportsPending = practitioners.filter((p) => {
    const count = assessments.filter((a) => a.practitionerId === p.id).length;
    if (count < 2) return false;
    const lastA = assessments.filter((a) => a.practitionerId === p.id).sort((x, y) => y.createdAt - x.createdAt)[0];
    return (lastReportByP.get(p.id) ?? 0) < lastA.createdAt;
  });

  // Operação
  const now = nowHM(settings.timezone);
  const upcoming = (await appointmentsInRange(today, today.slice(0, 8) + "31" > today ? addDaysSafe(today, 7) : addDaysSafe(today, 7)))
    .filter((a) => (a.status === "scheduled" || a.status === "confirmed") && (a.date > today || a.startTime >= now)).slice(0, 6);
  const [docsCollab, docsPract] = await Promise.all([pendingDocumentsCount("collaborator", collaborators.map((c) => c.id)), pendingDocumentsCount("practitioner", practitioners.map((p) => p.id))]);

  return {
    today, competence, prevCompetence,
    collaborators: { active: collaborators.length, presentToday, absentToday, expectedToday: expectedToday.length, monthMinutes, pendingPayments },
    practitioners: { active: practitioners.length, appointmentsToday: todayAppts.length, presentToday: todayAppts.filter((a) => a.status === "done").length, missedToday: todayAppts.filter((a) => a.status === "missed").length, pendingToday: todayAppts.filter((a) => a.status === "scheduled" || a.status === "confirmed").length, assessmentsPending },
    operation: { upcoming, reportsPending, documentsPending: docsCollab.length + docsPract.length, docsCollab, docsPract },
  };
}

function addDaysSafe(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
