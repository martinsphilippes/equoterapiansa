"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase/admin";
import { actionUser, actorOf, hasPermission } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { audit } from "@/lib/db/audit";
import { todayISO } from "@/lib/domain/dates";
import type { Guardian, Practitioner, PractitionerStatus } from "@/lib/db/types";
import { guard, str, opt, list, success, fail, ISO_DATE, type ActionResult } from "./result";

const STATUS_LABEL: Record<PractitionerStatus, string> = { active: "Em acompanhamento", reassessment: "Reavaliação", paused: "Pausado", closed: "Encerrado" };

export async function savePractitioner(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("practitioners.manage");
    const id = opt(fd, "id");
    const name = str(fd, "name");
    if (name.length < 3) return fail("Informe o nome completo.");
    const birthDate = opt(fd, "birthDate");
    const entryDate = opt(fd, "entryDate") ?? todayISO();
    if (birthDate && !ISO_DATE.test(birthDate)) return fail("Data de nascimento inválida.");
    if (!ISO_DATE.test(entryDate)) return fail("Data de entrada inválida.");
    const cpf = opt(fd, "cpf")?.replace(/\D/g, "");
    if (cpf && cpf.length !== 11) return fail("CPF deve ter 11 dígitos.");
    const professionalIds = list(fd, "professionalIds");
    const guardianIds = list(fd, "guardianIds");
    const now = Date.now();
    const base: Partial<Practitioner> = {
      name, birthDate, cpf, address: opt(fd, "address"), phone: opt(fd, "phone"), email: opt(fd, "email")?.toLowerCase(),
      entryDate, importantInfo: opt(fd, "importantInfo"), additionalContacts: opt(fd, "additionalContacts"),
      professionalIds, guardianIds, updatedAt: now, updatedBy: user.id,
    };
    if (hasPermission(user, "clinical.view")) base.clinicalInfo = opt(fd, "clinicalInfo") ?? "";

    const batch = db.batch();
    let pid = id;
    if (id) {
      const existing = await getDoc(Collections.practitioners(), id);
      if (!existing) return fail("Praticante não encontrado.");
      batch.set(Collections.practitioners().doc(id), base, { merge: true });
      await syncGuardians(batch, id, existing.guardianIds, guardianIds);
      await audit(actorOf(user), { action: "practitioner.update", entity: "practitioner", entityId: id, entityLabel: name }, batch);
    } else {
      const ref = Collections.practitioners().doc();
      pid = ref.id;
      batch.set(ref, { ...(base as Practitioner), id: ref.id, status: "active", photoPath: null, closure: null, createdAt: now, createdBy: user.id });
      await syncGuardians(batch, ref.id, [], guardianIds);
      const ev = Collections.practitionerEvents().doc();
      batch.set(ev, { id: ev.id, practitionerId: ref.id, date: entryDate, type: "entry", title: "Entrada na instituição", createdAt: now, createdBy: user.id });
      await audit(actorOf(user), { action: "practitioner.create", entity: "practitioner", entityId: ref.id, entityLabel: name }, batch);
    }
    await batch.commit();
    revalidatePath("/praticantes");
    return success(id ? "Praticante atualizado." : "Praticante cadastrado.", pid, id ? `/praticantes/${id}` : `/praticantes/${pid}`);
  });
}

/** Mantém guardian.practitionerIds em sincronia com practitioner.guardianIds. */
async function syncGuardians(batch: FirebaseFirestore.WriteBatch, practitionerId: string, before: string[], after: string[]) {
  const removed = before.filter((g) => !after.includes(g));
  const added = after.filter((g) => !before.includes(g));
  for (const gid of removed) {
    const g = await getDoc(Collections.guardians(), gid);
    if (g) batch.update(Collections.guardians().doc(gid), { practitionerIds: g.practitionerIds.filter((p) => p !== practitionerId), updatedAt: Date.now() });
  }
  for (const gid of added) {
    const g = await getDoc(Collections.guardians(), gid);
    if (g && !g.practitionerIds.includes(practitionerId)) batch.update(Collections.guardians().doc(gid), { practitionerIds: [...g.practitionerIds, practitionerId], updatedAt: Date.now() });
  }
}

export async function setPractitionerStatus(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("practitioners.manage");
    const id = str(fd, "id");
    const status = str(fd, "status") as PractitionerStatus;
    if (!["active", "reassessment", "paused"].includes(status)) return fail("Use o fluxo de encerramento para encerrar o acompanhamento.");
    const p = await getDoc(Collections.practitioners(), id);
    if (!p) return fail("Praticante não encontrado.");
    if (p.status === status) return success("Sem alteração.");
    const now = Date.now();
    const note = opt(fd, "note");
    const batch = db.batch();
    batch.set(Collections.practitioners().doc(id), { status, closure: status === "closed" ? p.closure : null, updatedAt: now, updatedBy: user.id }, { merge: true });
    const ev = Collections.practitionerEvents().doc();
    batch.set(ev, { id: ev.id, practitionerId: id, date: todayISO(), type: "status", title: `Situação alterada para ${STATUS_LABEL[status]}`, description: note, createdAt: now, createdBy: user.id });
    await audit(actorOf(user), { action: `practitioner.status.${status}`, entity: "practitioner", entityId: id, entityLabel: p.name, details: { from: p.status, to: status, note } }, batch);
    await batch.commit();
    revalidatePath(`/praticantes/${id}`);
    return success("Situação atualizada.");
  });
}

export async function addPractitionerNote(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser(["practitioners.manage", "sessions.record"]);
    const id = str(fd, "id");
    const title = str(fd, "title");
    if (!title) return fail("Informe um título.");
    const date = opt(fd, "date") ?? todayISO();
    if (!ISO_DATE.test(date)) return fail("Data inválida.");
    const ev = Collections.practitionerEvents().doc();
    await ev.set({ id: ev.id, practitionerId: id, date, type: "note", title, description: opt(fd, "description"), createdAt: Date.now(), createdBy: user.id });
    await audit(actorOf(user), { action: "practitioner.note", entity: "practitioner", entityId: id, details: { title } });
    revalidatePath(`/praticantes/${id}`);
    return success("Registro adicionado à linha do tempo.");
  });
}

export async function saveGuardian(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("practitioners.manage");
    const id = opt(fd, "id");
    const name = str(fd, "name");
    if (name.length < 3) return fail("Informe o nome completo.");
    const cpf = opt(fd, "cpf")?.replace(/\D/g, "");
    if (cpf && cpf.length !== 11) return fail("CPF deve ter 11 dígitos.");
    const practitionerIds = list(fd, "practitionerIds");
    const now = Date.now();
    const base: Partial<Guardian> = {
      name, cpf, phone: opt(fd, "phone"), email: opt(fd, "email")?.toLowerCase(), address: opt(fd, "address"),
      relationship: opt(fd, "relationship") ?? "Responsável", practitionerIds, updatedAt: now,
    };
    const batch = db.batch();
    let gid = id;
    if (id) {
      const existing = await getDoc(Collections.guardians(), id);
      if (!existing) return fail("Responsável não encontrado.");
      batch.set(Collections.guardians().doc(id), base, { merge: true });
      await syncPractitioners(batch, id, existing.practitionerIds, practitionerIds);
      await audit(actorOf(user), { action: "guardian.update", entity: "guardian", entityId: id, entityLabel: name }, batch);
    } else {
      const ref = Collections.guardians().doc();
      gid = ref.id;
      batch.set(ref, { ...(base as Guardian), id: ref.id, appAccess: false, createdAt: now });
      await syncPractitioners(batch, ref.id, [], practitionerIds);
      await audit(actorOf(user), { action: "guardian.create", entity: "guardian", entityId: ref.id, entityLabel: name }, batch);
    }
    await batch.commit();
    revalidatePath("/responsaveis");
    const back = opt(fd, "returnTo");
    return success(id ? "Responsável atualizado." : "Responsável cadastrado.", gid, back ?? `/responsaveis/${gid}`);
  });
}

async function syncPractitioners(batch: FirebaseFirestore.WriteBatch, guardianId: string, before: string[], after: string[]) {
  const removed = before.filter((p) => !after.includes(p));
  const added = after.filter((p) => !before.includes(p));
  for (const pid of removed) {
    const p = await getDoc(Collections.practitioners(), pid);
    if (p) batch.update(Collections.practitioners().doc(pid), { guardianIds: p.guardianIds.filter((g) => g !== guardianId) });
  }
  for (const pid of added) {
    const p = await getDoc(Collections.practitioners(), pid);
    if (p && !p.guardianIds.includes(guardianId)) batch.update(Collections.practitioners().doc(pid), { guardianIds: [...p.guardianIds, guardianId] });
  }
}
