"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase/admin";
import { actionUser, actorOf, canAccessPractitioner, hasPermission } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { audit } from "@/lib/db/audit";
import { addDays, hmToMinutes, minutesToClock, todayISO } from "@/lib/domain/dates";
import type { Appointment, AppointmentStatus, Session } from "@/lib/db/types";
import { guard, str, opt, num, bool, list, success, fail, ISO_DATE, HM, type ActionResult } from "./result";

async function loadNames(practitionerId: string, professionalId: string) {
  const [p, c] = await Promise.all([getDoc(Collections.practitioners(), practitionerId), getDoc(Collections.collaborators(), professionalId)]);
  if (!p) throw new Error("Praticante não encontrado.");
  if (!c) throw new Error("Profissional não encontrado.");
  return { p, c };
}

/** Cria um agendamento (opcionalmente repetido semanalmente por N semanas). */
export async function saveAppointment(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("schedule.manage");
    const id = opt(fd, "id");
    const practitionerId = str(fd, "practitionerId");
    const professionalId = str(fd, "professionalId");
    const date = str(fd, "date");
    const startTime = str(fd, "startTime");
    const duration = num(fd, "duration") ?? 30;
    const type = str(fd, "type") || "Equoterapia";
    if (!ISO_DATE.test(date)) return fail("Data inválida.");
    if (!HM.test(startTime)) return fail("Horário inválido.");
    if (duration < 5 || duration > 240) return fail("Duração inválida.");
    const endTime = minutesToClock(hmToMinutes(startTime) + duration);
    const { p, c } = await loadNames(practitionerId, professionalId);
    const repeatWeeks = id ? 0 : Math.min(52, Math.max(0, num(fd, "repeatWeeks") ?? 0));
    const now = Date.now();
    const batch = db.batch();
    const created: string[] = [];
    const common = { practitionerId, practitionerName: p.name, professionalId, professionalName: c.name, startTime, endTime, type, notes: opt(fd, "notes"), updatedAt: now, updatedBy: user.id };
    if (id) {
      const existing = await getDoc(Collections.appointments(), id);
      if (!existing) return fail("Agendamento não encontrado.");
      if (existing.status === "done") return fail("Atendimento já realizado não pode ser alterado.");
      batch.set(Collections.appointments().doc(id), { ...common, date }, { merge: true });
      await audit(actorOf(user), { action: "appointment.update", entity: "appointment", entityId: id, entityLabel: `${p.name} ${date} ${startTime}`, details: { before: { date: existing.date, startTime: existing.startTime, professionalId: existing.professionalId } } }, batch);
    } else {
      for (let w = 0; w <= repeatWeeks; w++) {
        const ref = Collections.appointments().doc();
        const d = addDays(date, w * 7);
        const appt: Appointment = { ...common, id: ref.id, date: d, status: "scheduled", sessionId: null, createdAt: now, createdBy: user.id };
        batch.set(ref, appt);
        created.push(ref.id);
      }
      // garante que o profissional passa a ter acesso ao praticante
      if (!p.professionalIds.includes(professionalId)) batch.update(Collections.practitioners().doc(practitionerId), { professionalIds: [...p.professionalIds, professionalId] });
      await audit(actorOf(user), { action: "appointment.create", entity: "appointment", entityId: created[0], entityLabel: `${p.name} ${date} ${startTime}`, details: { count: created.length, professionalId } }, batch);
    }
    await batch.commit();
    revalidatePath("/agenda");
    revalidatePath(`/praticantes/${practitionerId}`);
    const returnTo = opt(fd, "returnTo");
    return success(id ? "Agendamento atualizado." : created.length > 1 ? `${created.length} agendamentos criados.` : "Agendamento criado.", created[0] ?? id, returnTo ?? `/agenda?data=${date}`);
  });
}

export async function setAppointmentStatus(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser(["schedule.manage", "sessions.record"]);
    const id = str(fd, "id");
    const status = str(fd, "status") as AppointmentStatus;
    if (!["scheduled", "confirmed", "missed", "cancelled", "rescheduled"].includes(status)) return fail("Use o registro de atendimento para marcar como realizado.");
    const a = await getDoc(Collections.appointments(), id);
    if (!a) return fail("Agendamento não encontrado.");
    if (a.status === "done") return fail("Atendimento já realizado.");
    if (user.role === "professional" && a.professionalId !== user.collaboratorId) return fail("Este agendamento é de outro profissional.");
    const now = Date.now();
    const batch = db.batch();
    batch.set(Collections.appointments().doc(id), { status, notes: opt(fd, "notes") ?? a.notes, updatedAt: now, updatedBy: user.id }, { merge: true });
    // reagendamento: cria o novo agendamento
    let newId: string | undefined;
    if (status === "rescheduled") {
      const newDate = str(fd, "newDate");
      const newTime = str(fd, "newTime") || a.startTime;
      if (!ISO_DATE.test(newDate) || !HM.test(newTime)) return fail("Informe a nova data e horário.");
      const dur = hmToMinutes(a.endTime) - hmToMinutes(a.startTime);
      const ref = Collections.appointments().doc();
      newId = ref.id;
      batch.set(ref, { ...a, id: ref.id, date: newDate, startTime: newTime, endTime: minutesToClock(hmToMinutes(newTime) + dur), status: "scheduled", sessionId: null, createdAt: now, createdBy: user.id, updatedAt: now, updatedBy: user.id });
    }
    await audit(actorOf(user), { action: `appointment.${status}`, entity: "appointment", entityId: id, entityLabel: `${a.practitionerName} ${a.date} ${a.startTime}`, details: { from: a.status, newAppointmentId: newId } }, batch);
    await batch.commit();
    revalidatePath("/agenda");
    revalidatePath(`/praticantes/${a.practitionerId}`);
    return success("Status atualizado.");
  });
}

export async function deleteAppointment(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("schedule.manage");
    const id = str(fd, "id");
    const a = await getDoc(Collections.appointments(), id);
    if (!a) return fail("Agendamento não encontrado.");
    if (a.status === "done") return fail("Atendimento realizado não pode ser excluído.");
    const batch = db.batch();
    batch.delete(Collections.appointments().doc(id));
    await audit(actorOf(user), { action: "appointment.delete", entity: "appointment", entityId: id, entityLabel: `${a.practitionerName} ${a.date} ${a.startTime}`, details: { before: a } }, batch);
    await batch.commit();
    revalidatePath("/agenda");
    return success("Agendamento excluído.");
  });
}

/** Registro rápido de atendimento (presença/ausência + observações). */
export async function recordSession(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("sessions.record");
    const appointmentId = opt(fd, "appointmentId");
    const sessionId = opt(fd, "sessionId");
    const attended = bool(fd, "attended");
    let practitionerId = str(fd, "practitionerId");
    let professionalId = str(fd, "professionalId") || user.collaboratorId || "";
    let date = str(fd, "date");
    let time = str(fd, "time");
    let appt: Appointment | null = null;
    if (appointmentId) {
      appt = await getDoc(Collections.appointments(), appointmentId);
      if (!appt) return fail("Agendamento não encontrado.");
      practitionerId = appt.practitionerId;
      professionalId = professionalId || appt.professionalId;
      date = date || appt.date;
      time = time || appt.startTime;
    }
    if (!ISO_DATE.test(date)) return fail("Data inválida.");
    if (!HM.test(time)) return fail("Horário inválido.");
    if (!professionalId) return fail("Informe o profissional.");
    const { p, c } = await loadNames(practitionerId, professionalId);
    if (!canAccessPractitioner(user, p) && !hasPermission(user, "practitioners.manage")) return fail("Sem acesso a este praticante.");
    if (user.role === "professional" && professionalId !== user.collaboratorId) return fail("Você só pode registrar atendimentos próprios.");

    const now = Date.now();
    const batch = db.batch();
    const ref = sessionId ? Collections.sessions().doc(sessionId) : Collections.sessions().doc();
    const existing = sessionId ? await getDoc(Collections.sessions(), sessionId) : null;
    if (sessionId && !existing) return fail("Registro não encontrado.");
    const session: Session = {
      id: ref.id, appointmentId: appointmentId ?? existing?.appointmentId ?? null, practitionerId, practitionerName: p.name, professionalId, professionalName: c.name,
      date, time, attended, horse: opt(fd, "horse"), activities: list(fd, "activities").concat(str(fd, "activitiesText").split(/\n|;/).map((s) => s.trim()).filter(Boolean)),
      objective: opt(fd, "objective"), observations: opt(fd, "observations"), incidents: opt(fd, "incidents"), evolution: opt(fd, "evolution"),
      createdAt: existing?.createdAt ?? now, updatedAt: now, createdBy: existing?.createdBy ?? user.id, updatedBy: user.id,
    };
    batch.set(ref, session);
    if (appt) batch.set(Collections.appointments().doc(appt.id), { status: attended ? "done" : "missed", sessionId: ref.id, updatedAt: now, updatedBy: user.id }, { merge: true });
    if (!p.professionalIds.includes(professionalId)) batch.update(Collections.practitioners().doc(practitionerId), { professionalIds: [...p.professionalIds, professionalId] });
    await audit(actorOf(user), { action: sessionId ? "session.update" : "session.create", entity: "session", entityId: ref.id, entityLabel: `${p.name} ${date} ${time}`, details: { attended, appointmentId } }, batch);
    await batch.commit();
    revalidatePath("/agenda");
    revalidatePath(`/praticantes/${practitionerId}`);
    const returnTo = opt(fd, "returnTo");
    return success(attended ? "Atendimento registrado." : "Falta registrada.", ref.id, returnTo ?? `/praticantes/${practitionerId}/atendimentos`);
  });
}

export async function todayIso() {
  return todayISO();
}
