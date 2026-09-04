import { Badge } from "@/components/ui";
import type { CollaboratorStatus, PractitionerStatus, AppointmentStatus } from "@/lib/db/types";

export const COLLAB_STATUS: Record<CollaboratorStatus, { label: string; tone: "green" | "amber" | "gray" }> = {
  active: { label: "Ativo", tone: "green" },
  away: { label: "Afastado", tone: "amber" },
  terminated: { label: "Desligado", tone: "gray" },
};
export function CollaboratorStatusBadge({ status }: { status: CollaboratorStatus }) {
  const s = COLLAB_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export const PRACT_STATUS: Record<PractitionerStatus, { label: string; tone: "green" | "amber" | "gray" | "blue" }> = {
  active: { label: "Em acompanhamento", tone: "green" },
  reassessment: { label: "Reavaliação", tone: "blue" },
  paused: { label: "Pausado", tone: "amber" },
  closed: { label: "Encerrado", tone: "gray" },
};
export function PractitionerStatusBadge({ status }: { status: PractitionerStatus }) {
  const s = PRACT_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export const APPT_STATUS: Record<AppointmentStatus, { label: string; tone: "green" | "amber" | "gray" | "blue" | "red" }> = {
  scheduled: { label: "Agendado", tone: "gray" },
  confirmed: { label: "Confirmado", tone: "blue" },
  done: { label: "Realizado", tone: "green" },
  missed: { label: "Faltou", tone: "red" },
  cancelled: { label: "Cancelado", tone: "gray" },
  rescheduled: { label: "Reagendado", tone: "amber" },
};
export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const s = APPT_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
