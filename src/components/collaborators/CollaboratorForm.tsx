"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { Card, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { saveCollaborator } from "@/lib/actions/collaborators";
import type { Collaborator, JobRole, WorkSchedule } from "@/lib/db/types";

const WD = [["1", "Seg"], ["2", "Ter"], ["3", "Qua"], ["4", "Qui"], ["5", "Sex"], ["6", "Sáb"], ["0", "Dom"]];

export function ScheduleFields({ schedule, name = "customSchedule", toggle = true, defaultOn }: { schedule?: WorkSchedule | null; name?: string; toggle?: boolean; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn ?? !!schedule);
  const periods = schedule?.periods ?? [{ start: "08:00", end: "11:00" }, { start: "15:00", end: "18:00" }];
  const weekdays = schedule?.weekdays ?? [1, 2, 3, 4, 5];
  return (
    <div className="space-y-3">
      {toggle && <Checkbox name={name} label="Usar jornada própria (diferente da padrão)" checked={on} onChange={(e) => setOn(e.target.checked)} />}
      {(on || !toggle) && (
        <div className="rounded-xl bg-surface-50 border border-border p-3 space-y-3">
          <div>
            <p className="text-sm font-medium text-ink-700 mb-1">Dias da semana</p>
            <div className="flex flex-wrap gap-3">
              {WD.map(([v, l]) => <Checkbox key={v} name="weekdays" value={v} label={l} defaultChecked={weekdays.includes(Number(v))} />)}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-1">
                <p className="text-xs text-ink-500">Período {i + 1}</p>
                <Input type="time" name={`period${i}_start`} defaultValue={periods[i]?.start ?? ""} />
                <Input type="time" name={`period${i}_end`} defaultValue={periods[i]?.end ?? ""} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CollaboratorForm({ collaborator, jobRoles, canSeeFinance }: { collaborator?: Collaborator; jobRoles: JobRole[]; canSeeFinance: boolean }) {
  const [payType, setPayType] = useState(collaborator?.payType ?? "monthly");
  return (
    <ActionForm action={saveCollaborator} redirectTo={collaborator ? `/colaboradores/${collaborator.id}` : undefined} className="space-y-5">
      {collaborator && <input type="hidden" name="id" value={collaborator.id} />}
      <Card title="Dados pessoais">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome completo" className="sm:col-span-2"><Input name="name" defaultValue={collaborator?.name} required autoFocus /></Field>
          <Field label="CPF"><Input name="cpf" inputMode="numeric" defaultValue={collaborator?.cpf} placeholder="Somente números" /></Field>
          <Field label="Data de nascimento"><Input name="birthDate" type="date" defaultValue={collaborator?.birthDate} /></Field>
          <Field label="Telefone"><Input name="phone" inputMode="tel" defaultValue={collaborator?.phone} /></Field>
          <Field label="E-mail"><Input name="email" type="email" defaultValue={collaborator?.email} /></Field>
          <Field label="Endereço" className="sm:col-span-2"><Input name="address" defaultValue={collaborator?.address} /></Field>
        </div>
      </Card>
      <Card title="Função e jornada">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Função">
            <Select name="jobRoleId" defaultValue={collaborator?.jobRoleId ?? ""}>
              <option value="">Selecione…</option>
              {jobRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </Field>
          <Field label="Data de admissão"><Input name="admissionDate" type="date" defaultValue={collaborator?.admissionDate} /></Field>
          <div className="sm:col-span-2"><ScheduleFields schedule={collaborator?.schedule} /></div>
        </div>
      </Card>
      {canSeeFinance && (
        <Card title="Remuneração">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tipo de remuneração">
              <Select name="payType" value={payType} onChange={(e) => setPayType(e.target.value as "monthly" | "hourly")}>
                <option value="monthly">Salário mensal</option>
                <option value="hourly">Valor por hora</option>
              </Select>
            </Field>
            {payType === "monthly" ? (
              <Field label="Salário mensal (R$)"><Input name="salary" inputMode="decimal" defaultValue={collaborator?.salary ?? ""} placeholder="2300,00" /></Field>
            ) : (
              <Field label="Valor por hora (R$)"><Input name="hourlyRate" inputMode="decimal" defaultValue={collaborator?.hourlyRate ?? ""} placeholder="18,50" /></Field>
            )}
            <Field label="Dados bancários / PIX" className="sm:col-span-2"><Input name="bankInfo" defaultValue={collaborator?.bankInfo} /></Field>
          </div>
          <p className="text-xs text-ink-500 mt-3">O sistema apura horas e calcula valores de referência. A decisão de pagamento é sempre da administração.</p>
        </Card>
      )}
      <Card title="Observações">
        <Textarea name="notes" defaultValue={collaborator?.notes} />
      </Card>
      <div className="flex gap-2">
        <SubmitButton size="lg">{collaborator ? "Salvar alterações" : "Cadastrar colaborador"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
