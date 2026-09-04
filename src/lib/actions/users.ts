"use server";
import { revalidatePath } from "next/cache";
import { adminAuth, db } from "@/lib/firebase/admin";
import { actionUser, actorOf } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { audit } from "@/lib/db/audit";
import { ALL_PERMISSIONS, DEFAULT_PERMISSIONS, type Permission, type Role } from "@/lib/auth/permissions";
import type { UserProfile } from "@/lib/db/types";
import { guard, str, list, success, fail, type ActionResult } from "./result";

function randomPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function createAccessUser(opts: { email: string; name: string; role: Role; collaboratorId?: string; guardianId?: string; password?: string; permissions?: Permission[] }) {
  const password = opts.password && opts.password.length >= 8 ? opts.password : randomPassword();
  let uid: string;
  try {
    const existing = await adminAuth.getUserByEmail(opts.email).catch(() => null);
    if (existing) {
      const prof = await getDoc(Collections.users(), existing.uid);
      if (prof) throw new Error("Já existe um acesso com este e-mail.");
      uid = existing.uid;
      await adminAuth.updateUser(uid, { password, displayName: opts.name, disabled: false });
    } else {
      const u = await adminAuth.createUser({ email: opts.email, password, displayName: opts.name });
      uid = u.uid;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("invalid-email")) throw new Error("E-mail inválido.");
    throw e;
  }
  await adminAuth.setCustomUserClaims(uid, { role: opts.role });
  const now = Date.now();
  const profile: UserProfile = {
    id: uid, email: opts.email, name: opts.name, role: opts.role,
    permissions: opts.permissions ?? DEFAULT_PERMISSIONS[opts.role],
    collaboratorId: opts.collaboratorId, guardianId: opts.guardianId,
    active: true, mustChangePassword: true, createdAt: now, updatedAt: now,
  };
  await Collections.users().doc(uid).set(profile);
  return { uid, password };
}

/** Cria acesso ao sistema para um colaborador. */
export async function grantCollaboratorAccess(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("users.manage");
    const collaboratorId = str(fd, "collaboratorId");
    const role = str(fd, "role") as Role;
    if (!["manager", "professional", "staff"].includes(role)) return fail("Perfil inválido.");
    if (role === "manager" && user.role !== "owner") return fail("Somente o Dono pode criar acesso de Gerente.");
    const c = await getDoc(Collections.collaborators(), collaboratorId);
    if (!c) return fail("Colaborador não encontrado.");
    if (c.userId) return fail("Este colaborador já possui acesso.");
    const email = (str(fd, "email") || c.email || "").toLowerCase();
    if (!email) return fail("Informe um e-mail para o acesso.");
    const { uid, password } = await createAccessUser({ email, name: c.name, role, collaboratorId, password: str(fd, "password") || undefined });
    const batch = db.batch();
    batch.set(Collections.collaborators().doc(collaboratorId), { userId: uid, email, updatedAt: Date.now(), updatedBy: user.id }, { merge: true });
    await audit(actorOf(user), { action: "user.create", entity: "user", entityId: uid, entityLabel: c.name, details: { role, collaboratorId } }, batch);
    await batch.commit();
    // sem revalidatePath: a mensagem com a senha provisória precisa permanecer na tela
    return success(`Acesso criado. E-mail: ${email} · Senha provisória: ${password} (peça para trocar no primeiro acesso).`, uid);
  });
}

/** Cria acesso para um responsável (área da família). */
export async function grantGuardianAccess(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser(["users.manage", "practitioners.manage"]);
    const guardianId = str(fd, "guardianId");
    const g = await getDoc(Collections.guardians(), guardianId);
    if (!g) return fail("Responsável não encontrado.");
    if (g.userId) return fail("Este responsável já possui acesso.");
    const email = (str(fd, "email") || g.email || "").toLowerCase();
    if (!email) return fail("Informe um e-mail para o acesso.");
    const { uid, password } = await createAccessUser({ email, name: g.name, role: "guardian", guardianId, password: str(fd, "password") || undefined });
    const batch = db.batch();
    batch.set(Collections.guardians().doc(guardianId), { userId: uid, email, appAccess: true, updatedAt: Date.now() }, { merge: true });
    await audit(actorOf(user), { action: "user.create", entity: "user", entityId: uid, entityLabel: g.name, details: { role: "guardian", guardianId } }, batch);
    await batch.commit();
    return success(`Acesso criado. E-mail: ${email} · Senha provisória: ${password}.`, uid);
  });
}

export async function setUserActive(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("users.manage");
    const uid = str(fd, "userId");
    const active = str(fd, "active") === "1";
    const target = await getDoc(Collections.users(), uid);
    if (!target) return fail("Usuário não encontrado.");
    if (target.role === "owner" && user.role !== "owner") return fail("Somente o Dono pode alterar outro Dono.");
    if (uid === user.id) return fail("Você não pode desativar o próprio acesso.");
    await adminAuth.updateUser(uid, { disabled: !active });
    if (!active) await adminAuth.revokeRefreshTokens(uid);
    await Collections.users().doc(uid).update({ active, updatedAt: Date.now() });
    await audit(actorOf(user), { action: active ? "user.activate" : "user.deactivate", entity: "user", entityId: uid, entityLabel: target.name });
    revalidatePath("/configuracoes/usuarios");
    return success(active ? "Acesso reativado." : "Acesso desativado.");
  });
}

export async function resetUserPassword(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("users.manage");
    const uid = str(fd, "userId");
    const target = await getDoc(Collections.users(), uid);
    if (!target) return fail("Usuário não encontrado.");
    if (target.role === "owner" && user.role !== "owner") return fail("Somente o Dono pode alterar outro Dono.");
    const password = randomPassword();
    await adminAuth.updateUser(uid, { password });
    await adminAuth.revokeRefreshTokens(uid);
    await Collections.users().doc(uid).update({ mustChangePassword: true, updatedAt: Date.now() });
    await audit(actorOf(user), { action: "user.password.reset", entity: "user", entityId: uid, entityLabel: target.name });
    return success(`Nova senha provisória de ${target.name}: ${password}`);
  });
}

export async function updateUserPermissions(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("users.manage");
    if (user.role !== "owner") return fail("Somente o Dono pode ajustar permissões.");
    const uid = str(fd, "userId");
    const target = await getDoc(Collections.users(), uid);
    if (!target) return fail("Usuário não encontrado.");
    if (target.role === "owner" || target.role === "guardian") return fail("Este perfil não tem permissões ajustáveis.");
    const role = str(fd, "role") as Role;
    if (!["manager", "professional", "staff"].includes(role)) return fail("Perfil inválido.");
    const permissions = list(fd, "permissions").filter((p): p is Permission => (ALL_PERMISSIONS as string[]).includes(p));
    await adminAuth.setCustomUserClaims(uid, { role });
    await Collections.users().doc(uid).update({ role, permissions, updatedAt: Date.now() });
    await audit(actorOf(user), { action: "user.permissions", entity: "user", entityId: uid, entityLabel: target.name, details: { role, permissions } });
    revalidatePath("/configuracoes/usuarios");
    return success("Permissões atualizadas.");
  });
}
