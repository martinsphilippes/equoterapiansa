import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFinance } from "@/lib/auth/finance-access";
import { hasPermission } from "@/lib/auth/session";
import { getEntry, listEntries, todayFin, transactionsOfEntry } from "@/lib/db/queries/finance";
import { financeRefData, treeOrder } from "@/lib/db/queries/finance-ref";
import { listPractitioners, listGuardians } from "@/lib/db/queries/practitioners";
import { listCollaborators } from "@/lib/db/queries/collaborators";
import { Card, DescriptionList, EmptyState, Field, Input, LinkButton, PageHeader, Select, Stat, Badge } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { MonthNav } from "@/components/time/MonthNav";
import { EntryList } from "./EntryList";
import { EntryForm, type EntryFormRefs } from "./EntryForm";
import { SettleForm } from "./SettleForm";
import { EntryStatusBadge } from "./EntryStatusBadge";
import { Money } from "./Money";
import { cancelEntry, reverseTransaction } from "@/lib/actions/finance-entries";
import { displayStatus, daysLate } from "@/lib/domain/finance";
import { competenceLabel, isoToBR, formatDateTime } from "@/lib/domain/dates";
import { managePermission, settlePermission, viewPermission } from "@/lib/actions/finance-shared";
import type { FinanceKind, FinancialEntry } from "@/lib/db/finance-types";
import { sp1 } from "@/lib/types";

const label = (k: FinanceKind) => (k === "receivable" ? "Contas a receber" : "Contas a pagar");
const base = (k: FinanceKind) => (k === "receivable" ? "/financeiro/receber" : "/financeiro/pagar");

export async function buildRefs(kind: FinanceKind): Promise<EntryFormRefs> {
  const ref = await financeRefData();
  const type = kind === "receivable" ? "income" : "expense";
  const refs: EntryFormRefs = {
    categories: treeOrder(ref.categories.filter((c) => c.type === type)).map((c) => ({ id: c.id, name: c.name, depth: c.depth })),
    costCenters: treeOrder(ref.costCenters).map((c) => ({ id: c.id, name: c.name, depth: c.depth })),
    accounts: ref.accounts.map((a) => ({ id: a.id, name: a.name })),
    methods: ref.methods.map((m) => ({ id: m.id, name: m.name })),
  };
  if (kind === "receivable") {
    const user = await requireFinance();
    const [practitioners, guardians] = await Promise.all([listPractitioners(user, { status: "all" }), listGuardians()]);
    refs.practitioners = practitioners.map((p) => ({ id: p.id, name: p.name, guardianIds: p.guardianIds }));
    refs.guardians = guardians.map((g) => ({ id: g.id, name: g.name }));
  } else {
    const collaborators = await listCollaborators({ status: "all" });
    refs.suppliers = ref.suppliers.map((s) => ({ id: s.id, name: s.name }));
    refs.collaborators = collaborators.map((c) => ({ id: c.id, name: c.name }));
  }
  return refs;
}

export async function EntriesIndex({ kind, sp }: { kind: FinanceKind; sp: Record<string, string | string[] | undefined> }) {
  const user = await requireFinance([viewPermission(kind), managePermission(kind), settlePermission(kind)]);
  const today = await todayFin();
  const status = (sp1(sp, "status") ?? "open") as "open" | "paid" | "cancelled" | "all" | "overdue";
  const month = sp1(sp, "mes") ?? today.slice(0, 7);
  const ref = await financeRefData();
  const entries = await listEntries({ kind, month: status === "overdue" ? undefined : month, status: status === "overdue" ? "open" : status, overdueOnly: status === "overdue", categoryId: sp1(sp, "categoria"), costCenterId: sp1(sp, "centro") });
  const open = entries.filter((e) => e.openAmount > 0 && e.status !== "cancelled");
  const total = entries.filter((e) => e.status !== "cancelled").reduce((a, e) => a + e.netAmount, 0);
  const paid = entries.filter((e) => e.status !== "cancelled").reduce((a, e) => a + e.paidAmount, 0);
  const canManage = hasPermission(user, managePermission(kind));
  const q = (k: string, v: string) => { const p = new URLSearchParams({ mes: month, status, ...(sp1(sp, "categoria") ? { categoria: sp1(sp, "categoria")! } : {}), ...(sp1(sp, "centro") ? { centro: sp1(sp, "centro")! } : {}) }); p.set(k, v); return `${base(kind)}?${p}`; };
  return (
    <div className="space-y-4">
      <PageHeader title={label(kind)} subtitle={status === "overdue" ? "Todos os vencidos em aberto" : `Vencimentos em ${competenceLabel(month)}`} actions={canManage && <LinkButton href={`${base(kind)}/novo`} size="sm">+ {kind === "receivable" ? "Receita" : "Despesa"}</LinkButton>} />
      {status !== "overdue" && <MonthNav competence={month} basePath={`${base(kind)}?status=${status}`} />}
      <div className="flex flex-wrap gap-2 items-center no-print">
        {([["open", "Em aberto"], ["overdue", "Vencidos"], ["paid", "Liquidados"], ["cancelled", "Cancelados"], ["all", "Todos"]] as const).map(([v, l]) => (
          <Link prefetch={false} key={v} href={q("status", v) as never} className={`px-3 py-1.5 rounded-full text-sm font-semibold ${status === v ? "bg-primary text-white" : "bg-surface border border-border text-ink-700"}`}>{l}</Link>
        ))}
        <form className="ml-auto flex gap-2">
          <input type="hidden" name="mes" value={month} /><input type="hidden" name="status" value={status} />
          <Select name="categoria" defaultValue={sp1(sp, "categoria") ?? ""} className="h-9 text-sm max-w-44"><option value="">Categoria</option>{ref.categories.filter((c) => c.type === (kind === "receivable" ? "income" : "expense")).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Select name="centro" defaultValue={sp1(sp, "centro") ?? ""} className="h-9 text-sm max-w-44"><option value="">Centro</option>{ref.costCenters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <button className="h-9 px-3 rounded-xl bg-primary-soft text-primary-700 text-sm font-semibold">Filtrar</button>
        </form>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Lançado" value={<Money value={total} />} />
        <Stat label="Liquidado" value={<Money value={paid} />} tone="green" />
        <Stat label="Em aberto" value={<Money value={open.reduce((a, e) => a + e.openAmount, 0)} />} tone={open.some((e) => e.dueDate < today) ? "red" : "default"} hint={`${open.length} lançamento(s)`} />
      </div>
      <Card className="p-0"><EntryList entries={entries} today={today} basePath={base(kind)} emptyTitle="Nenhum lançamento neste filtro" /></Card>
    </div>
  );
}

export async function EntryNew({ kind, sp }: { kind: FinanceKind; sp: Record<string, string | string[] | undefined> }) {
  await requireFinance(managePermission(kind));
  const [refs, today] = await Promise.all([buildRefs(kind), todayFin()]);
  const defaults: Partial<FinancialEntry> = { practitionerId: sp1(sp, "praticante") ?? null, guardianId: sp1(sp, "responsavel") ?? null, collaboratorId: sp1(sp, "colaborador") ?? null, supplierId: sp1(sp, "fornecedor") ?? null };
  return (
    <div className="max-w-3xl">
      <PageHeader title={kind === "receivable" ? "Nova receita" : "Nova despesa"} back={base(kind)} />
      <EntryForm kind={kind} refs={refs} defaults={defaults} today={today} returnTo={sp1(sp, "voltar")} />
    </div>
  );
}

export async function EntryEdit({ kind, id }: { kind: FinanceKind; id: string }) {
  await requireFinance(managePermission(kind));
  const e = await getEntry(id);
  if (!e || e.kind !== kind) notFound();
  const [refs, today] = await Promise.all([buildRefs(kind), todayFin()]);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Editar lançamento" back={`${base(kind)}/${id}`} />
      <EntryForm kind={kind} entry={e} refs={refs} today={today} returnTo={`${base(kind)}/${id}`} />
    </div>
  );
}

export async function EntryDetail({ kind, id }: { kind: FinanceKind; id: string }) {
  const user = await requireFinance([viewPermission(kind), managePermission(kind), settlePermission(kind)]);
  const e = await getEntry(id);
  if (!e || e.kind !== kind) notFound();
  const [txs, ref, today] = await Promise.all([transactionsOfEntry(id), financeRefData(), todayFin()]);
  const st = displayStatus(e, today);
  const canSettle = hasPermission(user, settlePermission(kind)) && e.status !== "cancelled" && e.openAmount > 0;
  const canManage = hasPermission(user, managePermission(kind));
  const who = e.kind === "receivable"
    ? [e.practitionerName && { label: "Praticante", value: <Link prefetch={false} href={`/praticantes/${e.practitionerId}/financeiro`} className="text-primary-600 hover:underline">{e.practitionerName}</Link> }, e.guardianName && { label: "Responsável financeiro", value: <Link prefetch={false} href={`/responsaveis/${e.guardianId}`} className="text-primary-600 hover:underline">{e.guardianName}</Link> }]
    : [e.supplierName && { label: "Fornecedor", value: e.supplierName }, e.collaboratorName && { label: "Colaborador", value: <Link prefetch={false} href={`/colaboradores/${e.collaboratorId}`} className="text-primary-600 hover:underline">{e.collaboratorName}</Link> }, e.payrollMonthId && { label: "Ficha mensal", value: <Link prefetch={false} href={`/pagamentos/${e.collaboratorId}/${e.competence}`} className="text-primary-600 hover:underline">{competenceLabel(e.competence)}</Link> }];
  return (
    <div className="space-y-5">
      <PageHeader back={base(kind)} title={e.description} subtitle={<span className="flex items-center gap-2"><EntryStatusBadge status={st} />{st === "overdue" && <span className="text-danger text-xs font-semibold">{daysLate(e.dueDate, today)} dia(s) em atraso</span>}{e.installment && <Badge>Parcela {e.installment.number}/{e.installment.total}</Badge>}{e.recurrenceId && <Badge tone="blue">Recorrente</Badge>}</span>}
        actions={<>{canManage && e.status !== "cancelled" && <LinkButton href={`${base(kind)}/${id}/editar`} size="sm" variant="outline">Editar</LinkButton>}</>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Valor líquido" value={<Money value={e.netAmount} />} hint={e.discount || e.interest || e.fine ? `orig. ${fmt(e.amount)}${e.discount ? ` − desc ${fmt(e.discount)}` : ""}${e.interest ? ` + juros ${fmt(e.interest)}` : ""}${e.fine ? ` + multa ${fmt(e.fine)}` : ""}` : undefined} />
            <Stat label="Liquidado" value={<Money value={e.paidAmount} />} tone="green" />
            <Stat label="Em aberto" value={<Money value={e.status === "cancelled" ? 0 : e.openAmount} />} tone={st === "overdue" ? "red" : "default"} />
          </div>
          <Card title="Dados">
            <DescriptionList items={[
              { label: "Vencimento", value: isoToBR(e.dueDate) }, { label: "Competência", value: competenceLabel(e.competence) }, { label: "Emissão", value: isoToBR(e.issueDate) },
              { label: "Categoria", value: e.categoryName }, { label: "Centro de custo", value: e.costCenterName ?? "—" }, { label: "Conta prevista", value: ref.accounts.find((a) => a.id === e.accountId)?.name ?? "—" },
              ...who.filter(Boolean) as { label: string; value: React.ReactNode }[],
              { label: "Documento", value: e.reference ?? "—" }, { label: "Observações", value: e.notes ?? "—" },
              ...(e.status === "cancelled" ? [{ label: "Cancelamento", value: `${e.cancelReason ?? ""} · ${e.cancelledAt ? formatDateTime(e.cancelledAt) : ""}` }] : []),
            ]} />
          </Card>
          <Card title={`Movimentações (${txs.length})`} className="p-0">
            {txs.length === 0 ? <EmptyState title="Nenhuma movimentação" /> : (
              <ul className="divide-y divide-border -mt-5">
                {txs.map((t) => (
                  <li key={t.id} className={`px-4 py-3 flex flex-wrap items-center justify-between gap-2 ${t.reversed ? "opacity-60" : ""}`}>
                    <div><p className="font-semibold"><Money value={t.amount} className={t.reversed ? "line-through" : ""} /> <span className="text-ink-500 font-normal">· {isoToBR(t.date)} · {t.accountName}</span></p><p className="text-xs text-ink-500">{ref.methods.find((m) => m.id === t.paymentMethodId)?.name ?? ""}{t.notes ? ` · ${t.notes}` : ""}{t.reversed ? ` · estornada: ${t.reversalReason}` : ""}{t.reconciled ? " · conferida" : ""}</p></div>
                    {!t.reversed && hasPermission(user, settlePermission(kind)) && <ActionForm action={reverseTransaction}><input type="hidden" name="id" value={t.id} /><ConfirmButton message="Estornar esta movimentação? O valor volta a ficar em aberto." size="sm" variant="ghost" className="text-danger">Estornar</ConfirmButton></ActionForm>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-5">
          {canSettle && <Card title={kind === "receivable" ? "Registrar recebimento" : "Registrar pagamento"}><SettleForm entry={e} accounts={ref.accounts.map((a) => ({ id: a.id, name: a.name }))} methods={ref.methods.map((m) => ({ id: m.id, name: m.name }))} defaultAccountId={ref.settings.defaultAccountId} today={today} /></Card>}
          {canManage && e.status !== "cancelled" && (
            <Card title="Cancelar">
              <ActionForm action={cancelEntry} className="space-y-2">
                <input type="hidden" name="id" value={e.id} />
                <Field label="Motivo"><Input name="reason" placeholder="Ex.: lançamento duplicado" /></Field>
                <ConfirmButton message="Cancelar este lançamento? Ele permanece no histórico como cancelado." variant="outline" size="sm" className="text-danger w-full">Cancelar lançamento</ConfirmButton>
              </ActionForm>
              {e.paidAmount > 0 && <p className="text-xs text-ink-500 mt-2">Há valores liquidados: estorne as movimentações antes.</p>}
            </Card>
          )}
          <p className="text-xs text-ink-500">Criado em {formatDateTime(e.createdAt)} · atualizado {formatDateTime(e.updatedAt)}. Alterações ficam na auditoria.</p>
        </div>
      </div>
    </div>
  );
}
function fmt(v: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v); }
