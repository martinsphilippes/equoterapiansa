import "server-only";
import { Collections, getDoc, mapDocs } from "../collections";
import { appointmentsOfPractitioner, sessionsOfPractitioner } from "./practitioners";
import { computeFrequency } from "@/lib/domain/frequency";
import { compareAssessments } from "@/lib/domain/assessments";
import { ageFrom } from "@/lib/domain/dates";
import type { EvolutionReport, Practitioner } from "../types";

export async function buildReportSnapshot(p: Practitioner, periodStart: string, periodEnd: string, initialId: string | null, currentId: string | null): Promise<EvolutionReport["snapshot"]> {
  const [appts, sessions, initial, current] = await Promise.all([
    appointmentsOfPractitioner(p.id), sessionsOfPractitioner(p.id),
    initialId ? getDoc(Collections.assessments(), initialId) : null,
    currentId ? getDoc(Collections.assessments(), currentId) : null,
  ]);
  const inPeriod = (d: string) => d >= periodStart && d <= periodEnd;
  const freq = computeFrequency(appts.filter((a) => inPeriod(a.date)));
  const sess = sessions.filter((s) => inPeriod(s.date) && s.attended);
  const professionals = Array.from(new Set(sess.map((s) => s.professionalName))).sort();
  const objectives = Array.from(new Set(sess.map((s) => s.objective).filter((o): o is string => !!o))).slice(0, 12);
  const cmp = compareAssessments(initial, current);
  return {
    age: ageFrom(p.birthDate, periodEnd), entryDate: p.entryDate,
    frequency: { expected: freq.expected, done: freq.done, missed: freq.missed, cancelled: freq.cancelled, percent: freq.percent },
    professionals, objectives, comparison: cmp.rows, overall: cmp.overall, sessionsCount: sess.length,
  };
}

export async function reportsOfPractitioner(practitionerId: string, onlyShared = false) {
  const list = mapDocs(await Collections.reports().where("practitionerId", "==", practitionerId).get()).sort((a, b) => b.createdAt - a.createdAt);
  return onlyShared ? list.filter((r) => r.sharedWithGuardians) : list;
}

export async function timelineOf(practitionerId: string) {
  const [events, sessions, assessments, reports] = await Promise.all([
    mapDocs(await Collections.practitionerEvents().where("practitionerId", "==", practitionerId).get()),
    mapDocs(await Collections.sessions().where("practitionerId", "==", practitionerId).get()),
    mapDocs(await Collections.assessments().where("practitionerId", "==", practitionerId).get()),
    mapDocs(await Collections.reports().where("practitionerId", "==", practitionerId).get()),
  ]);
  const items: { date: string; sort: number; kind: string; title: string; description?: string; href?: string; tone: "green" | "blue" | "amber" | "gray" | "red" }[] = [];
  for (const e of events) items.push({ date: e.date, sort: e.createdAt, kind: e.type, title: e.title, description: e.description, tone: e.type === "closure" ? "red" : e.type === "entry" ? "green" : "gray" });
  for (const s of sessions) items.push({ date: s.date, sort: s.createdAt, kind: "session", title: s.attended ? `Atendimento · ${s.professionalName}` : `Falta · ${s.professionalName}`, description: s.attended ? [s.objective, s.evolution].filter(Boolean).join(" · ") : s.observations, href: `/atendimentos/${s.id}`, tone: s.attended ? "blue" : "red" });
  for (const a of assessments) items.push({ date: a.date, sort: a.createdAt, kind: "assessment", title: a.type === "initial" ? "Avaliação inicial" : a.type === "final" ? "Avaliação final" : "Avaliação periódica", description: a.overallAverage !== null ? `Média geral ${a.overallAverage}/${a.scaleMax} · ${a.professionalName}` : a.professionalName, href: `/praticantes/${practitionerId}/avaliacoes/${a.id}`, tone: "amber" });
  for (const r of reports) items.push({ date: r.periodEnd, sort: r.createdAt, kind: "report", title: r.title, description: `${r.professionalName}${r.sharedWithGuardians ? " · compartilhado com a família" : ""}`, href: `/praticantes/${practitionerId}/relatorios/${r.id}`, tone: "green" });
  return items.sort((a, b) => b.date.localeCompare(a.date) || b.sort - a.sort);
}
