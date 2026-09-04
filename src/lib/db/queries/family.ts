import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { Collections, getDoc, getMany } from "../collections";
import type { Guardian, Practitioner, UserProfile } from "../types";

/** Contexto da área da família: usuário responsável + praticantes vinculados. */
export async function requireGuardian(): Promise<{ user: UserProfile; guardian: Guardian; practitioners: Practitioner[] }> {
  const user = await requireUser();
  if (user.role !== "guardian" || !user.guardianId) redirect("/painel");
  const guardian = await getDoc(Collections.guardians(), user.guardianId);
  if (!guardian) redirect("/entrar");
  const practitioners = (await getMany(Collections.practitioners(), guardian.practitionerIds)).filter((p) => p.guardianIds.includes(guardian.id)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return { user, guardian, practitioners };
}

/** Garante que o responsável só acessa praticantes vinculados a ele. */
export async function requireGuardianPractitioner(pid: string) {
  const ctx = await requireGuardian();
  const p = ctx.practitioners.find((x) => x.id === pid);
  if (!p) redirect("/familia");
  return { ...ctx, practitioner: p };
}
