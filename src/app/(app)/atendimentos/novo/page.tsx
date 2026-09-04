import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { Collections, getDoc } from "@/lib/db/collections";
import { getPractitionerFor, listProfessionals } from "@/lib/db/queries/practitioners";
import { Alert, PageHeader } from "@/components/ui";
import { SessionForm } from "@/components/sessions/SessionForm";
import { todayISO } from "@/lib/domain/dates";
import type { SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

export const metadata = { title: "Registrar atendimento" };

export default async function NewSessionPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("sessions.record");
  const sp = await searchParams;
  const settings = await getSettings();
  const appointmentId = sp1(sp, "agendamento");
  let practitionerId = sp1(sp, "praticante");
  const appointment = appointmentId ? await getDoc(Collections.appointments(), appointmentId) : null;
  if (appointmentId && !appointment) notFound();
  if (appointment?.sessionId) redirect(`/atendimentos/${appointment.sessionId}`);
  if (appointment) practitionerId = appointment.practitionerId;
  if (!practitionerId) redirect("/agenda");
  const p = await getPractitionerFor(user, practitionerId);
  if (!p) notFound();
  const professionals = await listProfessionals();
  const isProfessional = user.role === "professional";
  if (isProfessional && !professionals.some((c) => c.id === user.collaboratorId)) {
    return <Alert tone="warning">Seu cadastro de colaborador não está com uma função de atendimento. Peça à administração para ajustar.</Alert>;
  }
  return (
    <div className="max-w-2xl">
      <PageHeader title="Registrar atendimento" back={appointment ? `/agenda?data=${appointment.date}` : `/praticantes/${p.id}/atendimentos`} />
      <SessionForm appointment={appointment} practitionerId={p.id} practitionerName={p.name} professionals={professionals} currentProfessionalId={user.collaboratorId} lockProfessional={isProfessional} today={todayISO(settings.timezone)} returnTo={appointment ? `/agenda?data=${appointment.date}` : undefined} />
    </div>
  );
}
