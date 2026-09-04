"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase/admin";
import { actionUser, actorOf, hasPermission } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { audit } from "@/lib/db/audit";
import { applyDeltas, entryDeltas, transactionDeltas } from "@/lib/db/finance-summary";
import { getFinanceSettings, allAccounts } from "@/lib/db/queries/finance-ref";
import { todayFin } from "@/lib/db/queries/finance";
import { addMonths } from "@/lib/domain/dates";
import { dueDateInMonth, round2, splitInstallments, competenceOf } from "@/lib/domain/finance";
import type { FinanceKind, FinancialEntry, FinancialTransaction, Frequency, RecurrenceRule } from "@/lib/db/finance-types";
import { generateFromRule, managePermission, recompute, resolveRefs, settlePermission } from "./finance-shared";
import { guard, str, opt, num, bool, success, fail, ISO_DATE, type ActionResult } from "./result";

const COMP = /^\d{4}-\d{2}$/;
const revalidateFinance = (kind?: FinanceKind, extra: string[] = []) => {
  revalidatePath("/financeiro");
  revalidatePath(kind === "payable" ? "/financeiro/pagar" : "/financeiro/receber");
  revalidatePath("/financeiro/movimentacoes");
  for (const p of extra) revalidatePath(p);
};
const kindPath = (kind: FinanceKind) => (kind === "payable" ? "/financeiro/pagar" : "/financeiro/receber");

/** Cria (com parcelas ou recorrência) ou edita um lançamento. */
export async function saveEntry(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const kind = str(fd, "kind") as FinanceKind;
    if (!["receivable", "payable"].includes(kind)) return fail("Tipo inválido.");
    const user = await actionUser(managePermission(kind));
    const today = await todayFin();
    const id = opt(fd, "id");
    const description = str(fd, "description");
    if (description.length < 2) return fail("Informe a descrição.");
    const amount = num(fd, "amount");
    if (amount === undefined || amount <= 0) return fail("Informe um valor maior que zero.");
    const dueDate = str(fd, "dueDate");
    if (!ISO_DATE.test(dueDate)) return fail("Vencimento inválido.");
    const issueDate = opt(fd, "issueDate") ?? today;
    if (!ISO_DATE.test(issueDate)) return fail("Data de emissão inválida.");
    const competence = opt(fd, "competence") ?? competenceOf(dueDate);
    if (!COMP.test(competence)) return fail("Competência inválida.");
    const discount = num(fd, "discount") ?? 0, interest = num(fd, "interest") ?? 0, fine = num(fd, "fine") ?? 0;
    if (discount < 0 || interest < 0 || fine < 0) return fail("Descontos e acréscimos não podem ser negativos.");
    if (discount > amount) return fail("Desconto maior que o valor.");
    const refs = {
      categoryId: str(fd, "categoryId"), costCenterId: opt(fd, "costCenterId") ?? null, accountId: opt(fd, "accountId") ?? null,
      practitionerId: kind === "receivable" ? opt(fd, "practitionerId") ?? null : null, guardianId: kind === "receivable" ? opt(fd, "guardianId") ?? null : null,
      collaboratorId: kind === "payable" ? opt(fd, "collaboratorId") ?? null : null, supplierId: kind === "payable" ? opt(fd, "supplierId") ?? null : null,
    };
    const names = await resolveRefs(refs);
    if (names.category.type !== (kind === "receivable" ? "income" : "expense")) return fail("A categoria não corresponde ao tipo do lançamento.");
    const common = {
      description, discount, interest, fine, competence, issueDate, categoryId: refs.categoryId, categoryName: names.categoryName,
      costCenterId: refs.costCenterId, costCenterName: names.costCenterName, accountId: refs.accountId, paymentMethodId: opt(fd, "paymentMethodId") ?? null,
      practitionerId: refs.practitionerId, practitionerName: names.practitionerName, guardianId: refs.guardianId, guardianName: names.guardianName,
      collaboratorId: refs.collaboratorId, collaboratorName: names.collaboratorName, supplierId: refs.supplierId, supplierName: names.supplierName,
      reference: opt(fd, "reference"), notes: opt(fd, "notes"), visibleToGuardian: kind === "receivable" && (fd.has("visibleToGuardian") ? fd.getAll("visibleToGuardian").some((v) => v === "on" || v === "1" || v === "true") : true),
    };
    const now = Date.now();

    if (id) {
      const before = await getDoc(Collections.financialEntries(), id);
      if (!before || before.kind !== kind) return fail("Lançamento não encontrado.");
      if (before.status === "cancelled") return fail("Lançamento cancelado não pode ser editado.");
      const after = recompute({ ...before, ...common, amount, dueDate, updatedAt: now, updatedBy: user.id }, today);
      if (after.netAmount < before.paidAmount - 0.004) return fail("O valor líquido não pode ser menor que o já liquidado.");
      const batch = db.batch();
      batch.set(Collections.financialEntries().doc(id), after);
      applyDeltas(batch, entryDeltas(after, 1, entryDeltas(before, -1)));
      await audit(actorOf(user), { action: "finance.entry.update", entity: "financialEntry", entityId: id, entityLabel: description, details: { before: pick(before), after: pick(after) } }, batch);
      await batch.commit();
      revalidateFinance(kind, [`${kindPath(kind)}/${id}`]);
      return success("Lançamento atualizado.", id);
    }

    // Criação: parcelas (n ≥ 1) ou recorrência
    const installments = Math.min(120, Math.max(1, Math.round(num(fd, "installments") ?? 1)));
    const frequency = opt(fd, "frequency") as Frequency | undefined;
    const batch = db.batch();
    const created: FinancialEntry[] = [];
    let recurrenceId: string | null = null;
    if (frequency && frequency !== ("none" as string)) {
      const rule = Collections.recurrenceRules().doc();
      recurrenceId = rule.id;
      const endDate = opt(fd, "endDate") ?? null;
      const dueDay = Number(dueDate.slice(8, 10));
      const r: RecurrenceRule = {
        id: rule.id, kind, frequency, intervalMonths: frequency === "custom" ? Math.max(1, num(fd, "intervalMonths") ?? 1) : null, dueDay, startDate: dueDate, endDate,
        nextDueDate: dueDate, generatedCount: 0, active: true, createdAt: now, updatedAt: now,
        template: { description, amount, categoryId: refs.categoryId, categoryName: names.categoryName, costCenterId: refs.costCenterId, costCenterName: names.costCenterName, accountId: refs.accountId, paymentMethodId: common.paymentMethodId, supplierId: refs.supplierId, supplierName: names.supplierName, collaboratorId: refs.collaboratorId, collaboratorName: names.collaboratorName, practitionerId: refs.practitionerId, practitionerName: names.practitionerName, guardianId: refs.guardianId, guardianName: names.guardianName, notes: common.notes },
      };
      // gera até o fim do mês atual (as seguintes são geradas sob demanda)
      const gen = generateFromRule(r, addMonths(today.slice(0, 7), 0), today, user.id);
      for (const e of gen.entries) { batch.set(Collections.financialEntries().doc(e.id), e); created.push(e); }
      batch.set(rule, { ...r, nextDueDate: gen.nextDueDate, generatedCount: gen.entries.length });
      await audit(actorOf(user), { action: "finance.recurrence.create", entity: "recurrenceRule", entityId: rule.id, entityLabel: description, details: { frequency, amount, generated: gen.entries.length } }, batch);
    } else {
      const parts = splitInstallments(amount, installments);
      const groupId = installments > 1 ? Collections.financialEntries().doc().id : null;
      for (let i = 0; i < installments; i++) {
        const ref = groupId ? Collections.financialEntries().doc(`inst_${groupId}_${i + 1}`) : Collections.financialEntries().doc();
        const due = i === 0 ? dueDate : dueDateInMonth(addMonths(dueDate.slice(0, 7), i), Number(dueDate.slice(8, 10)));
        const e = recompute({
          ...common, id: ref.id, kind, amount: parts[i], discount: i === 0 ? discount : 0, interest: i === 0 ? interest : 0, fine: i === 0 ? fine : 0,
          netAmount: 0, paidAmount: 0, openAmount: 0, status: "pending", competence: installments > 1 ? competenceOf(due) : competence, dueDate: due,
          description: installments > 1 ? `${description} (${i + 1}/${installments})` : description,
          installment: groupId ? { number: i + 1, total: installments, groupId } : null, recurrenceId: null, payrollMonthId: null, billingPlanId: null,
          createdAt: now, createdBy: user.id, updatedAt: now, updatedBy: user.id,
        } as FinancialEntry, today);
        batch.set(ref, e); created.push(e);
      }
    }
    const deltas = created.reduce((d, e) => entryDeltas(e, 1, d), {} as Record<string, Record<string, number>>);
    applyDeltas(batch, deltas);
    await audit(actorOf(user), { action: "finance.entry.create", entity: "financialEntry", entityId: created[0]?.id ?? "", entityLabel: description, details: { kind, count: created.length, amount, recurrenceId } }, batch);
    await batch.commit();
    revalidateFinance(kind);
    const returnTo = opt(fd, "returnTo");
    return success(created.length > 1 ? `${created.length} lançamentos criados.` : "Lançamento criado.", created[0]?.id, returnTo ?? (created.length === 1 ? `${kindPath(kind)}/${created[0].id}` : kindPath(kind)));
  });
}

function pick(e: FinancialEntry) {
  return { description: e.description, amount: e.amount, discount: e.discount, interest: e.interest, fine: e.fine, netAmount: e.netAmount, dueDate: e.dueDate, competence: e.competence, categoryId: e.categoryId, costCenterId: e.costCenterId, status: e.status };
}

/** Gera as ocorrências pendentes de todas as regras ativas até o mês informado. */
export async function generateRecurrences(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser(["finance.receivables.manage", "finance.payables.manage"]);
    const today = await todayFin();
    const upTo = opt(fd, "upTo") ?? addMonths(today.slice(0, 7), 1);
    if (!COMP.test(upTo)) return fail("Mês inválido.");
    const rules = (await Collections.recurrenceRules().where("active", "==", true).get()).docs.map((d) => d.data());
    let total = 0;
    for (const r of rules) {
      if (!hasPermission(user, managePermission(r.kind))) continue;
      const gen = generateFromRule(r, upTo, today, user.id);
      if (gen.entries.length === 0) continue;
      // evita duplicar se já existirem (ids determinísticos)
      const existing = await db.getAll(...gen.entries.map((e) => Collections.financialEntries().doc(e.id)));
      const fresh = gen.entries.filter((_, i) => !existing[i].exists);
      const batch = db.batch();
      for (const e of fresh) batch.set(Collections.financialEntries().doc(e.id), e);
      applyDeltas(batch, fresh.reduce((d, e) => entryDeltas(e, 1, d), {} as Record<string, Record<string, number>>));
      batch.update(Collections.recurrenceRules().doc(r.id), { nextDueDate: gen.nextDueDate, generatedCount: r.generatedCount + fresh.length, updatedAt: Date.now(), ...(r.endDate && gen.nextDueDate > r.endDate ? { active: false } : {}) });
      await batch.commit();
      total += fresh.length;
    }
    if (total) await audit(actorOf(user), { action: "finance.recurrence.generate", entity: "recurrenceRule", entityId: upTo, details: { upTo, generated: total } });
    revalidateFinance();
    revalidatePath("/financeiro/recorrencias");
    return success(total ? `${total} lançamento(s) gerado(s).` : "Nada a gerar: lançamentos já existem até o mês informado.");
  });
}

/** Edita esta e as futuras ocorrências (valor/descrição/categoria) e a regra. */
export async function updateRecurrenceFuture(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const id = str(fd, "id");
    const rule = await getDoc(Collections.recurrenceRules(), id);
    if (!rule) return fail("Recorrência não encontrada.");
    const user = await actionUser(managePermission(rule.kind));
    const today = await todayFin();
    const fromDate = opt(fd, "fromDate") ?? today;
    const amount = num(fd, "amount") ?? rule.template.amount;
    const description = opt(fd, "description") ?? rule.template.description;
    const endDate = fd.has("endDate") ? (opt(fd, "endDate") ?? null) : rule.endDate ?? null;
    const active = bool(fd, "active") || !fd.has("active") ? rule.active : false;
    if (amount <= 0) return fail("Valor inválido.");
    const future = (await Collections.financialEntries().where("recurrenceId", "==", id).where("dueDate", ">=", fromDate).get()).docs.map((d) => d.data()).filter((e) => e.status !== "cancelled" && e.status !== "paid" && e.paidAmount === 0);
    const batch = db.batch();
    const deltas: Record<string, Record<string, number>> = {};
    for (const e of future) {
      const after = recompute({ ...e, amount, description, updatedAt: Date.now(), updatedBy: user.id }, today);
      batch.set(Collections.financialEntries().doc(e.id), after);
      entryDeltas(e, -1, deltas); entryDeltas(after, 1, deltas);
    }
    applyDeltas(batch, deltas);
    batch.set(Collections.recurrenceRules().doc(id), { template: { ...rule.template, amount, description }, endDate, active: endDate && rule.nextDueDate > endDate ? false : active, updatedAt: Date.now() }, { merge: true });
    await audit(actorOf(user), { action: "finance.recurrence.updateFuture", entity: "recurrenceRule", entityId: id, entityLabel: description, details: { fromDate, amount, endDate, updatedEntries: future.length, before: { amount: rule.template.amount, description: rule.template.description, endDate: rule.endDate } } }, batch);
    await batch.commit();
    revalidateFinance(rule.kind, ["/financeiro/recorrencias"]);
    return success(`Regra atualizada (${future.length} ocorrência(s) futura(s) ajustada(s)).`);
  });
}

/** Encerra a recorrência a partir de uma data: cancela ocorrências futuras em aberto e desativa a regra. */
export async function cancelRecurrenceFuture(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const id = str(fd, "id");
    const rule = await getDoc(Collections.recurrenceRules(), id);
    if (!rule) return fail("Recorrência não encontrada.");
    const user = await actionUser(managePermission(rule.kind));
    const today = await todayFin();
    const fromDate = opt(fd, "fromDate") ?? today;
    const future = (await Collections.financialEntries().where("recurrenceId", "==", id).where("dueDate", ">=", fromDate).get()).docs.map((d) => d.data()).filter((e) => e.status !== "cancelled" && e.paidAmount === 0);
    const batch = db.batch();
    const deltas: Record<string, Record<string, number>> = {};
    for (const e of future) {
      batch.set(Collections.financialEntries().doc(e.id), { status: "cancelled", openAmount: 0, cancelledAt: Date.now(), cancelReason: "Recorrência encerrada", updatedAt: Date.now(), updatedBy: user.id }, { merge: true });
      entryDeltas(e, -1, deltas);
    }
    applyDeltas(batch, deltas);
    batch.set(Collections.recurrenceRules().doc(id), { active: false, endDate: fromDate, updatedAt: Date.now() }, { merge: true });
    await audit(actorOf(user), { action: "finance.recurrence.cancelFuture", entity: "recurrenceRule", entityId: id, entityLabel: rule.template.description, details: { fromDate, cancelled: future.length } }, batch);
    await batch.commit();
    revalidateFinance(rule.kind, ["/financeiro/recorrencias"]);
    return success(`Recorrência encerrada. ${future.length} ocorrência(s) cancelada(s).`);
  });
}

/** Cancelamento lógico (mantém histórico). Não permitido com valores liquidados: estorne antes. */
export async function cancelEntry(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const id = str(fd, "id");
    const e = await getDoc(Collections.financialEntries(), id);
    if (!e) return fail("Lançamento não encontrado.");
    const user = await actionUser(managePermission(e.kind));
    if (e.status === "cancelled") return fail("Já cancelado.");
    if (e.paidAmount > 0) return fail("Há valores liquidados. Estorne as movimentações antes de cancelar.");
    const reason = str(fd, "reason") || "Cancelado";
    const batch = db.batch();
    batch.set(Collections.financialEntries().doc(id), { status: "cancelled", openAmount: 0, cancelledAt: Date.now(), cancelReason: reason, updatedAt: Date.now(), updatedBy: user.id }, { merge: true });
    applyDeltas(batch, entryDeltas(e, -1));
    if (e.payrollMonthId) batch.set(Collections.payrollMonths().doc(e.payrollMonthId), { payableId: null, updatedAt: Date.now(), updatedBy: user.id }, { merge: true });
    await audit(actorOf(user), { action: "finance.entry.cancel", entity: "financialEntry", entityId: id, entityLabel: e.description, details: { reason, before: pick(e) } }, batch);
    await batch.commit();
    revalidateFinance(e.kind, [`${kindPath(e.kind)}/${id}`]);
    return success("Lançamento cancelado.");
  });
}

/** Registra recebimento/pagamento (total ou parcial) criando a movimentação. */
export async function settleEntry(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const id = str(fd, "id");
    const e = await getDoc(Collections.financialEntries(), id);
    if (!e) return fail("Lançamento não encontrado.");
    const user = await actionUser(settlePermission(e.kind));
    if (e.status === "cancelled") return fail("Lançamento cancelado.");
    if (e.openAmount <= 0) return fail("Lançamento já liquidado.");
    const today = await todayFin();
    const date = opt(fd, "date") ?? today;
    if (!ISO_DATE.test(date)) return fail("Data inválida.");
    const settings = await getFinanceSettings();
    const accountId = opt(fd, "accountId") ?? e.accountId ?? settings.defaultAccountId ?? "";
    const account = (await allAccounts()).find((a) => a.id === accountId && a.active);
    if (!account) return fail("Selecione a conta financeira.");
    // ajustes no ato (desconto/juros/multa) alteram o valor líquido antes de liquidar
    const extraDiscount = num(fd, "extraDiscount") ?? 0, extraInterest = num(fd, "extraInterest") ?? 0, extraFine = num(fd, "extraFine") ?? 0;
    let entry: FinancialEntry = { ...e, discount: round2(e.discount + extraDiscount), interest: round2(e.interest + extraInterest), fine: round2(e.fine + extraFine) };
    entry = recompute(entry, today);
    const amount = round2(num(fd, "amount") ?? entry.openAmount);
    if (amount <= 0) return fail("Valor inválido.");
    if (amount > entry.openAmount + 0.004) return fail(`Valor maior que o saldo em aberto (${entry.openAmount.toFixed(2)}).`);
    const now = Date.now();
    const txRef = Collections.financialTransactions().doc();
    const tx: FinancialTransaction = {
      id: txRef.id, type: e.kind === "receivable" ? "in" : "out", amount, date, accountId, accountName: account.name, entryId: e.id, entryKind: e.kind, entryCompetence: e.competence,
      categoryId: e.categoryId, categoryName: e.categoryName, costCenterId: e.costCenterId ?? null, paymentMethodId: opt(fd, "paymentMethodId") ?? e.paymentMethodId ?? null,
      description: e.description, notes: opt(fd, "notes"), reconciled: false, reversed: false, createdAt: now, createdBy: user.id, updatedAt: now, updatedBy: user.id,
    };
    const after = recompute({ ...entry, paidAmount: round2(entry.paidAmount + amount), updatedAt: now, updatedBy: user.id }, today);
    if (after.status === "paid") after.settledDate = date;
    const batch = db.batch();
    batch.set(txRef, tx);
    batch.set(Collections.financialEntries().doc(e.id), after);
    const deltas = transactionDeltas(tx, 1, entryDeltas(after, 1, entryDeltas(e, -1)));
    applyDeltas(batch, deltas);
    // Integração com a ficha mensal do colaborador
    if (after.payrollMonthId && after.status === "paid") {
      batch.set(Collections.payrollMonths().doc(after.payrollMonthId), { status: "paid", frozen: true, paidAt: date, paidAmount: after.paidAmount, updatedAt: now, updatedBy: user.id }, { merge: true });
    }
    await audit(actorOf(user), { action: e.kind === "receivable" ? "finance.receive" : "finance.pay", entity: "financialEntry", entityId: e.id, entityLabel: e.description, details: { amount, date, accountId, transactionId: txRef.id, statusAfter: after.status, extras: { extraDiscount, extraInterest, extraFine } } }, batch);
    await batch.commit();
    revalidateFinance(e.kind, [`${kindPath(e.kind)}/${id}`, "/pagamentos"]);
    return success(after.status === "paid" ? "Liquidado." : `Registrado. Saldo em aberto: R$ ${after.openAmount.toFixed(2)}`);
  });
}

/** Estorno de uma movimentação (mantém o registro, marca como estornada e devolve o saldo ao lançamento). */
export async function reverseTransaction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const id = str(fd, "id");
    const tx = await getDoc(Collections.financialTransactions(), id);
    if (!tx) return fail("Movimentação não encontrada.");
    const user = await actionUser(tx.entryKind ? settlePermission(tx.entryKind) : "finance.reconcile");
    if (tx.reversed) return fail("Já estornada.");
    if (tx.transferId) return fail("Transferências são estornadas em par pela tela de movimentações.");
    const today = await todayFin();
    const reason = str(fd, "reason") || "Estorno";
    const now = Date.now();
    const batch = db.batch();
    batch.set(Collections.financialTransactions().doc(id), { reversed: true, reversedAt: now, reversalReason: reason, updatedAt: now, updatedBy: user.id }, { merge: true });
    const deltas = transactionDeltas(tx, -1);
    if (tx.entryId) {
      const e = await getDoc(Collections.financialEntries(), tx.entryId);
      if (e) {
        const after = recompute({ ...e, paidAmount: round2(e.paidAmount - tx.amount), settledDate: null, updatedAt: now, updatedBy: user.id }, today);
        batch.set(Collections.financialEntries().doc(e.id), after);
        entryDeltas(e, -1, deltas); entryDeltas(after, 1, deltas);
        if (e.payrollMonthId && after.status !== "paid") batch.set(Collections.payrollMonths().doc(e.payrollMonthId), { status: "unpaid", frozen: false, paidAt: null, paidAmount: null, updatedAt: now, updatedBy: user.id }, { merge: true });
      }
    }
    applyDeltas(batch, deltas);
    await audit(actorOf(user), { action: "finance.transaction.reverse", entity: "financialTransaction", entityId: id, entityLabel: tx.description, details: { reason, amount: tx.amount, entryId: tx.entryId } }, batch);
    await batch.commit();
    revalidateFinance(tx.entryKind ?? undefined, tx.entryId && tx.entryKind ? [`${kindPath(tx.entryKind)}/${tx.entryId}`, "/pagamentos"] : []);
    return success("Movimentação estornada.");
  });
}

/** Transferência entre contas: duas movimentações vinculadas, sem efeito em receita/despesa. */
export async function transferBetweenAccounts(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.reconcile");
    const today = await todayFin();
    const from = str(fd, "fromAccountId"), to = str(fd, "toAccountId");
    const amount = num(fd, "amount");
    const date = opt(fd, "date") ?? today;
    if (!from || !to || from === to) return fail("Escolha contas de origem e destino diferentes.");
    if (amount === undefined || amount <= 0) return fail("Valor inválido.");
    if (!ISO_DATE.test(date)) return fail("Data inválida.");
    const accs = await allAccounts();
    const a = accs.find((x) => x.id === from), b = accs.find((x) => x.id === to);
    if (!a || !b) return fail("Conta não encontrada.");
    const now = Date.now();
    const transferId = Collections.financialTransactions().doc().id;
    const desc = opt(fd, "description") ?? `Transferência ${a.name} → ${b.name}`;
    const base = { amount: round2(amount), date, transferId, description: desc, notes: opt(fd, "notes"), reconciled: false, reversed: false, createdAt: now, createdBy: user.id, updatedAt: now, updatedBy: user.id, entryId: null, entryKind: null, entryCompetence: null, categoryId: null, categoryName: null, costCenterId: null, paymentMethodId: null };
    const outRef = Collections.financialTransactions().doc(), inRef = Collections.financialTransactions().doc();
    const batch = db.batch();
    batch.set(outRef, { ...base, id: outRef.id, type: "transfer_out", accountId: a.id, accountName: a.name } as FinancialTransaction);
    batch.set(inRef, { ...base, id: inRef.id, type: "transfer_in", accountId: b.id, accountName: b.name } as FinancialTransaction);
    await audit(actorOf(user), { action: "finance.transfer", entity: "financialTransaction", entityId: transferId, entityLabel: desc, details: { amount, date, from: a.name, to: b.name } }, batch);
    await batch.commit();
    revalidateFinance();
    return success("Transferência registrada.");
  });
}

/** Estorna as duas pernas de uma transferência. */
export async function reverseTransfer(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.reconcile");
    const transferId = str(fd, "transferId");
    const legs = (await Collections.financialTransactions().where("transferId", "==", transferId).get()).docs.map((d) => d.data());
    if (legs.length === 0) return fail("Transferência não encontrada.");
    if (legs.some((l) => l.reversed)) return fail("Já estornada.");
    const now = Date.now();
    const batch = db.batch();
    for (const l of legs) batch.set(Collections.financialTransactions().doc(l.id), { reversed: true, reversedAt: now, reversalReason: str(fd, "reason") || "Estorno", updatedAt: now, updatedBy: user.id }, { merge: true });
    await audit(actorOf(user), { action: "finance.transfer.reverse", entity: "financialTransaction", entityId: transferId, entityLabel: legs[0].description }, batch);
    await batch.commit();
    revalidateFinance();
    return success("Transferência estornada.");
  });
}

/** Conciliação manual: conferir, corrigir conta/data e anotar. */
export async function reconcileTransaction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.reconcile");
    const id = str(fd, "id");
    const tx = await getDoc(Collections.financialTransactions(), id);
    if (!tx) return fail("Movimentação não encontrada.");
    if (tx.reversed) return fail("Movimentação estornada.");
    const now = Date.now();
    const patch: Partial<FinancialTransaction> = { updatedAt: now, updatedBy: user.id };
    if (fd.has("toggle")) { patch.reconciled = !tx.reconciled; patch.reconciledAt = !tx.reconciled ? now : null; patch.reconciledBy = !tx.reconciled ? user.id : null; }
    const date = opt(fd, "date"); const accountId = opt(fd, "accountId"); const notes = fd.has("notes") ? opt(fd, "notes") ?? "" : undefined;
    if (date) { if (!ISO_DATE.test(date)) return fail("Data inválida."); patch.date = date; }
    if (accountId) { const acc = (await allAccounts()).find((a) => a.id === accountId); if (!acc) return fail("Conta inválida."); patch.accountId = acc.id; patch.accountName = acc.name; }
    if (notes !== undefined) patch.notes = notes;
    const after = { ...tx, ...patch };
    const batch = db.batch();
    batch.set(Collections.financialTransactions().doc(id), after);
    if (patch.date && patch.date.slice(0, 7) !== tx.date.slice(0, 7)) applyDeltas(batch, transactionDeltas(after, 1, transactionDeltas(tx, -1)));
    await audit(actorOf(user), { action: "finance.reconcile", entity: "financialTransaction", entityId: id, entityLabel: tx.description, details: { before: { date: tx.date, accountId: tx.accountId, reconciled: tx.reconciled }, after: { date: after.date, accountId: after.accountId, reconciled: after.reconciled } } }, batch);
    await batch.commit();
    revalidateFinance();
    return success();
  });
}
