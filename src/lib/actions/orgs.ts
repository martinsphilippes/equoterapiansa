"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Collections } from "@/lib/db/collections";
import { DEFAULT_ORG_ID, runInOrg, slugifyOrgId, withOrgScope } from "@/lib/db/org-context";
import { audit } from "@/lib/db/audit";
import { actionUser, actorOf, orgsOf, ORG_COOKIE } from "@/lib/auth/session";
import { seedDefaults } from "@/lib/db/seed";
import { seedFinanceDefaults } from "@/lib/db/finance-defaults";
import { createMissingIndexes } from "@/lib/db/index-admin";
import { getOrganization, listOrganizations } from "@/lib/db/queries/orgs";
import { guard, str, opt, success, fail, type ActionResult } from "./result";
import type { Organization } from "@/lib/db/types";

/** Troca a unidade em uso. Só aceita unidades a que a pessoa tem acesso. */
export async function switchOrg(fd: FormData): Promise<void> {
  return withOrgScope(async () => {
    const user = await actionUser();
    const target = str(fd, "orgId");
    if (!orgsOf(user).includes(target)) throw new Error("Você não tem acesso a esta unidade.");
    const store = await cookies();
    store.set(ORG_COOKIE, target, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    redirect(user.role === "guardian" ? "/familia" : "/painel");
  });
}

/**
 * Cria uma unidade: coleções próprias, cadastros iniciais e índices. Os dados
 * ficam separados dos da unidade atual desde o primeiro registro.
 */
export async function createOrg(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("settings.manage");
    if (user.role !== "owner") return fail("Somente o Dono pode criar unidades.");
    const name = str(fd, "name");
    if (name.length < 3) return fail("Informe o nome da unidade.");
    const id = slugifyOrgId(name);
    if (!id) return fail("Nome inválido para gerar o identificador da unidade.");
    if (id === DEFAULT_ORG_ID) return fail("Este identificador é reservado.");
    if (await getOrganization(id)) return fail("Já existe uma unidade com este nome.");

    const now = Date.now();
    const org: Organization = { id, name, city: opt(fd, "city"), active: true, createdAt: now, createdBy: user.id };
    await Collections.organizations().doc(id).set(org);

    // Cadastros iniciais e índices são criados dentro da unidade nova.
    await runInOrg(id, async () => {
      await seedDefaults(name);
      await seedFinanceDefaults();
      try { await createMissingIndexes(); } catch { /* índices podem ser criados depois na tela do financeiro */ }
    });

    // O Dono passa a ter acesso às duas.
    const orgIds = Array.from(new Set([...(user.orgIds ?? []), id])).filter((o) => o !== (user.orgId ?? DEFAULT_ORG_ID));
    await Collections.users().doc(user.id).update({ orgIds, updatedAt: now });
    await audit(actorOf(user), { action: "org.create", entity: "organization", entityId: id, entityLabel: name });
    revalidatePath("/configuracoes");
    return success(`Unidade ${name} criada. Use o seletor no topo para entrar nela.`);
  });
}

/** Renomeia a unidade. O identificador (e as coleções) não mudam. */
export async function renameOrg(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("settings.manage");
    if (user.role !== "owner") return fail("Somente o Dono pode editar unidades.");
    const id = str(fd, "id");
    const org = await getOrganization(id);
    if (!org) return fail("Unidade não encontrada.");
    const name = str(fd, "name");
    if (name.length < 3) return fail("Informe o nome da unidade.");
    await Collections.organizations().doc(id).update({ name, city: opt(fd, "city") ?? "", updatedAt: Date.now() });
    await audit(actorOf(user), { action: "org.update", entity: "organization", entityId: id, entityLabel: name, details: { before: { name: org.name, city: org.city } } });
    revalidatePath("/configuracoes");
    return success("Unidade atualizada.");
  });
}

/** Dá ou tira o acesso de um usuário a uma unidade adicional. */
export async function setUserOrgs(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("users.manage");
    if (user.role !== "owner") return fail("Somente o Dono pode mudar a unidade de um usuário.");
    const uid = str(fd, "userId");
    const target = (await Collections.users().doc(uid).get()).data();
    if (!target) return fail("Usuário não encontrado.");
    const orgId = str(fd, "orgId");
    const orgs = await listOrganizations();
    if (!orgs.some((o) => o.id === orgId)) return fail("Unidade inválida.");
    const extras = orgs.filter((o) => o.id !== orgId && fd.getAll("orgIds").includes(o.id)).map((o) => o.id);
    await Collections.users().doc(uid).update({ orgId, orgIds: extras, updatedAt: Date.now() });
    await audit(actorOf(user), { action: "user.orgs", entity: "user", entityId: uid, entityLabel: target.name, details: { before: { orgId: target.orgId, orgIds: target.orgIds }, after: { orgId, orgIds: extras } } });
    revalidatePath("/configuracoes/usuarios");
    return success("Unidade do usuário atualizada.");
  });
}
