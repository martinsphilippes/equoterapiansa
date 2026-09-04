"use client";
import { useMemo, useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { Card, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { saveEntry } from "@/lib/actions/finance-entries";
import type { FinanceKind, FinancialEntry } from "@/lib/db/finance-types";
import { FREQUENCY_LABEL } from "@/lib/domain/finance";

export interface Option { id: string; name: string; depth?: number }
export interface EntryFormRefs {
  categories: Option[]; costCenters: Option[]; accounts: Option[]; methods: Option[];
  suppliers?: Option[]; collaborators?: Option[]; practitioners?: { id: string; name: string; guardianIds: string[] }[]; guardians?: Option[];
}

export function EntryForm({ kind, entry, refs, defaults, today, returnTo }: { kind: FinanceKind; entry?: FinancialEntry; refs: EntryFormRefs; defaults?: Partial<FinancialEntry>; today: string; returnTo?: string }) {
  const isEdit = !!entry;
  const [practitionerId, setPractitionerId] = useState(entry?.practitionerId ?? defaults?.practitionerId ?? "");
  const [mode, setMode] = useState<"single" | "installments" | "recurring">("single");
  const [freq, setFreq] = useState("monthly");
  const guardianOptions = useMemo(() => {
    const p = refs.practitioners?.find((x) => x.id === practitionerId);
    if (!p) return refs.guardians ?? [];
    return (refs.guardians ?? []).filter((g) => p.guardianIds.includes(g.id));
  }, [practitionerId, refs]);
  const isRec = kind === "receivable";
  const dueDefault = entry?.dueDate ?? defaults?.dueDate ?? today;

  return (
    <ActionForm action={saveEntry} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      {entry && <input type="hidden" name="id" value={entry.id} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Descrição" className="sm:col-span-2"><Input name="description" defaultValue={entry?.description ?? defaults?.description ?? ""} required autoFocus /></Field>
          <Field label="Valor (R$)"><Input name="amount" inputMode="decimal" defaultValue={entry?.amount ?? defaults?.amount ?? ""} placeholder="0,00" required /></Field>
          <Field label="Vencimento"><Input name="dueDate" type="date" defaultValue={dueDefault} required /></Field>
          <Field label="Categoria">
            <Select name="categoryId" defaultValue={entry?.categoryId ?? defaults?.categoryId ?? ""} required>
              <option value="">Selecione…</option>
              {refs.categories.map((c) => <option key={c.id} value={c.id}>{"  ".repeat(c.depth ?? 0)}{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Centro de custo">
            <Select name="costCenterId" defaultValue={entry?.costCenterId ?? defaults?.costCenterId ?? ""}>
              <option value="">—</option>
              {refs.costCenters.map((c) => <option key={c.id} value={c.id}>{"  ".repeat(c.depth ?? 0)}{c.name}</option>)}
            </Select>
          </Field>
          {isRec ? (
            <>
              <Field label="Praticante">
                <Select name="practitionerId" value={practitionerId} onChange={(e) => setPractitionerId(e.target.value)}>
                  <option value="">—</option>
                  {refs.practitioners?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
              <Field label="Responsável financeiro">
                <Select name="guardianId" defaultValue={entry?.guardianId ?? defaults?.guardianId ?? ""}>
                  <option value="">—</option>
                  {guardianOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </Select>
              </Field>
            </>
          ) : (
            <>
              <Field label="Fornecedor / favorecido">
                <Select name="supplierId" defaultValue={entry?.supplierId ?? defaults?.supplierId ?? ""}>
                  <option value="">—</option>
                  {refs.suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <Field label="Colaborador (quando aplicável)">
                <Select name="collaboratorId" defaultValue={entry?.collaboratorId ?? defaults?.collaboratorId ?? ""}>
                  <option value="">—</option>
                  {refs.collaborators?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
            </>
          )}
        </div>
      </Card>

      {!isEdit && (
        <Card title="Repetição">
          <div className="flex flex-wrap gap-2 mb-3">
            {([["single", "Único"], ["installments", "Parcelado"], ["recurring", "Recorrente"]] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => setMode(v)} className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${mode === v ? "bg-primary text-white border-primary" : "bg-surface border-border text-ink-700"}`}>{l}</button>
            ))}
          </div>
          {mode === "installments" && <Field label="Número de parcelas" hint="O valor informado é o total; as parcelas vencem mês a mês a partir do vencimento."><Input name="installments" type="number" min={2} max={120} defaultValue={2} /></Field>}
          {mode === "recurring" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Frequência"><Select name="frequency" value={freq} onChange={(e) => setFreq(e.target.value)}>{Object.entries(FREQUENCY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
              {freq === "custom" && <Field label="A cada N meses"><Input name="intervalMonths" type="number" min={1} defaultValue={1} /></Field>}
              <Field label="Até (opcional)"><Input name="endDate" type="date" /></Field>
              <p className="sm:col-span-3 text-xs text-ink-500">As ocorrências até o mês atual são criadas agora; as seguintes com “Gerar lançamentos” em Recorrências.</p>
            </div>
          )}
        </Card>
      )}

      <details className="rounded-2xl bg-surface border border-border shadow-card">
        <summary className="px-5 py-4 font-bold cursor-pointer">Mais detalhes</summary>
        <div className="p-5 pt-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Competência"><Input name="competence" type="month" defaultValue={entry?.competence ?? defaults?.competence ?? dueDefault.slice(0, 7)} /></Field>
          <Field label="Emissão"><Input name="issueDate" type="date" defaultValue={entry?.issueDate ?? today} /></Field>
          <Field label="Desconto"><Input name="discount" inputMode="decimal" defaultValue={entry?.discount || ""} /></Field>
          <Field label="Juros"><Input name="interest" inputMode="decimal" defaultValue={entry?.interest || ""} /></Field>
          <Field label="Multa"><Input name="fine" inputMode="decimal" defaultValue={entry?.fine || ""} /></Field>
          <Field label="Conta prevista"><Select name="accountId" defaultValue={entry?.accountId ?? defaults?.accountId ?? ""}><option value="">—</option>{refs.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
          <Field label="Forma"><Select name="paymentMethodId" defaultValue={entry?.paymentMethodId ?? ""}><option value="">—</option>{refs.methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
          <Field label="Documento / referência"><Input name="reference" defaultValue={entry?.reference ?? ""} /></Field>
          <Field label="Observações" className="col-span-2 sm:col-span-4"><Textarea name="notes" defaultValue={entry?.notes ?? ""} className="min-h-16" /></Field>
          {isRec && <div className="col-span-2 sm:col-span-4"><input type="hidden" name="visibleToGuardian" value="0" /><Checkbox name="visibleToGuardian" label="Visível ao responsável na área da família" defaultChecked={entry?.visibleToGuardian ?? true} /></div>}
        </div>
      </details>
      <SubmitButton size="lg" className="w-full sm:w-auto">{isEdit ? "Salvar alterações" : isRec ? "Criar receita" : "Criar despesa"}</SubmitButton>
    </ActionForm>
  );
}
