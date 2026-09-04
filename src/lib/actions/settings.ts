"use server";
import { revalidatePath } from "next/cache";
import { actionUser, actorOf } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { getSettings, settingsRef } from "@/lib/db/settings";
import { audit } from "@/lib/db/audit";
import type { DocumentOwnerType, ScaleLevel } from "@/lib/db/types";
import { guard, str, opt, num, bool, list, success, fail, HM, ISO_DATE, type ActionResult } from "./result";

export async function updateGeneralSettings(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("settings.manage");
    const orgName = str(fd, "orgName");
    if (!orgName) return fail("Informe o nome da instituição.");
    const weekdays = list(fd, "weekdays").map(Number).filter((n) => n >= 0 && n <= 6);
    const periods: { start: string; end: string }[] = [];
    for (let i = 0; i < 3; i++) {
      const start = str(fd, `period${i}_start`);
      const end = str(fd, `period${i}_end`);
      if (start && end) {
        if (!HM.test(start) || !HM.test(end) || end <= start) return fail(`Período ${i + 1} inválido.`);
        periods.push({ start, end });
      }
    }
    if (weekdays.length === 0 || periods.length === 0) return fail("Informe os dias e ao menos um período da jornada.");
    const holidays = str(fd, "holidays").split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    for (const h of holidays) if (!ISO_DATE.test(h)) return fail(`Feriado inválido: ${h}. Use AAAA-MM-DD.`);
    const sessionTypes = str(fd, "sessionTypes").split(/\n|,/).map((s) => s.trim()).filter(Boolean);
    const data = {
      orgName,
      timezone: opt(fd, "timezone") ?? "America/Sao_Paulo",
      schedule: { weekdays, periods },
      lateToleranceMinutes: Math.max(0, num(fd, "lateToleranceMinutes") ?? 5),
      holidays: Array.from(new Set(holidays)).sort(),
      assessmentIntervalMonths: Math.max(1, num(fd, "assessmentIntervalMonths") ?? 6),
      sessionTypes: sessionTypes.length ? sessionTypes : ["Equoterapia"],
      updatedAt: Date.now(),
    };
    await settingsRef().set(data, { merge: true });
    await audit(actorOf(user), { action: "settings.update", entity: "settings", entityId: "general", details: data });
    revalidatePath("/configuracoes");
    return success("Configurações salvas.");
  });
}

export async function updateScale(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("settings.manage");
    const levels: ScaleLevel[] = [];
    for (let i = 1; i <= 10; i++) {
      const label = str(fd, `level${i}`);
      if (label) levels.push({ value: i, label });
    }
    if (levels.length < 2) return fail("A escala precisa de pelo menos 2 níveis.");
    // níveis devem ser contíguos a partir de 1
    for (let i = 0; i < levels.length; i++) if (levels[i].value !== i + 1) return fail("Preencha os níveis em sequência, sem pular.");
    await settingsRef().set({ scale: levels, updatedAt: Date.now() }, { merge: true });
    await audit(actorOf(user), { action: "settings.scale", entity: "settings", entityId: "general", details: { levels } });
    revalidatePath("/configuracoes");
    return success("Escala atualizada.");
  });
}

export async function saveJobRole(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("settings.manage");
    const id = opt(fd, "id");
    const name = str(fd, "name");
    if (!name) return fail("Informe o nome da função.");
    const isProfessional = bool(fd, "isProfessional");
    if (id) {
      await Collections.jobRoles().doc(id).set({ name, isProfessional }, { merge: true });
      // mantém o nome desnormalizado nos colaboradores
      const cs = await Collections.collaborators().where("jobRoleId", "==", id).get();
      await Promise.all(cs.docs.map((d) => d.ref.update({ jobRoleName: name })));
    } else {
      const ref = Collections.jobRoles().doc();
      await ref.set({ id: ref.id, name, isProfessional, active: true, createdAt: Date.now() });
    }
    await audit(actorOf(user), { action: id ? "jobRole.update" : "jobRole.create", entity: "jobRole", entityId: id ?? name, entityLabel: name });
    revalidatePath("/configuracoes");
    return success("Função salva.");
  });
}

export async function toggleJobRole(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("settings.manage");
    const id = str(fd, "id");
    const r = await getDoc(Collections.jobRoles(), id);
    if (!r) return fail("Função não encontrada.");
    await Collections.jobRoles().doc(id).update({ active: !r.active });
    await audit(actorOf(user), { action: r.active ? "jobRole.deactivate" : "jobRole.activate", entity: "jobRole", entityId: id, entityLabel: r.name });
    revalidatePath("/configuracoes");
    return success();
  });
}

export async function saveDocumentType(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("settings.manage");
    const id = opt(fd, "id");
    const name = str(fd, "name");
    const appliesTo = str(fd, "appliesTo") as DocumentOwnerType;
    if (!name) return fail("Informe o nome do documento.");
    if (!["collaborator", "practitioner"].includes(appliesTo)) return fail("Tipo inválido.");
    const data = { name, appliesTo, required: bool(fd, "required"), hasExpiry: bool(fd, "hasExpiry"), visibleToGuardian: appliesTo === "practitioner" && bool(fd, "visibleToGuardian") };
    if (id) await Collections.documentTypes().doc(id).set(data, { merge: true });
    else {
      const ref = Collections.documentTypes().doc();
      await ref.set({ id: ref.id, ...data, active: true, createdAt: Date.now() });
    }
    await audit(actorOf(user), { action: id ? "documentType.update" : "documentType.create", entity: "documentType", entityId: id ?? name, entityLabel: name });
    revalidatePath("/configuracoes");
    return success("Tipo de documento salvo.");
  });
}

export async function toggleDocumentType(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("settings.manage");
    const id = str(fd, "id");
    const r = await getDoc(Collections.documentTypes(), id);
    if (!r) return fail("Tipo não encontrado.");
    await Collections.documentTypes().doc(id).update({ active: !r.active });
    await audit(actorOf(user), { action: "documentType.toggle", entity: "documentType", entityId: id, entityLabel: r.name, details: { active: !r.active } });
    revalidatePath("/configuracoes");
    return success();
  });
}

export async function saveAssessmentCategory(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("settings.manage");
    const id = opt(fd, "id");
    const name = str(fd, "name");
    if (!name) return fail("Informe o nome da área.");
    if (id) {
      await Collections.assessmentCategories().doc(id).set({ name }, { merge: true });
    } else {
      const all = await Collections.assessmentCategories().get();
      const ref = Collections.assessmentCategories().doc();
      await ref.set({ id: ref.id, name, order: all.size + 1, active: true, createdAt: Date.now(), items: [] });
    }
    await audit(actorOf(user), { action: id ? "assessmentCategory.update" : "assessmentCategory.create", entity: "assessmentCategory", entityId: id ?? name, entityLabel: name });
    revalidatePath("/configuracoes");
    return success("Área salva.");
  });
}

export async function toggleAssessmentCategory(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("settings.manage");
    const id = str(fd, "id");
    const c = await getDoc(Collections.assessmentCategories(), id);
    if (!c) return fail("Área não encontrada.");
    await Collections.assessmentCategories().doc(id).update({ active: !c.active });
    await audit(actorOf(user), { action: "assessmentCategory.toggle", entity: "assessmentCategory", entityId: id, entityLabel: c.name, details: { active: !c.active } });
    revalidatePath("/configuracoes");
    return success();
  });
}

export async function saveAssessmentItem(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("settings.manage");
    const categoryId = str(fd, "categoryId");
    const itemId = opt(fd, "itemId");
    const name = str(fd, "name");
    const c = await getDoc(Collections.assessmentCategories(), categoryId);
    if (!c) return fail("Área não encontrada.");
    let items = c.items;
    if (itemId) {
      const toggle = bool(fd, "toggle");
      items = items.map((it) => (it.id === itemId ? { ...it, name: name || it.name, active: toggle ? !it.active : it.active } : it));
    } else {
      if (!name) return fail("Informe o nome do item.");
      items = [...items, { id: `${categoryId}_${Date.now()}`, name, active: true }];
    }
    await Collections.assessmentCategories().doc(categoryId).update({ items });
    await audit(actorOf(user), { action: "assessmentItem.save", entity: "assessmentCategory", entityId: categoryId, entityLabel: c.name, details: { itemId, name } });
    revalidatePath("/configuracoes");
    return success();
  });
}

export async function getSettingsSnapshot() {
  return getSettings();
}
