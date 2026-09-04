import Link from "next/link";
import { requireFinance } from "@/lib/auth/finance-access";
import { hasPermission } from "@/lib/auth/session";
import { Collections, mapDocs } from "@/lib/db/collections";
import { todayFin } from "@/lib/db/queries/finance";
import { Badge, Card, EmptyState, Field, Input, LinkButton, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { generateBillingCharges, toggleBillingPlan } from "@/lib/actions/finance-plans";
import { Money } from "@/components/finance/Money";
import { FREQUENCY_LABEL, applyDiscount } from "@/lib/domain/finance";
import { competenceLabel, isoToBR } from "@/lib/domain/dates";

export const metadata = { title: "Mensalidades" };
const MODEL = { fixed: "Valor fixo", package: "Pacote", per_session: "Por atendimento" };

export default async function PlansPage() {
  const user = await requireFinance(["finance.receivables.manage", "finance.receivables.view"]);
  const today = await todayFin();
  const plans = mapDocs(await Collections.billingPlans().get()).sort((a, b) => Number(b.active) - Number(a.active) || a.practitionerName.localeCompare(b.practitionerName, "pt-BR"));
  const canManage = hasPermission(user, "finance.receivables.manage");
  const active = plans.filter((p) => p.active);
  const monthly = active.reduce((a, p) => a + (p.frequency === "monthly" ? applyDiscount(p.amount, p.discountType, p.discountValue).net : 0), 0);
  return (
    <div className="space-y-4">
      <PageHeader title="Mensalidades e planos" subtitle={`${active.length} plano(s) ativo(s) · receita mensal recorrente prevista ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(monthly)}`} actions={canManage && <LinkButton href="/financeiro/mensalidades/novo" size="sm">+ Plano</LinkButton>} />
      {canManage && (
        <Card title="Gerar cobranças">
          <ActionForm action={generateBillingCharges} className="flex flex-wrap items-end gap-3">
            <Field label="Até a competência"><Input type="month" name="upTo" defaultValue={today.slice(0, 7)} className="h-10" /></Field>
            <SubmitButton>Gerar cobranças pendentes</SubmitButton>
            <p className="text-xs text-ink-500 basis-full">Cria as contas a receber de todos os planos ativos até o mês informado. Nunca duplica: cada plano gera uma cobrança por competência.</p>
          </ActionForm>
        </Card>
      )}
      <Card className="p-0">
        {plans.length === 0 ? <EmptyState title="Nenhum plano cadastrado" description="Crie um plano por praticante para gerar as cobranças automaticamente." /> : (
          <ul className="divide-y divide-border">
            {plans.map((p) => {
              const { net } = applyDiscount(p.amount, p.discountType, p.discountValue);
              return (
                <li key={p.id} className={`px-4 py-3 ${p.active ? "" : "opacity-60"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold"><Link prefetch={false} href={`/praticantes/${p.practitionerId}/financeiro`} className="hover:underline">{p.practitionerName}</Link> <span className="text-ink-500 font-normal">· {p.name}</span></p>
                      <p className="text-xs text-ink-500">Resp.: {p.guardianName} · {MODEL[p.billingModel]} · {FREQUENCY_LABEL[p.frequency]} · vence dia {p.dueDay} · desde {isoToBR(p.startDate)}{p.endDate ? ` até ${isoToBR(p.endDate)}` : ""}{p.lastGenerated ? ` · gerado até ${competenceLabel(p.lastGenerated)}` : " · nada gerado ainda"}</p>
                    </div>
                    <div className="text-right">
                      <Money value={net} className="font-bold block" />
                      {p.discountType !== "none" && <span className="text-xs text-ink-500">de {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.amount)}</span>}
                      <div className="mt-1 flex items-center justify-end gap-2">
                        {p.active ? <Badge tone="green">Ativo</Badge> : <Badge tone="gray">Pausado</Badge>}
                        {canManage && <Link prefetch={false} href={`/financeiro/mensalidades/novo?editar=${p.id}`} className="text-xs text-primary-600 hover:underline">Editar</Link>}
                        {canManage && <ActionForm action={toggleBillingPlan}><input type="hidden" name="id" value={p.id} /><SubmitButton size="sm" variant="ghost" className="h-7 text-xs" pendingText="…">{p.active ? "Pausar" : "Reativar"}</SubmitButton></ActionForm>}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
