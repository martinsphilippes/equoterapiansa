"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase/admin";
import { actionUser, actorOf } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { audit } from "@/lib/db/audit";
import type { Collaborator, CollaboratorStatus, WorkSchedule } from "@/lib/db/types";
import { guard, str, opt, num, bool, list, success, fail, ISO_DATE, HM, type ActionResult } from "./result";

export async function parseSchedule(fd: FormData): Promise<WorkSchedule | null> {
  if (!bool(fd, "customSchedule")) return null;
  const weekdays = list(fd, "weekdays").map(Number).filter((n) => n >= 0 && n <= 6);
  const periods: { start: string; end: string }[] = [];
  for (let i = 0; i < 3; i++) {
    const start = str(fd, `period${i}_start`);
    const end = str(fd, `period${i}_end`);
    if (start && end && HM.test(start) && HM.test(end) && end > start) periods.push({ start, end });
  }
  if (weekdays.length === 0 || periods.length === 0) throw new Error("Jornada própria: informe dias e pelo menos um período válido.");
  return { weekdays, periods };
}

export async function saveCollaborator(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("collaborators.manage");
    const id = opt(fd, "id");
    const name = str(fd, "name");
    if (name.length < 3) return fail("Informe o nome completo.");
    const cpf = opt(fd, "cpf")?.replace(/\D/g, "");
    if (cpf && cpf.length !== 11) return fail("CPF deve ter 11 dígitos.");
    const birthDate = opt(fd, "birthDate");
    const admissionDate = opt(fd, "admissionDate");
    for (const d of [birthDate, admissionDate]) if (d && !ISO_DATE.test(d)) return fail("Data inválida.");
    const payType = str(fd, "payType") === "hourly" ? "hourly" : "monthly";
    const jobRoleId = opt(fd, "jobRoleId");
    const jobRole = jobRoleId ? await getDoc(Collections.jobRoles(), jobRoleId) : null;
    const schedule = await parseSchedule(fd);
    const canSeeFinance = user.role === "owner" || user.permissions.includes("finance.view");

    const now = Date.now();
    const base: Partial<Collaborator> = {
      name, cpf, phone: opt(fd, "phone"), email: opt(fd, "email")?.toLowerCase(), address: opt(fd, "address"),
      birthDate, admissionDate, jobRoleId, jobRoleName: jobRole?.name, payType, schedule,
      notes: opt(fd, "notes"), updatedAt: now, updatedBy: user.id,
    };
    if (canSeeFinance) {
      base.salary = num(fd, "salary");
      base.hourlyRate = num(fd, "hourlyRate");
      base.bankInfo = opt(fd, "bankInfo");
    }

    if (id) {
      const existing = await getDoc(Collections.collaborators(), id);
      if (!existing) return fail("Colaborador não encontrado.");
      const batch = db.batch();
      batch.set(Collections.collaborators().doc(id), base, { merge: true });
      await audit(actorOf(user), { action: "collaborator.update", entity: "collaborator", entityId: id, entityLabel: name, details: { financeChanged: canSeeFinance && (existing.salary !== base.salary || existing.hourlyRate !== base.hourlyRate) } }, batch);
      await batch.commit();
      revalidatePath("/colaboradores");
      return success("Colaborador atualizado.", id);
    }
    const ref = Collections.collaborators().doc();
    const data: Collaborator = { ...(base as Collaborator), id: ref.id, status: "active", createdAt: now, createdBy: user.id };
    const batch = db.batch();
    batch.set(ref, data);
    await audit(actorOf(user), { action: "collaborator.create", entity: "collaborator", entityId: ref.id, entityLabel: name }, batch);
    await batch.commit();
    revalidatePath("/colaboradores");
    return success("Colaborador cadastrado.", ref.id, `/colaboradores/${ref.id}`);
  });
}

export async function setCollaboratorStatus(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("collaborators.manage");
    const id = str(fd, "id");
    const status = str(fd, "status") as CollaboratorStatus;
    if (!["active", "away", "terminated"].includes(status)) return fail("Situação inválida.");
    const c = await getDoc(Collections.collaborators(), id);
    if (!c) return fail("Colaborador não encontrado.");
    const terminationDate = status === "terminated" ? opt(fd, "terminationDate") ?? new Date().toISOString().slice(0, 10) : undefined;
    const batch = db.batch();
    batch.set(Collections.collaborators().doc(id), { status, terminationDate: terminationDate ?? null, updatedAt: Date.now(), updatedBy: user.id }, { merge: true });
    // Ao desligar, bloqueia o acesso ao sistema.
    if (status === "terminated" && c.userId) {
      batch.set(Collections.users().doc(c.userId), { active: false, updatedAt: Date.now() }, { merge: true });
    }
    await audit(actorOf(user), { action: `collaborator.status.${status}`, entity: "collaborator", entityId: id, entityLabel: c.name, details: { from: c.status, to: status } }, batch);
    await batch.commit();
    revalidatePath(`/colaboradores/${id}`);
    return success("Situação atualizada.");
  });
}
