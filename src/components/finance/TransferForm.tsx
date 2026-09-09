"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { Field, Input, Select } from "@/components/ui";
import { transferBetweenAccounts } from "@/lib/actions/finance-entries";
import type { Option } from "./EntryForm";

/**
 * Transferência entre contas. A conta de destino nunca lista a conta de origem:
 * o estado inválido (mesma conta dos dois lados) deixa de existir na tela.
 */
export function TransferForm({ accounts, today }: { accounts: Option[]; today: string }) {
  const [from, setFrom] = useState(accounts[0]?.id ?? "");
  const [chosenTo, setChosenTo] = useState("");
  const destinations = accounts.filter((a) => a.id !== from);
  const to = destinations.some((d) => d.id === chosenTo) ? chosenTo : (destinations[0]?.id ?? "");
  return (
    <ActionForm action={transferBetweenAccounts} className="grid grid-cols-2 gap-3" resetOnSuccess>
      <Field label="De">
        <Select name="fromAccountId" value={from} onChange={(e) => setFrom(e.target.value)} required>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </Field>
      <Field label="Para">
        <Select name="toAccountId" value={to} onChange={(e) => setChosenTo(e.target.value)} required>
          {destinations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </Field>
      <Field label="Valor (R$)"><Input name="amount" inputMode="decimal" required /></Field>
      <Field label="Data"><Input name="date" type="date" defaultValue={today} required /></Field>
      <Field label="Descrição" className="col-span-2"><Input name="description" placeholder="Ex.: depósito do caixa" /></Field>
      <div className="col-span-2"><SubmitButton variant="secondary" className="w-full">Transferir</SubmitButton></div>
    </ActionForm>
  );
}
