"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase/admin";
import { actionUser, actorOf, canAccessPractitioner } from "@/lib/auth/session";
import { Collections, getDoc, mapDocs } from "@/lib/db/collections";
import { getSettings } from "@/lib/db/settings";
import { audit } from "@/lib/db/audit";
import { computeAverages } from "@/lib/domain/assessments";
import { buildReportSnapshot } from "@/lib/db/queries/reports";
import { todayISO } from "@/lib/domain/dates";
import type { Assessment, AssessmentCategory, AssessmentScore, AssessmentType, EvolutionReport } from "@/lib/db/types";
import { guard, str, opt, bool, success, fail, ISO_DATE, type ActionResult } from "./result";

async function activeCategories(): Promise<AssessmentCategory[]> {
  return mapDocs(await Collections.assessmentCategories().get()).filter((c) => c.active).sort((a, b) => a.order - b.order).map((c) => ({ ...c, items: c.items.filter((i) => i.active) }));
}

export async function saveAssessment(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("assessments.record");
    const id = opt(fd, "id");
    const practitionerId = str(fd, "practitionerId");
    const p = await getDoc(Collections.practitioners(), practitionerId);
    if (!p) return fail("Praticante não encontrado.");
    if (!canAccessPractitioner(user, p)) return fail("Sem acesso a este praticante.");
    const date = str(fd, "date");
    if (!ISO_DATE.test(date)) return fail("Data inválida.");
    let type = str(fd, "type") as AssessmentType;
    if (!["initial", "periodic", "final"].includes(type)) return fail("Tipo inválido.");
    const settings = await getSettings();
    const scaleMax = Math.max(...settings.scale.map((l) => l.value));
    const existing = id ? await getDoc(Collections.assessments(), id) : null;
    if (id && !existing) return fail("Avaliação não encontrada.");
    // apenas uma avaliação inicial por praticante
    const all = mapDocs(await Collections.assessments().where("practitionerId", "==", practitionerId).get());
    const hasInitial = all.some((a) => a.type === "initial" && a.id !== id);
    if (type === "initial" && hasInitial) type = "periodic";
    if (!hasInitial && all.filter((a) => a.id !== id).length === 0 && type === "periodic") type = "initial";

    const professionalId = str(fd, "professionalId") || user.collaboratorId || "";
    if (user.role === "professional" && professionalId !== user.collaboratorId) return fail("Você só pode registrar avaliações próprias.");
    const prof = professionalId ? await getDoc(Collections.collaborators(), professionalId) : null;
    const professionalName = prof?.name ?? user.name;

    const categories = existing
      ? existing.categoriesSnapshot.map((c) => ({ ...c, order: 0, active: true, createdAt: 0, items: c.items.map((i) => ({ ...i, active: true })) }))
      : await activeCategories();
    const scores: Record<string, AssessmentScore> = {};
    let filled = 0;
    for (const c of categories) {
      for (const it of c.items) {
        const raw = str(fd, `score_${it.id}`);
        const note = opt(fd, `note_${it.id}`);
        if (raw === "" && !note) continue;
        const score = raw === "" ? null : Number(raw);
        if (score !== null && (!Number.isInteger(score) || score < 1 || score > scaleMax)) return fail(`Nota inválida em "${it.name}".`);
        scores[it.id] = { score, note };
        if (score !== null) filled++;
      }
    }
    if (filled === 0) return fail("Preencha pelo menos uma nota.");
    const { categoryAverages, overallAverage } = computeAverages(categories, scores);
    const now = Date.now();
    const ref = existing ? Collections.assessments().doc(existing.id) : Collections.assessments().doc();
    const data: Assessment = {
      id: ref.id, practitionerId, practitionerName: p.name, type, date, professionalId, professionalName, scores,
      categoriesSnapshot: categories.map((c) => ({ id: c.id, name: c.name, items: c.items.map((i) => ({ id: i.id, name: i.name })) })),
      categoryAverages, overallAverage, scaleMax, generalNotes: opt(fd, "generalNotes"),
      createdAt: existing?.createdAt ?? now, updatedAt: now, createdBy: existing?.createdBy ?? user.id, updatedBy: user.id,
    };
    const batch = db.batch();
    batch.set(ref, data);
    await audit(actorOf(user), { action: existing ? "assessment.update" : "assessment.create", entity: "assessment", entityId: ref.id, entityLabel: `${p.name} ${date}`, details: { type, overallAverage, filled } }, batch);
    await batch.commit();
    revalidatePath(`/praticantes/${practitionerId}`);
    return success("Avaliação salva.", ref.id, `/praticantes/${practitionerId}/avaliacoes/${ref.id}`);
  });
}

export async function deleteAssessment(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("practitioners.manage");
    const id = str(fd, "id");
    const a = await getDoc(Collections.assessments(), id);
    if (!a) return fail("Avaliação não encontrada.");
    const batch = db.batch();
    batch.delete(Collections.assessments().doc(id));
    await audit(actorOf(user), { action: "assessment.delete", entity: "assessment", entityId: id, entityLabel: `${a.practitionerName} ${a.date}`, details: { before: a } }, batch);
    await batch.commit();
    revalidatePath(`/praticantes/${a.practitionerId}`);
    return success("Avaliação excluída.", undefined, `/praticantes/${a.practitionerId}/avaliacoes`);
  });
}

async function createReport(userId: string, opts: { practitionerId: string; title: string; periodStart: string; periodEnd: string; initialAssessmentId?: string | null; currentAssessmentId?: string | null; professionalId: string; observations?: string; conclusion?: string; sharedWithGuardians: boolean }, batch: FirebaseFirestore.WriteBatch) {
  const p = await getDoc(Collections.practitioners(), opts.practitionerId);
  if (!p) throw new Error("Praticante não encontrado.");
  const prof = await getDoc(Collections.collaborators(), opts.professionalId);
  const snapshot = await buildReportSnapshot(p, opts.periodStart, opts.periodEnd, opts.initialAssessmentId ?? null, opts.currentAssessmentId ?? null);
  const ref = Collections.reports().doc();
  const report: EvolutionReport = {
    id: ref.id, practitionerId: p.id, practitionerName: p.name, title: opts.title, periodStart: opts.periodStart, periodEnd: opts.periodEnd,
    initialAssessmentId: opts.initialAssessmentId ?? null, currentAssessmentId: opts.currentAssessmentId ?? null,
    professionalId: opts.professionalId, professionalName: prof?.name ?? "", snapshot, observations: opts.observations, conclusion: opts.conclusion,
    sharedWithGuardians: opts.sharedWithGuardians, createdAt: Date.now(), createdBy: userId,
  };
  batch.set(ref, report);
  return report;
}

export async function generateReport(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("reports.manage");
    const practitionerId = str(fd, "practitionerId");
    const p = await getDoc(Collections.practitioners(), practitionerId);
    if (!p) return fail("Praticante não encontrado.");
    if (!canAccessPractitioner(user, p)) return fail("Sem acesso a este praticante.");
    const periodStart = str(fd, "periodStart");
    const periodEnd = str(fd, "periodEnd");
    if (!ISO_DATE.test(periodStart) || !ISO_DATE.test(periodEnd) || periodEnd < periodStart) return fail("Período inválido.");
    const professionalId = str(fd, "professionalId") || user.collaboratorId || "";
    if (!professionalId) return fail("Informe o profissional responsável.");
    const batch = db.batch();
    const report = await createReport(user.id, {
      practitionerId, title: str(fd, "title") || "Relatório de evolução", periodStart, periodEnd,
      initialAssessmentId: opt(fd, "initialAssessmentId"), currentAssessmentId: opt(fd, "currentAssessmentId"), professionalId,
      observations: opt(fd, "observations"), conclusion: opt(fd, "conclusion"), sharedWithGuardians: bool(fd, "sharedWithGuardians"),
    }, batch);
    await audit(actorOf(user), { action: "report.create", entity: "report", entityId: report.id, entityLabel: `${p.name} ${periodStart}–${periodEnd}`, details: { shared: report.sharedWithGuardians } }, batch);
    await batch.commit();
    revalidatePath(`/praticantes/${practitionerId}`);
    return success("Relatório gerado.", report.id, `/praticantes/${practitionerId}/relatorios/${report.id}`);
  });
}

export async function toggleReportShare(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("reports.manage");
    const id = str(fd, "id");
    const r = await getDoc(Collections.reports(), id);
    if (!r) return fail("Relatório não encontrado.");
    await Collections.reports().doc(id).update({ sharedWithGuardians: !r.sharedWithGuardians });
    await audit(actorOf(user), { action: r.sharedWithGuardians ? "report.unshare" : "report.share", entity: "report", entityId: id, entityLabel: `${r.practitionerName} ${r.title}` });
    revalidatePath(`/praticantes/${r.practitionerId}/relatorios`);
    return success(r.sharedWithGuardians ? "Relatório ocultado da família." : "Relatório liberado para a família.");
  });
}

export async function closePractitioner(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("practitioners.manage");
    const id = str(fd, "id");
    const p = await getDoc(Collections.practitioners(), id);
    if (!p) return fail("Praticante não encontrado.");
    if (p.status === "closed") return fail("Acompanhamento já encerrado.");
    const date = str(fd, "date") || todayISO();
    const reason = str(fd, "reason");
    if (!ISO_DATE.test(date)) return fail("Data inválida.");
    if (reason.length < 3) return fail("Informe o motivo do encerramento.");
    const finalAssessmentId = opt(fd, "finalAssessmentId") ?? null;
    const notes = opt(fd, "notes");
    const now = Date.now();
    const batch = db.batch();
    let reportId: string | null = null;
    if (bool(fd, "generateReport")) {
      const all = mapDocs(await Collections.assessments().where("practitionerId", "==", id).get()).sort((a, b) => a.date.localeCompare(b.date));
      const initial = all.find((a) => a.type === "initial") ?? all[0] ?? null;
      const current = finalAssessmentId ? all.find((a) => a.id === finalAssessmentId) ?? null : all.length > 1 ? all[all.length - 1] : null;
      const report = await createReport(user.id, {
        practitionerId: id, title: "Relatório final de acompanhamento", periodStart: p.entryDate, periodEnd: date,
        initialAssessmentId: initial?.id ?? null, currentAssessmentId: current?.id ?? null,
        professionalId: user.collaboratorId ?? p.professionalIds[0] ?? "", observations: notes, conclusion: `Encerramento em ${date}. Motivo: ${reason}.`,
        sharedWithGuardians: bool(fd, "shareReport"),
      }, batch);
      reportId = report.id;
    }
    batch.set(Collections.practitioners().doc(id), {
      status: "closed", closure: { date, reason, notes, decidedBy: user.id, decidedByName: user.name, finalAssessmentId, reportId }, updatedAt: now, updatedBy: user.id,
    }, { merge: true });
    // cancela agendamentos futuros
    const future = await Collections.appointments().where("practitionerId", "==", id).where("date", ">=", date).get();
    for (const d of future.docs) if (["scheduled", "confirmed"].includes(d.data().status)) batch.update(d.ref, { status: "cancelled", updatedAt: now, updatedBy: user.id });
    const ev = Collections.practitionerEvents().doc();
    batch.set(ev, { id: ev.id, practitionerId: id, date, type: "closure", title: "Encerramento do acompanhamento", description: reason, createdAt: now, createdBy: user.id });
    await audit(actorOf(user), { action: "practitioner.close", entity: "practitioner", entityId: id, entityLabel: p.name, details: { date, reason, finalAssessmentId, reportId, cancelledAppointments: future.size } }, batch);
    await batch.commit();
    revalidatePath(`/praticantes/${id}`);
    return success("Acompanhamento encerrado.", undefined, `/praticantes/${id}`);
  });
}
