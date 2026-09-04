"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Button, Card, Field, Input, Textarea, Badge } from "@/components/ui";
import { markPaid, markUnpaid, savePayrollDraft } from "@/lib/actions/payroll";
import { formatBRL } from "@/lib/domain/format";
import { isoToBR, minutesToHM } from "@/lib/domain/dates";
import type { PayrollMonth } from "@/lib/db/types";

export function PayrollSheet({ m, canManage, today }: { m: PayrollMonth; canManage: boolean; today: string }) {
  const [adjCount, setAdjCount] = useState(Math.max(1, m.adjustments.length));
  const hoursWorked = m.workedMinutes / 60;
  const paid = m.status === "paid";
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <Card title="Apuração">
          <dl className="divide-y divide-border text-sm">
            <Row k={m.payType === "hourly" ? "Valor por hora cadastrado" : "Salário cadastrado"} v={formatBRL(m.payType === "hourly" ? m.hourlyRate : m.salary)} />
            <Row k="Horas previstas" v={minutesToHM(m.expectedMinutes)} />
            <Row k="Horas registradas" v={minutesToHM(m.workedMinutes)} />
            <Row k="Diferença" v={<span className={m.workedMinutes - m.expectedMinutes < 0 ? "text-amber-700" : "text-primary-700"}>{m.workedMinutes - m.expectedMinutes >= 0 ? "+" : ""}{minutesToHM(m.workedMinutes - m.expectedMinutes)}</span>} />
            <Row k="Faltas" v={m.absences} />
            <Row k="Atrasos / saídas antecipadas" v={`${m.lateCount} / ${m.earlyLeaveCount}`} />
            <Row k="Valor/hora de referência" v={formatBRL(m.referenceHourlyRate)} hint={m.payType === "monthly" ? "salário ÷ horas previstas" : undefined} />
            <Row k="Valor base" v={formatBRL(m.baseAmount)} hint={m.payType === "hourly" ? `${hoursWorked.toFixed(2).replace(".", ",")}h × ${formatBRL(m.hourlyRate)}` : "salário mensal"} />
            {m.payType === "monthly" && <Row k="Simulação proporcional às horas" v={formatBRL(Math.round(m.referenceHourlyRate * hoursWorked * 100) / 100)} hint="apenas referência; não é aplicada automaticamente" />}
            {m.adjustments.map((a) => <Row key={a.id} k={`Ajuste: ${a.description}`} v={<span className={a.amount < 0 ? "text-red-700" : "text-primary-700"}>{a.amount >= 0 ? "+" : ""}{formatBRL(a.amount)}</span>} />)}
            <Row k={<strong>Valor calculado</strong>} v={<strong className="text-lg">{formatBRL(m.calculatedAmount)}</strong>} />
          </dl>
        </Card>

        {canManage && !paid && (
          <Card title="Ajustes e observações">
            <ActionForm action={savePayrollDraft} className="space-y-3">
              <input type="hidden" name="collaboratorId" value={m.collaboratorId} />
              <input type="hidden" name="competence" value={m.competence} />
              {Array.from({ length: adjCount }).map((_, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <Input name={`adj${i}_description`} placeholder="Descrição (ex.: vale, bônus, desconto)" defaultValue={m.adjustments[i]?.description ?? ""} className="col-span-2" />
                  <Input name={`adj${i}_amount`} placeholder="+/- valor" inputMode="decimal" defaultValue={m.adjustments[i]?.amount ?? ""} />
                </div>
              ))}
              {adjCount < 10 && <Button type="button" variant="ghost" size="sm" onClick={() => setAdjCount(adjCount + 1)}>+ Adicionar ajuste</Button>}
              <Field label="Observações"><Textarea name="notes" defaultValue={m.notes ?? ""} /></Field>
              <SubmitButton variant="outline">Salvar ajustes</SubmitButton>
            </ActionForm>
          </Card>
        )}
        {paid && m.notes && <Card title="Observações"><p className="text-sm whitespace-pre-wrap">{m.notes}</p></Card>}
      </div>

      <div className="space-y-5">
        <Card title="Pagamento">
          <div className="mb-3">{paid ? <Badge tone="green" className="text-sm px-3 py-1">PAGO</Badge> : <Badge tone="amber" className="text-sm px-3 py-1">NÃO PAGO</Badge>}</div>
          {paid ? (
            <dl className="text-sm space-y-1">
              <Row k="Valor pago" v={formatBRL(m.paidAmount)} />
              <Row k="Data" v={isoToBR(m.paidAt)} />
            </dl>
          ) : null}
          {canManage && !paid && (
            <ActionForm action={markPaid} className="space-y-3 mt-2">
              <input type="hidden" name="collaboratorId" value={m.collaboratorId} />
              <input type="hidden" name="competence" value={m.competence} />
              <Field label="Valor efetivamente pago (R$)"><Input name="paidAmount" inputMode="decimal" defaultValue={m.calculatedAmount.toFixed(2).replace(".", ",")} required /></Field>
              <Field label="Data do pagamento"><Input name="paidAt" type="date" defaultValue={today} required /></Field>
              <ConfirmButton message="Confirmar o pagamento? Os valores deste mês ficarão congelados no histórico." className="w-full">Marcar como PAGO</ConfirmButton>
            </ActionForm>
          )}
          {canManage && paid && (
            <ActionForm action={markUnpaid} className="mt-4">
              <input type="hidden" name="id" value={m.id} />
              <ConfirmButton message="Desmarcar o pagamento? Os valores voltarão a ser recalculados." variant="outline" size="sm" className="w-full">Desmarcar pagamento</ConfirmButton>
            </ActionForm>
          )}
          <p className="text-xs text-ink-500 mt-3">Cada alteração fica registrada na auditoria.</p>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v, hint }: { k: React.ReactNode; v: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-ink-700">{k}{hint && <span className="block text-xs text-ink-500">{hint}</span>}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
