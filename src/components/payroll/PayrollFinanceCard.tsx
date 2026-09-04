import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { generatePayableFromPayroll } from "@/lib/actions/finance-payroll";
import { getEntry } from "@/lib/db/queries/finance";
import { Money } from "@/components/finance/Money";
import { STATUS_LABEL, displayStatus } from "@/lib/domain/finance";
import { isoToBR } from "@/lib/domain/dates";
import type { PayrollMonth } from "@/lib/db/types";

/** Cartão de integração folha → contas a pagar (renderizado no servidor). */
export async function PayrollFinanceCard({ m, canGenerate, today }: { m: PayrollMonth; canGenerate: boolean; today: string }) {
  const entry = m.payableId ? await getEntry(m.payableId) : null;
  return (
    <Card title="Módulo financeiro">
      {entry ? (
        <div className="space-y-2 text-sm">
          <p>Conta a pagar <Link prefetch={false} href={`/financeiro/pagar/${entry.id}`} className="font-semibold text-primary-700 hover:underline">{entry.description}</Link></p>
          <p className="flex items-center gap-2"><Badge tone={entry.status === "paid" ? "green" : "amber"}>{STATUS_LABEL[displayStatus(entry, today)]}</Badge> venc. {isoToBR(entry.dueDate)} · <Money value={entry.netAmount} className="font-semibold" /></p>
          {entry.openAmount > 0 && <p className="text-xs text-ink-500">Em aberto: <Money value={entry.openAmount} />. Ao liquidar no financeiro, a ficha é marcada como paga automaticamente.</p>}
        </div>
      ) : canGenerate && (m.status === "paid" ? m.paidAmount ?? 0 : m.calculatedAmount) <= 0 ? (
        <p className="text-sm text-ink-500">A ficha ainda não tem valor calculado. Cadastre salário ou valor/hora do colaborador para gerar a conta a pagar.</p>
      ) : canGenerate ? (
        <ActionForm action={generatePayableFromPayroll} className="space-y-2">
          <input type="hidden" name="collaboratorId" value={m.collaboratorId} />
          <input type="hidden" name="competence" value={m.competence} />
          <p className="text-sm text-ink-700">Gera uma conta a pagar de <Money value={m.status === "paid" ? m.paidAmount ?? 0 : m.calculatedAmount} className="font-semibold" /> para este colaborador{m.status === "paid" ? ", já liquidada com a data do pagamento" : ""}.</p>
          <ConfirmButton message="Gerar a conta a pagar desta ficha?" variant="outline" size="sm" className="w-full">Gerar conta a pagar</ConfirmButton>
        </ActionForm>
      ) : <p className="text-sm text-ink-500">Nenhuma conta a pagar vinculada.</p>}
    </Card>
  );
}
