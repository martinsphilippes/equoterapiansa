import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { Collections, getDoc } from "@/lib/db/collections";
import { listPractitioners, listProfessionals } from "@/lib/db/queries/practitioners";
import { PageHeader } from "@/components/ui";
import { AppointmentForm } from "@/components/agenda/AppointmentForm";
import type { Params } from "@/lib/types";

export default async function EditAppointmentPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requirePermission("schedule.manage");
  const { id } = await params;
  const [a, settings, practitioners, professionals] = await Promise.all([getDoc(Collections.appointments(), id), getSettings(), listPractitioners(user, { status: "all" }), listProfessionals()]);
  if (!a) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Editar agendamento" back={`/agenda?data=${a.date}`} />
      <AppointmentForm appointment={a} practitioners={practitioners} professionals={professionals} types={settings.sessionTypes} />
    </div>
  );
}
