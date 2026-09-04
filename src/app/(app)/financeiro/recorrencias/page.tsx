import { requireFinance } from "@/lib/auth/finance-access";
import { hasPermission } from "@/lib/auth/session";
import { Collections, mapDocs } from "@/lib/db/collections";
import { todayFin } from "@/lib/db/queries/finance";
import { Badge, Card, EmptyState, Field, Input, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { generateRecurrences } from "@/lib/actions/finance-entries";
import { RuleRow } from "@/components/finance/RuleRow";
import { addMonths } from "@/lib/domain/dates";

export const metadata = { title: "Recorrências" };

export default async function RecurrencesPage() {
  const user = await requireFinance(["finance.receivables.manage", "finance.payables.manage"]);
  const today = await todayFin();
  const rules = mapDocs(await Collections.recurrenceRules().get()).sort((a, b) => Number(b.active) - Number(a.active) || a.template.description.localeCompare(b.template.description, "pt-BR"));
  return (
    <div className="space-y-4">
      <PageHeader title="Recorrências" subtitle="Despesas e receitas que se repetem. As ocorrências viram lançamentos normais." />
      <Card title="Gerar ocorrências">
        <ActionForm action={generateRecurrences} className="flex flex-wrap items-end gap-3">
          <Field label="Até o mês"><Input type="month" name="upTo" defaultValue={addMonths(today.slice(0, 7), 1)} className="h-10" /></Field>
          <SubmitButton>Gerar lançamentos</SubmitButton>
          <p className="text-xs text-ink-500 basis-full">Ids determinísticos por regra e data impedem duplicidade, mesmo clicando várias vezes.</p>
        </ActionForm>
      </Card>
      <Card className="p-0">
        {rules.length === 0 ? <EmptyState title="Nenhuma recorrência" description="Ao criar uma receita ou despesa, escolha “Recorrente”." /> : (
          <ul className="divide-y divide-border">{rules.map((r) => <RuleRow key={r.id} r={r} today={today} canEdit={hasPermission(user, r.kind === "receivable" ? "finance.receivables.manage" : "finance.payables.manage")} />)}</ul>
        )}
      </Card>
      <p className="text-xs text-ink-500"><Badge tone="blue">Dica</Badge> Para alterar somente uma ocorrência, edite o lançamento gerado. Para esta e as futuras, use “Editar futuras”.</p>
    </div>
  );
}
