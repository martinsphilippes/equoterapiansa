"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { upsertTimeEntry } from "@/lib/actions/time";
import { isoToBR, weekdayLabel } from "@/lib/domain/dates";
import type { TimeEntry } from "@/lib/db/types";

export function TimeEntryForm({ collaboratorId, date, entry, isManager, onClose, compact }: { collaboratorId: string; date: string; entry?: TimeEntry | null; isManager: boolean; onClose?: () => void; compact?: boolean }) {
  const [status, setStatus] = useState<TimeEntry["status"]>(entry?.status ?? "present");
  const periods = entry?.periods ?? [];
  return (
    <ActionForm action={upsertTimeEntry} className="space-y-3" onSuccess={onClose}>
      <input type="hidden" name="collaboratorId" value={collaboratorId} />
      <input type="hidden" name="date" value={date} />
      {!compact && <p className="font-medium">{weekdayLabel(date)}, {isoToBR(date)}</p>}
      <Field label="Situação">
        <Select name="status" value={status} onChange={(e) => setStatus(e.target.value as TimeEntry["status"])}>
          <option value="present">Presente</option>
          <option value="absent">Falta</option>
          <option value="justified">Falta justificada</option>
          {isManager && <option value="off">Folga / dispensa</option>}
        </Select>
      </Field>
      {status === "present" && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink-700">Horários (entrada → saída)</p>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <Input type="time" name={`p${i}_in`} defaultValue={periods[i]?.in ?? ""} />
              <Input type="time" name={`p${i}_out`} defaultValue={periods[i]?.out ?? ""} />
            </div>
          ))}
          <Field label="Intervalo não trabalhado (minutos)" hint="Descontado do total do dia, se houver."><Input type="number" min={0} name="breakMinutes" defaultValue={entry?.breakMinutes ?? 0} /></Field>
        </div>
      )}
      <Field label="Justificativa"><Textarea name="justification" defaultValue={entry?.justification ?? ""} className="min-h-16" /></Field>
      {isManager && <Field label="Observação do gestor"><Textarea name="managerNote" defaultValue={entry?.managerNote ?? ""} className="min-h-16" /></Field>}
      <div className="flex gap-2">
        <SubmitButton>Salvar</SubmitButton>
        {onClose && <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>}
      </div>
    </ActionForm>
  );
}
