import "server-only";
import { Collections, getMany, mapDocs } from "../collections";
import type { Appointment, Assessment, Guardian, Practitioner, Session, UserProfile } from "../types";
import { canAccessPractitioner } from "@/lib/auth/session";

/** Lista praticantes respeitando o escopo do usuário (profissional vê só os seus). */
export async function listPractitioners(user: UserProfile, opts?: { status?: Practitioner["status"] | "all"; search?: string }): Promise<Practitioner[]> {
  let q: FirebaseFirestore.Query<Practitioner> = Collections.practitioners();
  if (user.role === "professional") {
    if (!user.collaboratorId) return [];
    q = q.where("professionalIds", "array-contains", user.collaboratorId);
  } else if (user.role === "guardian") {
    if (!user.guardianId) return [];
    q = q.where("guardianIds", "array-contains", user.guardianId);
  }
  let items = mapDocs(await q.get());
  if (opts?.status && opts.status !== "all") items = items.filter((p) => p.status === opts.status);
  if (opts?.search) {
    const s = opts.search.toLowerCase();
    items = items.filter((p) => p.name.toLowerCase().includes(s));
  }
  return items.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function getPractitionerFor(user: UserProfile, id: string): Promise<Practitioner | null> {
  const snap = await Collections.practitioners().doc(id).get();
  if (!snap.exists) return null;
  const p = { ...(snap.data() as Practitioner), id: snap.id };
  return canAccessPractitioner(user, p) ? p : null;
}

export async function listGuardians(): Promise<Guardian[]> {
  return mapDocs(await Collections.guardians().get()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function guardiansOf(p: Practitioner): Promise<Guardian[]> {
  return getMany(Collections.guardians(), p.guardianIds);
}

export async function appointmentsInRange(start: string, end: string, filter?: { professionalId?: string; practitionerId?: string }): Promise<Appointment[]> {
  let q: FirebaseFirestore.Query<Appointment> = Collections.appointments().where("date", ">=", start).where("date", "<=", end);
  if (filter?.professionalId) q = q.where("professionalId", "==", filter.professionalId);
  if (filter?.practitionerId) q = q.where("practitionerId", "==", filter.practitionerId);
  return mapDocs(await q.get()).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

export async function appointmentsOfPractitioner(practitionerId: string): Promise<Appointment[]> {
  return mapDocs(await Collections.appointments().where("practitionerId", "==", practitionerId).get()).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

export async function sessionsOfPractitioner(practitionerId: string): Promise<Session[]> {
  return mapDocs(await Collections.sessions().where("practitionerId", "==", practitionerId).get()).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
}

export async function assessmentsOfPractitioner(practitionerId: string): Promise<Assessment[]> {
  return mapDocs(await Collections.assessments().where("practitionerId", "==", practitionerId).get()).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
}

/** Profissionais de atendimento ativos (colaboradores com função marcada como profissional). */
export async function listProfessionals() {
  const [roles, collabs] = await Promise.all([Collections.jobRoles().get(), Collections.collaborators().where("status", "==", "active").get()]);
  const profRoles = new Set(mapDocs(roles).filter((r) => r.isProfessional).map((r) => r.id));
  return mapDocs(collabs).filter((c) => c.jobRoleId && profRoles.has(c.jobRoleId)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
