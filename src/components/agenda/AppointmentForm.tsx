import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { Card, Field, Input, Select, Textarea } from "@/components/ui";
import { saveAppointment } from "@/lib/actions/appointments";
import type { Appointment, Collaborator, Practitioner } from "@/lib/db/types";
import { hmToMinutes } from "@/lib/domain/dates";

export function AppointmentForm({ appointment: a, practitioners, professionals, types, defaults, returnTo }: { appointment?: Appointment; practitioners: Practitioner[]; professionals: Collaborator[]; types: string[]; defaults?: { date?: string; practitionerId?: string; professionalId?: string }; returnTo?: string }) {
  const duration = a ? hmToMinutes(a.endTime) - hmToMinutes(a.startTime) : 30;
  return (
    <ActionForm action={saveAppointment} className="space-y-5">
      {a && <input type="hidden" name="id" value={a.id} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Praticante" className="sm:col-span-2">
            <Select name="practitionerId" defaultValue={a?.practitionerId ?? defaults?.practitionerId ?? ""} required>
              <option value="">Selecione…</option>
              {practitioners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Profissional" className="sm:col-span-2">
            <Select name="professionalId" defaultValue={a?.professionalId ?? defaults?.professionalId ?? ""} required>
              <option value="">Selecione…</option>
              {professionals.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.jobRoleName}</option>)}
            </Select>
          </Field>
          <Field label="Data"><Input type="date" name="date" defaultValue={a?.date ?? defaults?.date} required /></Field>
          <Field label="Horário"><Input type="time" name="startTime" defaultValue={a?.startTime ?? "08:00"} required /></Field>
          <Field label="Duração (minutos)"><Input type="number" name="duration" min={5} max={240} step={5} defaultValue={duration} /></Field>
          <Field label="Tipo de atendimento">
            <Select name="type" defaultValue={a?.type ?? types[0]}>{types.map((t) => <option key={t}>{t}</option>)}</Select>
          </Field>
          {!a && <Field label="Repetir semanalmente por" hint="0 = somente este dia. Cria um agendamento por semana no mesmo dia e horário."><Select name="repeatWeeks" defaultValue="0">{[0, 1, 2, 3, 4, 8, 12, 16, 24, 52].map((n) => <option key={n} value={n}>{n === 0 ? "Não repetir" : `${n} semana${n > 1 ? "s" : ""}`}</option>)}</Select></Field>}
          <Field label="Observações" className="sm:col-span-2"><Textarea name="notes" defaultValue={a?.notes} className="min-h-16" /></Field>
        </div>
      </Card>
      <SubmitButton size="lg">{a ? "Salvar alterações" : "Agendar"}</SubmitButton>
    </ActionForm>
  );
}
