"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase/admin";
import { actionUser, actorOf, hasPermission } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { getSettings } from "@/lib/db/settings";
import { audit } from "@/lib/db/audit";
import { computeDay, isWorkingDay, scheduleFor } from "@/lib/domain/time";
import { nowHM, todayISO } from "@/lib/domain/dates";
import type { TimeEntry, TimeEntryStatus } from "@/lib/db/types";
import { guard, str, opt, num, success, fail, ISO_DATE, HM, type ActionResult } from "./result";

function entryId(collaboratorId: string, date: string) {
  return `${collaboratorId}_${date}`;
}

async function recompute(collaboratorId: string, date: string, partial: Partial<TimeEntry>, existing: TimeEntry | null): Promise<TimeEntry> {
  const [settings, c] = await Promise.all([getSettings(), getDoc(Collections.collaborators(), collaboratorId)]);
  if (!c) throw new Error("Colaborador não encontrado.");
  const schedule = scheduleFor(settings, c.schedule);
  const periods = partial.periods ?? existing?.periods ?? [];
  const breakMinutes = partial.breakMinutes ?? existing?.breakMinutes ?? 0;
  const status: TimeEntryStatus = partial.status ?? existing?.status ?? "present";
  const calc = computeDay(periods, breakMinutes, schedule, settings.lateToleranceMinutes, status, isWorkingDay(date, schedule, settings.holidays));
  const now = Date.now();
  return {
    id: entryId(collaboratorId, date), collaboratorId, date, periods, breakMinutes, status,
    justification: partial.justification ?? existing?.justification,
    managerNote: partial.managerNote ?? existing?.managerNote,
    ...calc,
    source: partial.source ?? existing?.source ?? "self",
    createdAt: existing?.createdAt ?? now, updatedAt: now, updatedBy: partial.updatedBy ?? existing?.updatedBy ?? "",
  };
}

/** Registrar entrada/saída do próprio colaborador (hoje, hora do servidor). */
export async function clockToggle(_prev: ActionResult | null, _fd: FormData): Promise<ActionResult> {
  void _prev; void _fd;
  return guard(async () => {
    const user = await actionUser();
    if (!user.collaboratorId) return fail("Seu usuário não está vinculado a um cadastro de colaborador.");
    const settings = await getSettings();
    const date = todayISO(settings.timezone);
    const time = nowHM(settings.timezone);
    const id = entryId(user.collaboratorId, date);
    const existing = await getDoc(Collections.timeEntries(), id);
    const periods = [...(existing?.periods ?? [])];
    const open = periods.find((p) => !p.out);
    let action: string;
    if (open) {
      if (time <= open.in) return fail("A saída precisa ser depois da entrada.");
      open.out = time;
      action = "time.clockOut";
    } else {
      periods.push({ in: time });
      action = "time.clockIn";
    }
    const entry = await recompute(user.collaboratorId, date, { periods, status: "present", source: "self", updatedBy: user.id }, existing);
    const batch = db.batch();
    batch.set(Collections.timeEntries().doc(id), entry);
    await audit(actorOf(user), { action, entity: "timeEntry", entityId: id, entityLabel: `${user.name} ${date}`, details: { time } }, batch);
    await batch.commit();
    revalidatePath("/jornada");
    return success(open ? `Saída registrada às ${time}.` : `Entrada registrada às ${time}.`);
  });
}

/** Edição completa de um dia: gestor (qualquer colaborador) ou o próprio (somente hoje). */
export async function upsertTimeEntry(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser();
    const collaboratorId = str(fd, "collaboratorId");
    const date = str(fd, "date");
    if (!ISO_DATE.test(date)) return fail("Data inválida.");
    const isManager = hasPermission(user, "time.manage");
    const isSelf = user.collaboratorId === collaboratorId;
    const settings = await getSettings();
    if (!isManager) {
      if (!isSelf) return fail("Sem permissão.");
      if (date !== todayISO(settings.timezone)) return fail("Você só pode ajustar o dia de hoje. Peça ao gestor para corrigir outros dias.");
    }
    const status = str(fd, "status") as TimeEntryStatus;
    if (!["present", "absent", "justified", "off"].includes(status)) return fail("Situação inválida.");
    const periods: { in: string; out?: string }[] = [];
    for (let i = 0; i < 4; i++) {
      const pin = str(fd, `p${i}_in`);
      const pout = str(fd, `p${i}_out`);
      if (!pin && !pout) continue;
      if (!HM.test(pin)) return fail(`Entrada ${i + 1} inválida.`);
      if (pout && (!HM.test(pout) || pout <= pin)) return fail(`Saída ${i + 1} precisa ser depois da entrada.`);
      periods.push(pout ? { in: pin, out: pout } : { in: pin });
    }
    if (status === "present" && periods.length === 0) return fail("Informe pelo menos um horário de entrada.");
    const id = entryId(collaboratorId, date);
    const existing = await getDoc(Collections.timeEntries(), id);
    const partial: Partial<TimeEntry> = {
      periods: status === "present" ? periods : [],
      breakMinutes: Math.max(0, num(fd, "breakMinutes") ?? 0),
      status,
      justification: opt(fd, "justification") ?? "",
      source: isManager && !isSelf ? "manager" : "self",
      updatedBy: user.id,
    };
    if (isManager) partial.managerNote = opt(fd, "managerNote") ?? "";
    const entry = await recompute(collaboratorId, date, partial, existing);
    const batch = db.batch();
    batch.set(Collections.timeEntries().doc(id), entry);
    await audit(actorOf(user), { action: existing ? "time.update" : "time.create", entity: "timeEntry", entityId: id, entityLabel: date, details: { collaboratorId, status, periods, breakMinutes: entry.breakMinutes, byManager: isManager && !isSelf, before: existing ? { status: existing.status, periods: existing.periods } : null } }, batch);
    await batch.commit();
    revalidatePath("/jornada");
    revalidatePath(`/colaboradores/${collaboratorId}`);
    return success("Registro salvo.");
  });
}

export async function deleteTimeEntry(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("time.manage");
    const id = str(fd, "id");
    const existing = await getDoc(Collections.timeEntries(), id);
    if (!existing) return fail("Registro não encontrado.");
    const batch = db.batch();
    batch.delete(Collections.timeEntries().doc(id));
    await audit(actorOf(user), { action: "time.delete", entity: "timeEntry", entityId: id, entityLabel: existing.date, details: { collaboratorId: existing.collaboratorId, before: existing } }, batch);
    await batch.commit();
    revalidatePath("/jornada");
    revalidatePath(`/colaboradores/${existing.collaboratorId}`);
    return success("Registro removido.");
  });
}
