"use server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { actionUser, actorOf, SESSION_COOKIE } from "@/lib/auth/session";
import { Collections } from "@/lib/db/collections";
import { audit } from "@/lib/db/audit";
import { guard, str, success, fail, type ActionResult } from "./result";

/**
 * Troca a senha e encerra todas as sessões (inclusive em outros aparelhos).
 * O usuário entra novamente com a nova senha.
 */
export async function changePassword(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser();
    const password = str(fd, "password");
    const confirm = str(fd, "confirm");
    if (password.length < 8) return fail("A senha deve ter pelo menos 8 caracteres.");
    if (password !== confirm) return fail("As senhas não conferem.");
    await adminAuth.updateUser(user.id, { password });
    await adminAuth.revokeRefreshTokens(user.id);
    await Collections.users().doc(user.id).update({ mustChangePassword: false, updatedAt: Date.now() });
    await audit(actorOf(user), { action: "password.change", entity: "user", entityId: user.id, entityLabel: user.name });
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    return success("Senha alterada.", undefined, "/entrar?msg=senha-alterada");
  });
}

export async function updateProfileName(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser();
    const name = str(fd, "name");
    if (name.length < 2) return fail("Informe seu nome.");
    await Collections.users().doc(user.id).update({ name, updatedAt: Date.now() });
    await adminAuth.updateUser(user.id, { displayName: name });
    return success("Nome atualizado.");
  });
}
