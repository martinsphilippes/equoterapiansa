"use client";
import { useState, type ReactNode } from "react";
import { tdCls } from "@/components/ui";
import { TimeEntryForm } from "./TimeEntryForm";
import type { TimeEntry } from "@/lib/db/types";

export function TeamDayEditor({ collaboratorId, date, entry, name, status, periods, total }: { collaboratorId: string; date: string; entry: TimeEntry | null; name: ReactNode; status: ReactNode; periods: string; total: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr>
        <td className={tdCls}>{name}</td>
        <td className={tdCls}>{status}</td>
        <td className={tdCls}>{periods}</td>
        <td className={tdCls}>{total}</td>
        <td className={tdCls}><button className="text-sm text-brand-700 hover:underline" onClick={() => setOpen(!open)}>{open ? "Fechar" : entry ? "Corrigir" : "Registrar"}</button></td>
      </tr>
      {open && (
        <tr><td colSpan={5} className="border-t border-ink-100 bg-sand-50 p-4"><div className="max-w-md"><TimeEntryForm collaboratorId={collaboratorId} date={date} entry={entry} isManager onClose={() => setOpen(false)} compact /></div></td></tr>
      )}
    </>
  );
}
