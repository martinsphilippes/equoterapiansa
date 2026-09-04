import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff, hasPermission } from "@/lib/auth/session";
import { canSeeFinance } from "@/lib/auth/finance-access";
import { getPractitionerFor } from "@/lib/db/queries/practitioners";
import { practitionerFinance } from "@/lib/db/queries/finance";
import { Badge, Card, EmptyState, LinkButton, Stat } from "@/components/ui";
import { EntryList } from "@/components/finance/EntryList";
import { Money } from "@/components/finance/Money";
import { FREQUENCY_LABEL, applyDiscount } from "@/lib/domain/finance";
import type { Params } from "@/lib/types";

export default async function PractitionerFinancePage({ params }: { params: Params<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  const p = await getPractitionerFor(user, id);
  if (!p) notFound();
  if (!canSeeFinance(user) || !hasPermission(user, "finance.receivables.view") && !hasPermission(user, "finance.receivables.manage")) {
    return <Card className="mt-5"><EmptyState title="Sem permissão financeira" description="Peça ao gestor acesso a Contas a receber." /></Card>;
  }
  const fin = await practitionerFinance(id);
  const canManage = hasPermission(user, "finance.receivables.manage");
  const activePlans = fin.plans.filter((x) => x.active);
  return (
    <div className="mt-5 space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Em aberto" value={<Money value={fin.openTotal} />} tone={fin.openTotal ? "amber" : "green"} />
        <Stat label="Vencido" value={<Money value={fin.overdueTotal} />} tone={fin.overdueTotal ? "red" : "green"} />
        <Stat label="Recebido (total)" value={<Money value={fin.paidTotal} />} />
      </div>
      <Card title="Plano de cobrança" action={canManage && <LinkButton size="sm" href={`/financeiro/mensalidades/novo?praticante=${id}`}>{activePlans.length ? "+ Plano" : "Criar plano"}</LinkButton>}>
        {fin.plans.length === 0 ? <p className="text-sm text-ink-500">Nenhum plano. Crie um para gerar as mensalidades automaticamente.</p> : (
          <ul className="divide-y divide-border">{fin.plans.map((pl) => { const { net } = applyDiscount(pl.amount, pl.discountType, pl.discountValue); return (
            <li key={pl.id} className={`py-2 flex items-center justify-between gap-2 ${pl.active ? "" : "opacity-60"}`}>
              <div><p className="font-semibold text-sm">{pl.name} <span className="text-ink-500 font-normal">· resp. {pl.guardianName}</span></p><p className="text-xs text-ink-500">{FREQUENCY_LABEL[pl.frequency]} · vence dia {pl.dueDay}{pl.discountType !== "none" ? " · com desconto/bolsa" : ""}</p></div>
              <div className="text-right"><Money value={net} className="font-bold block" />{pl.active ? <Badge tone="green">Ativo</Badge> : <Badge tone="gray">Pausado</Badge>}{canManage && <Link prefetch={false} href={`/financeiro/mensalidades/novo?editar=${pl.id}&praticante=${id}`} className="block text-xs text-primary-600 hover:underline">Editar</Link>}</div>
            </li>); })}</ul>
        )}
      </Card>
      <Card title="Cobranças" className="p-0" action={canManage && <LinkButton size="sm" variant="outline" href={`/financeiro/receber/novo?praticante=${id}`}>+ Cobrança avulsa</LinkButton>}>
        <div className="-mt-5"><EntryList entries={[...fin.entries].reverse()} today={fin.today} basePath="/financeiro/receber" emptyTitle="Nenhuma cobrança" /></div>
      </Card>
    </div>
  );
}
