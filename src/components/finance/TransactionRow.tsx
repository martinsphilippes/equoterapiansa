"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Badge, Field, Input, Select } from "@/components/ui";
import { reconcileTransaction, reverseTransaction, reverseTransfer } from "@/lib/actions/finance-entries";
import { Money } from "./Money";
import { isoToBR } from "@/lib/domain/dates";
import type { FinancialTransaction } from "@/lib/db/finance-types";
import type { Option } from "./EntryForm";

export function TransactionRow({ t, accounts, canReconcile, canReverse }: { t: FinancialTransaction; accounts: Option[]; canReconcile: boolean; canReverse: boolean }) {
  const [edit, setEdit] = useState(false);
  const isIn = t.type === "in" || t.type === "transfer_in";
  const transfer = t.type.startsWith("transfer");
  return (
    <li className={`px-4 py-3 ${t.reversed ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold truncate">{t.description}</p>
          <p className="text-xs text-ink-500">{isoToBR(t.date)} · {t.accountName}{t.categoryName ? ` · ${t.categoryName}` : ""}{transfer ? " · transferência" : ""}{t.notes ? ` · ${t.notes}` : ""}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {t.reconciled && <Badge tone="green">Conferida</Badge>}
            {t.reversed && <Badge tone="gray">Estornada</Badge>}
            {t.entryId && <a href={`/financeiro/${t.entryKind === "payable" ? "pagar" : "receber"}/${t.entryId}`} className="text-xs text-primary-600 hover:underline">ver lançamento</a>}
          </div>
        </div>
        <Money value={isIn ? t.amount : -t.amount} tone="auto" className={`font-bold shrink-0 ${t.reversed ? "line-through" : ""}`} />
      </div>
      {!t.reversed && (canReconcile || canReverse) && (
        <div className="mt-2 flex flex-wrap gap-2 no-print">
          {canReconcile && <ActionForm action={reconcileTransaction}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="toggle" value="1" /><SubmitButton size="sm" variant={t.reconciled ? "ghost" : "outline"} className="h-8 text-xs" pendingText="…">{t.reconciled ? "Desmarcar" : "Conferir"}</SubmitButton></ActionForm>}
          {canReconcile && <button type="button" className="text-xs text-ink-500 hover:underline" onClick={() => setEdit(!edit)}>Corrigir</button>}
          {canReverse && (transfer
            ? <ActionForm action={reverseTransfer}><input type="hidden" name="transferId" value={t.transferId ?? ""} /><ConfirmButton message="Estornar a transferência (as duas contas)?" size="sm" variant="ghost" className="h-8 text-xs text-danger">Estornar</ConfirmButton></ActionForm>
            : <ActionForm action={reverseTransaction}><input type="hidden" name="id" value={t.id} /><ConfirmButton message="Estornar esta movimentação?" size="sm" variant="ghost" className="h-8 text-xs text-danger">Estornar</ConfirmButton></ActionForm>)}
        </div>
      )}
      {edit && (
        <ActionForm action={reconcileTransaction} className="mt-2 grid grid-cols-3 gap-2 rounded-xl bg-surface-50 p-3" onSuccess={() => setEdit(false)}>
          <input type="hidden" name="id" value={t.id} />
          <Field label="Data"><Input type="date" name="date" defaultValue={t.date} className="h-9" /></Field>
          <Field label="Conta"><Select name="accountId" defaultValue={t.accountId} className="h-9">{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
          <Field label="Observação"><Input name="notes" defaultValue={t.notes ?? ""} className="h-9" /></Field>
          <div className="col-span-3"><SubmitButton size="sm">Salvar</SubmitButton></div>
        </ActionForm>
      )}
    </li>
  );
}
