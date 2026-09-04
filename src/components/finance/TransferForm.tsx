import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { Field, Input, Select } from "@/components/ui";
import { transferBetweenAccounts } from "@/lib/actions/finance-entries";
import type { Option } from "./EntryForm";

export function TransferForm({ accounts, today }: { accounts: Option[]; today: string }) {
  return (
    <ActionForm action={transferBetweenAccounts} className="grid grid-cols-2 gap-3" resetOnSuccess>
      <Field label="De"><Select name="fromAccountId" required>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
      <Field label="Para"><Select name="toAccountId" defaultValue={accounts[1]?.id} required>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
      <Field label="Valor (R$)"><Input name="amount" inputMode="decimal" required /></Field>
      <Field label="Data"><Input name="date" type="date" defaultValue={today} required /></Field>
      <Field label="Descrição" className="col-span-2"><Input name="description" placeholder="Ex.: depósito do caixa" /></Field>
      <div className="col-span-2"><SubmitButton variant="secondary" className="w-full">Transferir</SubmitButton></div>
    </ActionForm>
  );
}
