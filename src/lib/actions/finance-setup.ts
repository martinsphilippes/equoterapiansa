"use server";
import { revalidatePath } from "next/cache";
import { actionUser, actorOf } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { audit } from "@/lib/db/audit";
import { financeSettingsRef } from "@/lib/db/queries/finance-ref";
import { seedFinanceDefaults } from "@/lib/db/finance-defaults";
import type { AccountType, CategoryType, DreGroup } from "@/lib/db/finance-types";
import { guard, str, opt, num, bool, success, fail, ISO_DATE, type ActionResult } from "./result";

const P = "/financeiro/configuracoes";

export async function initFinance(): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.setup");
    const created = await seedFinanceDefaults();
    if (created) await audit(actorOf(user), { action: "finance.seed", entity: "finance", entityId: "seed" });
    revalidatePath("/financeiro");
    return success(created ? "Cadastros iniciais criados." : "Cadastros já existentes.");
  });
}

export async function saveCategory(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.setup");
    const id = opt(fd, "id");
    const name = str(fd, "name");
    const type = str(fd, "type") as CategoryType;
    if (!name) return fail("Informe o nome.");
    if (!["income", "expense"].includes(type)) return fail("Tipo inválido.");
    const parentId = opt(fd, "parentId") ?? null;
    if (parentId === id) return fail("Uma categoria não pode ser pai de si mesma.");
    const dreGroup = (opt(fd, "dreGroup") ?? null) as DreGroup | null;
    const data = { name, type, parentId, code: opt(fd, "code"), dreGroup, order: num(fd, "order") ?? 0 };
    if (id) await Collections.financialCategories().doc(id).set(data, { merge: true });
    else { const ref = Collections.financialCategories().doc(); await ref.set({ id: ref.id, ...data, active: true, createdAt: Date.now() }); }
    await audit(actorOf(user), { action: id ? "finance.category.update" : "finance.category.create", entity: "financialCategory", entityId: id ?? name, entityLabel: name, details: data });
    revalidatePath(P);
    return success("Categoria salva.");
  });
}
export async function toggleCategory(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.setup");
    const id = str(fd, "id");
    const c = await getDoc(Collections.financialCategories(), id);
    if (!c) return fail("Categoria não encontrada.");
    await Collections.financialCategories().doc(id).update({ active: !c.active });
    await audit(actorOf(user), { action: "finance.category.toggle", entity: "financialCategory", entityId: id, entityLabel: c.name, details: { active: !c.active } });
    revalidatePath(P);
    return success();
  });
}

export async function saveCostCenter(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.setup");
    const id = opt(fd, "id");
    const name = str(fd, "name");
    if (!name) return fail("Informe o nome.");
    const parentId = opt(fd, "parentId") ?? null;
    if (parentId === id) return fail("Um centro de custo não pode ser pai de si mesmo.");
    if (id) await Collections.costCenters().doc(id).set({ name, parentId }, { merge: true });
    else { const ref = Collections.costCenters().doc(); await ref.set({ id: ref.id, name, parentId, active: true, createdAt: Date.now() }); }
    await audit(actorOf(user), { action: id ? "finance.costCenter.update" : "finance.costCenter.create", entity: "costCenter", entityId: id ?? name, entityLabel: name });
    revalidatePath(P);
    return success("Centro de custo salvo.");
  });
}
export async function toggleCostCenter(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.setup");
    const id = str(fd, "id");
    const c = await getDoc(Collections.costCenters(), id);
    if (!c) return fail("Centro de custo não encontrado.");
    await Collections.costCenters().doc(id).update({ active: !c.active });
    await audit(actorOf(user), { action: "finance.costCenter.toggle", entity: "costCenter", entityId: id, entityLabel: c.name, details: { active: !c.active } });
    revalidatePath(P);
    return success();
  });
}

export async function saveAccount(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.setup");
    const id = opt(fd, "id");
    const name = str(fd, "name");
    if (!name) return fail("Informe o nome da conta.");
    const type = (opt(fd, "type") ?? "bank") as AccountType;
    const initialBalanceDate = opt(fd, "initialBalanceDate") ?? new Date().toISOString().slice(0, 10);
    if (!ISO_DATE.test(initialBalanceDate)) return fail("Data do saldo inicial inválida.");
    const data = { name, type, institution: opt(fd, "institution"), initialBalance: num(fd, "initialBalance") ?? 0, initialBalanceDate };
    if (id) {
      const before = await getDoc(Collections.financialAccounts(), id);
      await Collections.financialAccounts().doc(id).set(data, { merge: true });
      await audit(actorOf(user), { action: "finance.account.update", entity: "financialAccount", entityId: id, entityLabel: name, details: { before: before ? { initialBalance: before.initialBalance, initialBalanceDate: before.initialBalanceDate } : null, after: data } });
    } else {
      const ref = Collections.financialAccounts().doc();
      await ref.set({ id: ref.id, ...data, active: true, createdAt: Date.now() });
      await audit(actorOf(user), { action: "finance.account.create", entity: "financialAccount", entityId: ref.id, entityLabel: name, details: data });
    }
    revalidatePath(P);
    return success("Conta salva.");
  });
}
export async function toggleAccount(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.setup");
    const id = str(fd, "id");
    const a = await getDoc(Collections.financialAccounts(), id);
    if (!a) return fail("Conta não encontrada.");
    await Collections.financialAccounts().doc(id).update({ active: !a.active });
    await audit(actorOf(user), { action: "finance.account.toggle", entity: "financialAccount", entityId: id, entityLabel: a.name, details: { active: !a.active } });
    revalidatePath(P);
    return success();
  });
}

export async function savePaymentMethod(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.setup");
    const id = opt(fd, "id");
    const name = str(fd, "name");
    if (!name) return fail("Informe o nome.");
    if (id) await Collections.paymentMethods().doc(id).set({ name }, { merge: true });
    else { const all = await Collections.paymentMethods().get(); const ref = Collections.paymentMethods().doc(); await ref.set({ id: ref.id, name, order: all.size + 1, active: true }); }
    await audit(actorOf(user), { action: "finance.paymentMethod.save", entity: "paymentMethod", entityId: id ?? name, entityLabel: name });
    revalidatePath(P);
    return success("Forma de pagamento salva.");
  });
}
export async function togglePaymentMethod(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.setup");
    const id = str(fd, "id");
    const m = await getDoc(Collections.paymentMethods(), id);
    if (!m) return fail("Forma não encontrada.");
    await Collections.paymentMethods().doc(id).update({ active: !m.active });
    await audit(actorOf(user), { action: "finance.paymentMethod.toggle", entity: "paymentMethod", entityId: id, entityLabel: m.name, details: { active: !m.active } });
    revalidatePath(P);
    return success();
  });
}

export async function saveSupplier(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.setup");
    const id = opt(fd, "id");
    const name = str(fd, "name");
    if (name.length < 2) return fail("Informe o nome do fornecedor.");
    const now = Date.now();
    const data = { name, taxId: opt(fd, "taxId")?.replace(/\D/g, ""), phone: opt(fd, "phone"), email: opt(fd, "email")?.toLowerCase(), notes: opt(fd, "notes"), bankInfo: opt(fd, "bankInfo"), pix: opt(fd, "pix"), defaultCategoryId: opt(fd, "defaultCategoryId") ?? null, defaultCostCenterId: opt(fd, "defaultCostCenterId") ?? null, updatedAt: now };
    let sid = id;
    if (id) await Collections.suppliers().doc(id).set(data, { merge: true });
    else { const ref = Collections.suppliers().doc(); sid = ref.id; await ref.set({ id: ref.id, ...data, active: true, createdAt: now }); }
    await audit(actorOf(user), { action: id ? "finance.supplier.update" : "finance.supplier.create", entity: "supplier", entityId: sid!, entityLabel: name });
    revalidatePath("/financeiro/fornecedores");
    return success("Fornecedor salvo.", sid, opt(fd, "returnTo") ?? "/financeiro/fornecedores");
  });
}
export async function toggleSupplier(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.setup");
    const id = str(fd, "id");
    const s = await getDoc(Collections.suppliers(), id);
    if (!s) return fail("Fornecedor não encontrado.");
    await Collections.suppliers().doc(id).update({ active: !s.active, updatedAt: Date.now() });
    await audit(actorOf(user), { action: "finance.supplier.toggle", entity: "supplier", entityId: id, entityLabel: s.name, details: { active: !s.active } });
    revalidatePath("/financeiro/fornecedores");
    return success();
  });
}

export async function updateFinanceSettings(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.setup");
    const data = {
      defaultAccountId: opt(fd, "defaultAccountId") ?? null,
      payrollCategoryId: opt(fd, "payrollCategoryId") ?? null,
      payrollCostCenterId: opt(fd, "payrollCostCenterId") ?? null,
      tuitionCategoryId: opt(fd, "tuitionCategoryId") ?? null,
      tuitionCostCenterId: opt(fd, "tuitionCostCenterId") ?? null,
      showToGuardians: bool(fd, "showToGuardians"),
      updatedAt: Date.now(),
    };
    await financeSettingsRef().set(data, { merge: true });
    await audit(actorOf(user), { action: "finance.settings.update", entity: "finance", entityId: "settings", details: data });
    revalidatePath(P);
    return success("Configurações salvas.");
  });
}
