import Link from "next/link";
import { AppointmentStatusBadge } from "@/components/collaborators/StatusBadge";
import { AppointmentActions } from "./AppointmentActions";
import type { Appointment } from "@/lib/db/types";

export function AppointmentRow({ a, canRecord, canManage, showDate, linkPractitioner, compact }: { a: Appointment; canRecord: boolean; canManage: boolean; showDate?: boolean; linkPractitioner: boolean; compact?: boolean }) {
  return (
    <li className={`px-4 py-3 ${a.status === "cancelled" || a.status === "rescheduled" ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">
            <span className="tabular-nums text-brand-800 mr-2">{showDate ? `${a.date.slice(8, 10)}/${a.date.slice(5, 7)} ` : ""}{a.startTime}</span>
            {linkPractitioner ? <Link href={`/praticantes/${a.practitionerId}`} className="hover:underline">{a.practitionerName}</Link> : a.practitionerName}
          </p>
          <p className="text-sm text-ink-500">{a.type} · {a.professionalName}{a.notes ? ` · ${a.notes}` : ""}</p>
        </div>
        <AppointmentStatusBadge status={a.status} />
      </div>
      <div className="mt-2 no-print"><AppointmentActions a={a} canRecord={canRecord} canManage={canManage} compact={compact} /></div>
    </li>
  );
}
