"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { Field, Input, Select } from "@/components/ui";
import { settleEntry } from "@/lib/actions/finance-entries";
import type { FinancialEntry } from "@/lib/db/finance-types";
import type { Option } from "./EntryForm";

/** Recebimento/pagamento em poucos toques: valor sugerido = saldo em aberto. */
export function SettleForm({ entry, accounts, methods, defaultAccountId, today }: { entry: FinancialEntry; accounts: Option[]; methods: Option[]; defaultAccountId?: string | null; today: string }) {
  const [more, setMore] = useState(false);
  const isRec = entry.kind === "receivable";
  return (
    <ActionForm action={settleEntry} className="space-y-3">
      <input type="hidden" name="id" value={entry.id} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)"><Input name="amount" inputMode="decimal" defaultValue={entry.openAmount.toFixed(2).replace(".", ",")} required /></Field>
        <Field label="Data"><Input name="date" type="date" defaultValue={today} required /></Field>
        <Field label="Conta"><Select name="accountId" defaultValue={entry.accountId ?? defaultAccountId ?? accounts[0]?.id ?? ""} required>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
        <Field label="Forma"><Select name="paymentMethodId" defaultValue={entry.paymentMethodId ?? ""}><option value="">—</option>{methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
      </div>
      {more ? (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Desconto extra"><Input name="extraDiscount" inputMode="decimal" /></Field>
          <Field label="Juros"><Input name="extraInterest" inputMode="decimal" /></Field>
          <Field label="Multa"><Input name="extraFine" inputMode="decimal" /></Field>
          <Field label="Observação" className="col-span-3"><Input name="notes" /></Field>
        </div>
      ) : <button type="button" className="text-xs text-primary-600 hover:underline" onClick={() => setMore(true)}>+ desconto, juros, multa ou observação</button>}
      <SubmitButton size="lg" className="w-full">{isRec ? "Registrar recebimento" : "Registrar pagamento"}</SubmitButton>
    </ActionForm>
  );
}
