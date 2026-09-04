"use client";
import { useState } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Button, Field, Input } from "@/components/ui";
import { deleteAppointment, setAppointmentStatus } from "@/lib/actions/appointments";
import type { Appointment } from "@/lib/db/types";

/** Ações rápidas de um agendamento: confirmar, registrar, faltou, cancelar, reagendar. */
export function AppointmentActions({ a, canRecord, canManage, compact }: { a: Appointment; canRecord: boolean; canManage: boolean; compact?: boolean }) {
  const [resched, setResched] = useState(false);
  if (a.status === "done") {
    return a.sessionId ? <Link href={`/atendimentos/${a.sessionId}`} className="text-sm text-brand-700 hover:underline">Ver registro</Link> : null;
  }
  if (a.status === "cancelled" || a.status === "rescheduled") return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {canRecord && <Link href={`/atendimentos/novo?agendamento=${a.id}`} className="inline-flex items-center h-8 px-3 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700">Registrar</Link>}
      {a.status === "scheduled" && (canRecord || canManage) && (
        <ActionForm action={setAppointmentStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="confirmed" /><SubmitButton size="sm" variant="outline" className="h-8 text-xs" pendingText="…">Confirmar</SubmitButton></ActionForm>
      )}
      {(canRecord || canManage) && (
        <ActionForm action={setAppointmentStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="missed" /><ConfirmButton message="Marcar falta do praticante?" size="sm" variant="ghost" className="h-8 text-xs text-red-700">Faltou</ConfirmButton></ActionForm>
      )}
      {canManage && !compact && (
        <>
          <ActionForm action={setAppointmentStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="cancelled" /><ConfirmButton message="Cancelar este agendamento?" size="sm" variant="ghost" className="h-8 text-xs">Cancelar</ConfirmButton></ActionForm>
          <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setResched(!resched)}>Reagendar</Button>
          <Link href={`/agenda/${a.id}`} className="text-xs text-ink-500 hover:underline px-1">Editar</Link>
          <ActionForm action={deleteAppointment}><input type="hidden" name="id" value={a.id} /><ConfirmButton message="Excluir definitivamente este agendamento?" size="sm" variant="ghost" className="h-8 text-xs text-ink-500">Excluir</ConfirmButton></ActionForm>
        </>
      )}
      {resched && (
        <ActionForm action={setAppointmentStatus} className="w-full mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-sand-50 p-2" onSuccess={() => setResched(false)}>
          <input type="hidden" name="id" value={a.id} />
          <input type="hidden" name="status" value="rescheduled" />
          <Field label="Nova data"><Input type="date" name="newDate" required className="h-9" /></Field>
          <Field label="Novo horário"><Input type="time" name="newTime" defaultValue={a.startTime} className="h-9" /></Field>
          <SubmitButton size="sm">Confirmar reagendamento</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
