"use client";
import { useMemo, useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { Card, Field, Input, Select, Textarea } from "@/components/ui";
import { saveBillingPlan } from "@/lib/actions/finance-plans";
import type { BillingPlan } from "@/lib/db/finance-types";
import type { Option } from "./EntryForm";

export function PlanForm({ plan, practitioners, guardians, categories, costCenters, today, defaultCategoryId, defaultPractitionerId, returnTo }: { plan?: BillingPlan; practitioners: { id: string; name: string; guardianIds: string[] }[]; guardians: Option[]; categories: Option[]; costCenters: Option[]; today: string; defaultCategoryId?: string | null; defaultPractitionerId?: string; returnTo?: string }) {
  const [practitionerId, setPractitionerId] = useState(plan?.practitionerId ?? defaultPractitionerId ?? "");
  const [model, setModel] = useState(plan?.billingModel ?? "fixed");
  const [discountType, setDiscountType] = useState(plan?.discountType ?? "none");
  const gOptions = useMemo(() => { const p = practitioners.find((x) => x.id === practitionerId); return p ? guardians.filter((g) => p.guardianIds.includes(g.id)) : []; }, [practitionerId, practitioners, guardians]);
  return (
    <ActionForm action={saveBillingPlan} className="space-y-4">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Praticante"><Select name="practitionerId" value={practitionerId} onChange={(e) => setPractitionerId(e.target.value)} required><option value="">Selecione…</option>{practitioners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="Responsável financeiro" hint={practitionerId && gOptions.length === 0 ? "Vincule um responsável ao praticante primeiro." : undefined}><Select name="guardianId" defaultValue={plan?.guardianId ?? ""} required><option value="">Selecione…</option>{gOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></Field>
          <Field label="Nome do plano"><Input name="name" defaultValue={plan?.name ?? "Mensalidade equoterapia"} required /></Field>
          <Field label="Modelo de cobrança">
            <Select name="billingModel" value={model} onChange={(e) => setModel(e.target.value as BillingPlan["billingModel"])}>
              <option value="fixed">Valor fixo (independe da presença)</option>
              <option value="package">Pacote de sessões (valor fixo)</option>
              <option value="per_session">Por atendimento realizado</option>
            </Select>
          </Field>
          <Field label={model === "per_session" ? "Valor por atendimento (R$)" : "Valor (R$)"}><Input name="amount" inputMode="decimal" defaultValue={plan?.amount ?? ""} required /></Field>
          {model === "package" && <Field label="Sessões incluídas"><Input name="sessionsIncluded" type="number" min={1} defaultValue={plan?.sessionsIncluded ?? 4} /></Field>}
          <Field label="Desconto / bolsa">
            <Select name="discountType" value={discountType} onChange={(e) => setDiscountType(e.target.value as BillingPlan["discountType"])}>
              <option value="none">Sem desconto</option><option value="percent">Percentual (%)</option><option value="fixed">Valor fixo (R$)</option>
            </Select>
          </Field>
          {discountType !== "none" && <Field label={discountType === "percent" ? "Percentual (100 = bolsa integral)" : "Valor do desconto"}><Input name="discountValue" inputMode="decimal" defaultValue={plan?.discountValue ?? ""} /></Field>}
          <Field label="Frequência"><Select name="frequency" defaultValue={plan?.frequency ?? "monthly"}><option value="monthly">Mensal</option><option value="bimonthly">Bimestral</option><option value="quarterly">Trimestral</option><option value="semiannual">Semestral</option><option value="annual">Anual</option></Select></Field>
          <Field label="Dia de vencimento"><Input name="dueDay" type="number" min={1} max={28} defaultValue={plan?.dueDay ?? 10} /></Field>
          <Field label="Início"><Input name="startDate" type="date" defaultValue={plan?.startDate ?? today} required /></Field>
          <Field label="Término (opcional)"><Input name="endDate" type="date" defaultValue={plan?.endDate ?? ""} /></Field>
          <Field label="Categoria"><Select name="categoryId" defaultValue={plan?.categoryId ?? defaultCategoryId ?? ""} required><option value="">Selecione…</option>{categories.map((c) => <option key={c.id} value={c.id}>{"  ".repeat(c.depth ?? 0)}{c.name}</option>)}</Select></Field>
          <Field label="Centro de custo"><Select name="costCenterId" defaultValue={plan?.costCenterId ?? ""}><option value="">—</option>{costCenters.map((c) => <option key={c.id} value={c.id}>{"  ".repeat(c.depth ?? 0)}{c.name}</option>)}</Select></Field>
          <Field label="Observações" className="sm:col-span-2"><Textarea name="notes" defaultValue={plan?.notes ?? ""} className="min-h-16" /></Field>
        </div>
      </Card>
      <SubmitButton size="lg">{plan ? "Salvar plano" : "Criar plano"}</SubmitButton>
    </ActionForm>
  );
}
