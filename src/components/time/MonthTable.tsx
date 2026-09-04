"use client";
import { Fragment, useState } from "react";
import { Badge, Table, thCls, tdCls } from "@/components/ui";
import { TimeEntryForm } from "./TimeEntryForm";
import { isoToBR, minutesToHM, weekdayLabel } from "@/lib/domain/dates";
import type { TimeEntry } from "@/lib/db/types";

export function DayStatus({ entry, isWorking, isPast }: { entry?: TimeEntry; isWorking: boolean; isPast: boolean }) {
  if (entry?.status === "present") return <Badge tone="green">Presente</Badge>;
  if (entry?.status === "absent") return <Badge tone="red">Falta</Badge>;
  if (entry?.status === "justified") return <Badge tone="amber">Justificada</Badge>;
  if (entry?.status === "off") return <Badge tone="gray">Folga</Badge>;
  if (!isWorking) return <span className="text-xs text-ink-300">—</span>;
  if (isPast) return <Badge tone="red">Sem registro</Badge>;
  return <span className="text-xs text-ink-300">Previsto</span>;
}

export function MonthTable({ collaboratorId, days, entries, isManager, today, editableToday }: { collaboratorId: string; days: { date: string; isWorking: boolean }[]; entries: TimeEntry[]; isManager: boolean; today: string; editableToday: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const map = new Map(entries.map((e) => [e.date, e]));
  return (
    <Table>
      <thead>
        <tr><th className={thCls}>Dia</th><th className={thCls}>Situação</th><th className={thCls}>Horários</th><th className={thCls}>Total</th><th className={thCls}>Atraso/Saída</th><th className={thCls}></th></tr>
      </thead>
      <tbody>
        {days.map(({ date, isWorking }) => {
          const e = map.get(date);
          const canEdit = isManager || (editableToday && date === today);
          const isEditing = editing === date;
          return (
            <Fragment key={date}>
              <tr className={date === today ? "bg-primary-50/60" : !isWorking ? "text-ink-300" : ""}>
                <td className={tdCls}><span className="font-medium">{isoToBR(date).slice(0, 5)}</span> <span className="text-xs">{weekdayLabel(date, true)}</span></td>
                <td className={tdCls}><DayStatus entry={e} isWorking={isWorking} isPast={date < today} /></td>
                <td className={tdCls}>{e?.periods.map((p, i) => <span key={i} className="inline-block mr-2 whitespace-nowrap">{p.in}→{p.out ?? "…"}</span>)}{e?.breakMinutes ? <span className="text-xs text-ink-500">(−{e.breakMinutes}min)</span> : null}</td>
                <td className={tdCls}>{e?.status === "present" ? minutesToHM(e.workedMinutes) : ""}</td>
                <td className={tdCls}>
                  {e?.lateMinutes ? <Badge tone="amber">+{e.lateMinutes}min</Badge> : null}
                  {e?.earlyLeaveMinutes ? <Badge tone="amber" className="ml-1">−{e.earlyLeaveMinutes}min</Badge> : null}
                  {(e?.justification || e?.managerNote) && <span className="block text-xs text-ink-500 mt-1">{e.justification}{e.managerNote ? ` · Gestor: ${e.managerNote}` : ""}</span>}
                </td>
                <td className={tdCls}>{canEdit && <button className="text-sm text-primary-700 hover:underline" onClick={() => setEditing(isEditing ? null : date)}>{isEditing ? "Fechar" : e ? "Editar" : "Registrar"}</button>}</td>
              </tr>
              {isEditing && (
                <tr><td colSpan={6} className="border-t border-border bg-surface-50 p-4">
                  <div className="max-w-md"><TimeEntryForm collaboratorId={collaboratorId} date={date} entry={e} isManager={isManager} onClose={() => setEditing(null)} /></div>
                </td></tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </Table>
  );
}
