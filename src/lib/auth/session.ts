import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { adminAuth } from "@/lib/firebase/admin";
import { Collections } from "@/lib/db/collections";
import type { UserProfile, Practitioner } from "@/lib/db/types";
import { DEFAULT_PERMISSIONS, type Permission, type Role } from "./permissions";

export const SESSION_COOKIE = "__session";
export const SESSION_DAYS = 5;

export class AuthError extends Error {
  constructor(message = "Sem permissão para esta ação.") {
    super(message);
    this.name = "AuthError";
  }
}

/** Usuário logado (verificação do cookie de sessão + perfil no Firestore). Cacheado por request. */
export const getCurrentUser = cache(async (): Promise<UserProfile | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(token, false);
    const snap = await Collections.users().doc(decoded.uid).get();
    if (!snap.exists) return null;
    const profile = { ...(snap.data() as UserProfile), id: snap.id };
    if (!profile.active) return null;
    return profile;
  } catch {
    return null;
  }
});

export function effectivePermissions(user: Pick<UserProfile, "role" | "permissions">): Permission[] {
  if (user.role === "owner") return DEFAULT_PERMISSIONS.owner;
  return user.permissions?.length ? user.permissions : DEFAULT_PERMISSIONS[user.role];
}

export function hasPermission(user: UserProfile, p: Permission): boolean {
  return effectivePermissions(user).includes(p);
}

export function hasAny(user: UserProfile, ps: Permission[]): boolean {
  const eff = effectivePermissions(user);
  return ps.some((p) => eff.includes(p));
}

/** Para páginas: redireciona para o login quando não autenticado. */
export async function requireUser(): Promise<UserProfile> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
}

export async function requireStaff(): Promise<UserProfile> {
  const user = await requireUser();
  if (user.role === "guardian") redirect("/familia");
  return user;
}

export async function requirePermission(p: Permission | Permission[]): Promise<UserProfile> {
  const user = await requireStaff();
  const list = Array.isArray(p) ? p : [p];
  if (!hasAny(user, list)) redirect("/sem-permissao");
  return user;
}

/** Para server actions: lança erro em vez de redirecionar. */
export async function actionUser(p?: Permission | Permission[]): Promise<UserProfile> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Sessão expirada. Entre novamente.");
  if (p) {
    const list = Array.isArray(p) ? p : [p];
    if (!hasAny(user, list)) throw new AuthError();
  }
  return user;
}

export function roleOf(user: UserProfile): Role {
  return user.role;
}

/**
 * Regra central de acesso a um praticante:
 * - Dono/Gerente com practitioners.view: todos.
 * - Profissional: apenas praticantes atribuídos a ele (professionalIds) ou com agendamento seu.
 * - Responsável: apenas os praticantes vinculados.
 */
export function canAccessPractitioner(user: UserProfile, p: Practitioner): boolean {
  if (user.role === "guardian") return !!user.guardianId && p.guardianIds.includes(user.guardianId);
  if (user.role === "owner" || user.role === "manager") return hasPermission(user, "practitioners.view");
  if (user.role === "professional") return !!user.collaboratorId && p.professionalIds.includes(user.collaboratorId);
  return false;
}

export function actorOf(user: UserProfile) {
  return { id: user.id, name: user.name };
}
