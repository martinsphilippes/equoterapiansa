"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Badge, Field, Input } from "@/components/ui";
import { cancelRecurrenceFuture, updateRecurrenceFuture } from "@/lib/actions/finance-entries";
import { Money } from "./Money";
import { FREQUENCY_LABEL } from "@/lib/domain/finance";
import { isoToBR } from "@/lib/domain/dates";
import type { RecurrenceRule } from "@/lib/db/finance-types";

export function RuleRow({ r, today, canEdit }: { r: RecurrenceRule; today: string; canEdit: boolean }) {
  const [edit, setEdit] = useState(false);
  return (
    <li className={`px-4 py-3 ${r.active ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{r.template.description} <Badge tone={r.kind === "receivable" ? "green" : "amber"} className="ml-1">{r.kind === "receivable" ? "Receita" : "Despesa"}</Badge></p>
          <p className="text-xs text-ink-500">{FREQUENCY_LABEL[r.frequency]}{r.frequency === "custom" ? ` (a cada ${r.intervalMonths} meses)` : ""} · dia {r.dueDay} · {r.template.categoryName}{r.template.supplierName ? ` · ${r.template.supplierName}` : ""}{r.template.guardianName ? ` · ${r.template.guardianName}` : ""} · desde {isoToBR(r.startDate)}{r.endDate ? ` até ${isoToBR(r.endDate)}` : ""} · {r.generatedCount} gerado(s) · próxima {isoToBR(r.nextDueDate)}</p>
        </div>
        <div className="text-right">
          <Money value={r.template.amount} className="font-bold block" />
          {r.active ? <Badge tone="green">Ativa</Badge> : <Badge tone="gray">Encerrada</Badge>}
        </div>
      </div>
      {canEdit && r.active && (
        <div className="mt-2 flex flex-wrap gap-2 no-print">
          <button type="button" className="text-xs text-primary-600 hover:underline" onClick={() => setEdit(!edit)}>Editar futuras</button>
          <ActionForm action={cancelRecurrenceFuture}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="fromDate" value={today} /><ConfirmButton message="Encerrar a recorrência a partir de hoje? Ocorrências futuras em aberto serão canceladas." size="sm" variant="ghost" className="h-7 text-xs text-danger">Encerrar</ConfirmButton></ActionForm>
        </div>
      )}
      {edit && (
        <ActionForm action={updateRecurrenceFuture} className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl bg-surface-50 p-3" onSuccess={() => setEdit(false)}>
          <input type="hidden" name="id" value={r.id} />
          <Field label="Descrição" className="col-span-2"><Input name="description" defaultValue={r.template.description} className="h-9" /></Field>
          <Field label="Valor"><Input name="amount" inputMode="decimal" defaultValue={r.template.amount} className="h-9" /></Field>
          <Field label="A partir de"><Input name="fromDate" type="date" defaultValue={today} className="h-9" /></Field>
          <Field label="Término (opcional)"><Input name="endDate" type="date" defaultValue={r.endDate ?? ""} className="h-9" /></Field>
          <div className="col-span-2 sm:col-span-4"><SubmitButton size="sm">Aplicar a esta e às futuras</SubmitButton></div>
        </ActionForm>
      )}
    </li>
  );
}
