"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { Card, Field, Input, Select, Textarea, cn } from "@/components/ui";
import { recordSession } from "@/lib/actions/appointments";
import type { Appointment, Collaborator, Session } from "@/lib/db/types";

const QUICK_ACTIVITIES = ["Montaria", "Alongamento", "Exercícios de equilíbrio", "Comandos ao cavalo", "Atividade em solo", "Escovação / contato", "Trote", "Percurso com obstáculos", "Jogo pedagógico"];

/**
 * Registro rápido: presença em 1 toque, atividades por chips, campos de texto opcionais.
 * Só "Presente/Faltou" é obrigatório.
 */
export function SessionForm({ appointment, session, practitionerId, practitionerName, professionals, currentProfessionalId, lockProfessional, returnTo, today }: {
  appointment?: Appointment | null; session?: Session | null; practitionerId: string; practitionerName: string; professionals: Collaborator[]; currentProfessionalId?: string; lockProfessional: boolean; returnTo?: string; today: string;
}) {
  const [attended, setAttended] = useState<boolean>(session?.attended ?? true);
  const [activities, setActivities] = useState<Set<string>>(new Set(session?.activities.filter((a) => QUICK_ACTIVITIES.includes(a)) ?? []));
  const extra = session?.activities.filter((a) => !QUICK_ACTIVITIES.includes(a)).join("\n") ?? "";
  const profId = session?.professionalId ?? appointment?.professionalId ?? currentProfessionalId ?? "";
  return (
    <ActionForm action={recordSession} className="space-y-4">
      {appointment && <input type="hidden" name="appointmentId" value={appointment.id} />}
      {session && <input type="hidden" name="sessionId" value={session.id} />}
      <input type="hidden" name="practitionerId" value={practitionerId} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <input type="hidden" name="attended" value={attended ? "1" : "0"} />

      <Card>
        <p className="text-sm text-ink-500">Praticante</p>
        <p className="text-lg font-semibold">{practitionerName}</p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button type="button" onClick={() => setAttended(true)} className={cn("h-14 rounded-xl font-semibold text-base border-2", attended ? "bg-brand-600 border-brand-600 text-white" : "bg-white border-ink-100 text-ink-700")}>Presente</button>
          <button type="button" onClick={() => setAttended(false)} className={cn("h-14 rounded-xl font-semibold text-base border-2", !attended ? "bg-red-600 border-red-600 text-white" : "bg-white border-ink-100 text-ink-700")}>Faltou</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          <Field label="Data"><Input type="date" name="date" defaultValue={session?.date ?? appointment?.date ?? today} required /></Field>
          <Field label="Horário"><Input type="time" name="time" defaultValue={session?.time ?? appointment?.startTime ?? "08:00"} required /></Field>
          <Field label="Profissional" className="col-span-2 sm:col-span-1">
            <Select name="professionalId" defaultValue={profId} disabled={lockProfessional} required>
              {professionals.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            {lockProfessional && <input type="hidden" name="professionalId" value={profId} />}
          </Field>
        </div>
      </Card>

      {attended && (
        <Card title="Atividades realizadas">
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIVITIES.map((a) => {
              const on = activities.has(a);
              return (
                <button key={a} type="button" onClick={() => { const n = new Set(activities); if (on) n.delete(a); else n.add(a); setActivities(n); }} className={cn("px-3 py-2 rounded-full text-sm border", on ? "bg-brand-100 border-brand-300 text-brand-900" : "bg-white border-ink-100 text-ink-700")}>{on ? "✓ " : ""}{a}</button>
              );
            })}
          </div>
          {Array.from(activities).map((a) => <input key={a} type="hidden" name="activities" value={a} />)}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <Field label="Outras atividades (uma por linha)"><Textarea name="activitiesText" defaultValue={extra} className="min-h-16" /></Field>
            <Field label="Objetivo trabalhado"><Textarea name="objective" defaultValue={session?.objective} className="min-h-16" placeholder="Ex.: controle postural e atenção" /></Field>
            <Field label="Cavalo utilizado (opcional)"><Input name="horse" defaultValue={session?.horse} /></Field>
          </div>
        </Card>
      )}

      <Card title={attended ? "Observações" : "Motivo da falta / observações"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Observações" className="sm:col-span-2"><Textarea name="observations" defaultValue={session?.observations} className="min-h-20" /></Field>
          {attended && <Field label="Evolução observada"><Textarea name="evolution" defaultValue={session?.evolution} className="min-h-16" placeholder="Ex.: manteve o tronco alinhado por mais tempo" /></Field>}
          {attended && <Field label="Intercorrências"><Textarea name="incidents" defaultValue={session?.incidents} className="min-h-16" /></Field>}
        </div>
      </Card>
      <SubmitButton size="lg" className="w-full sm:w-auto">{session ? "Salvar alterações" : attended ? "Salvar atendimento" : "Registrar falta"}</SubmitButton>
    </ActionForm>
  );
}
