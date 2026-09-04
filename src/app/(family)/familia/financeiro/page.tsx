import { requireGuardian } from "@/lib/db/queries/family";
import { getFinanceSettings } from "@/lib/db/queries/finance-ref";
import { guardianFinance } from "@/lib/db/queries/finance";
import { Card, EmptyState, PageHeader, Stat, Badge } from "@/components/ui";
import { Money } from "@/components/finance/Money";
import { EntryStatusBadge } from "@/components/finance/EntryStatusBadge";
import { isoToBR } from "@/lib/domain/dates";
import { displayStatus } from "@/lib/domain/finance";

export const metadata = { title: "Financeiro" };

export default async function FamilyFinancePage() {
  const [{ guardian }, settings] = await Promise.all([requireGuardian(), getFinanceSettings()]);
  if (!settings.showToGuardians) return <Card><EmptyState title="Área financeira indisponível" description="Fale com a secretaria para informações sobre mensalidades." /></Card>;
  const fin = await guardianFinance(guardian.id);
  const visible = fin.entries.filter((e) => e.visibleToGuardian && e.status !== "cancelled");
  const open = visible.filter((e) => e.status !== "paid").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const paid = visible.filter((e) => e.status === "paid").sort((a, b) => b.dueDate.localeCompare(a.dueDate)).slice(0, 24);
  const overdue = open.filter((e) => e.dueDate < fin.today).reduce((a, e) => a + e.openAmount, 0);
  const openTotal = open.reduce((a, e) => a + e.openAmount, 0);
  return (
    <div className="space-y-5">
      <PageHeader title="Financeiro" subtitle="Mensalidades e cobranças dos seus praticantes" />
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Em aberto" value={<Money value={openTotal} />} tone={openTotal ? "amber" : "green"} />
        <Stat label="Vencido" value={<Money value={overdue} />} tone={overdue ? "red" : "green"} />
      </div>
      {overdue > 0 && <Card className="border-danger/30 bg-danger/5"><p className="text-sm">Há cobranças vencidas. Se já efetuou o pagamento, avise a secretaria para atualizarmos o registro.</p></Card>}
      <Card title="Cobranças em aberto" className="p-0">
        {open.length === 0 ? <EmptyState title="Nenhuma cobrança em aberto" description="Tudo em dia. Obrigado!" /> : (
          <ul className="divide-y divide-border -mt-5">{open.map((e) => (
            <li key={e.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0"><p className="font-semibold truncate">{e.description}</p><p className="text-xs text-ink-500">{e.practitionerName ? `${e.practitionerName} · ` : ""}vencimento {isoToBR(e.dueDate)}{e.installment ? ` · parcela ${e.installment.number}/${e.installment.total}` : ""}</p><div className="mt-1"><EntryStatusBadge status={displayStatus(e, fin.today)} /></div></div>
              <div className="text-right"><Money value={e.openAmount} className="font-bold block" />{e.paidAmount > 0 && <span className="text-xs text-ink-500">pago {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(e.paidAmount)}</span>}</div>
            </li>
          ))}</ul>
        )}
      </Card>
      <Card title="Pagamentos realizados" className="p-0">
        {paid.length === 0 ? <EmptyState title="Nenhum pagamento registrado" /> : (
          <ul className="divide-y divide-border -mt-5">{paid.map((e) => (
            <li key={e.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0"><p className="font-medium truncate">{e.description}</p><p className="text-xs text-ink-500">{e.practitionerName ? `${e.practitionerName} · ` : ""}venc. {isoToBR(e.dueDate)}{e.settledDate ? ` · pago em ${isoToBR(e.settledDate)}` : ""}</p></div>
              <div className="flex items-center gap-2"><Badge tone="green">Pago</Badge><Money value={e.paidAmount} className="font-semibold" /></div>
            </li>
          ))}</ul>
        )}
      </Card>
      <p className="text-xs text-ink-500">Formas de pagamento e comprovantes: combine diretamente com a secretaria.</p>
    </div>
  );
}
