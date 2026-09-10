import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { adminAuth } from "@/lib/firebase/admin";
import { Collections } from "@/lib/db/collections";
import { DEFAULT_ORG_ID, enterOrg, orgScope } from "@/lib/db/org-context";
import type { UserProfile, Practitioner } from "@/lib/db/types";
import { DEFAULT_PERMISSIONS, type Permission, type Role } from "./permissions";

export const SESSION_COOKIE = "__session";
export const ORG_COOKIE = "__org";
export const SESSION_DAYS = 5;

export class AuthError extends Error {
  constructor(message = "Sem permissão para esta ação.") {
    super(message);
    this.name = "AuthError";
  }
}

/** Unidades a que a pessoa tem acesso, a primeira sendo a dela. */
export function orgsOf(profile: Pick<UserProfile, "orgId" | "orgIds">): string[] {
  const primary = profile.orgId || DEFAULT_ORG_ID;
  const extra = (profile.orgIds ?? []).filter((o) => o && o !== primary);
  return [primary, ...extra];
}

/**
 * Usuário logado (cookie de sessão + perfil) e a unidade ativa. Cacheado por
 * requisição. A unidade ativa vem do cookie somente se a pessoa tiver acesso a
 * ela; qualquer outro valor cai para a unidade dela.
 */
async function loadCurrentUser(): Promise<UserProfile | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(token, false);
    const snap = await Collections.users().doc(decoded.uid).get();
    if (!snap.exists) return null;
    const profile = { ...(snap.data() as UserProfile), id: snap.id };
    if (!profile.active) return null;
    const allowed = orgsOf(profile);
    const wanted = store.get(ORG_COOKIE)?.value;
    profile.activeOrgId = wanted && allowed.includes(wanted) ? wanted : allowed[0];
    enterOrg(profile.activeOrgId);
    return profile;
  } catch {
    return null;
  }
}

const cachedCurrentUser = cache(loadCurrentUser);

/**
 * Uma leitura de sessão por requisição. Em telas o cache do React resolve; em
 * ações e rotas o escopo aberto por `withOrgScope` guarda a mesma promessa,
 * porque ali o cache do React não tem escopo de requisição.
 */
export function getCurrentUser(): Promise<UserProfile | null> {
  const scope = orgScope();
  if (!scope) return cachedCurrentUser();
  if (!scope.user) scope.user = loadCurrentUser();
  return scope.user as Promise<UserProfile | null>;
}

/**
 * Entra na unidade do usuário. Chamado por toda porta de entrada (páginas,
 * ações e rotas), porque o React pode renderizar layout e página em contextos
 * assíncronos irmãos, e cada um precisa do seu contexto de unidade.
 */
export function bindOrg(user: UserProfile): UserProfile {
  enterOrg(user.activeOrgId || user.orgId || DEFAULT_ORG_ID);
  return user;
}

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
  return bindOrg(user);
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
  bindOrg(user);
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
