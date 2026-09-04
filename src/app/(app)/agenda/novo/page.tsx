import { requirePermission } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { listPractitioners, listProfessionals } from "@/lib/db/queries/practitioners";
import { PageHeader } from "@/components/ui";
import { AppointmentForm } from "@/components/agenda/AppointmentForm";
import { todayISO } from "@/lib/domain/dates";
import type { SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

export default async function NewAppointmentPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("schedule.manage");
  const sp = await searchParams;
  const settings = await getSettings();
  const [practitioners, professionals] = await Promise.all([listPractitioners(user, { status: "all" }), listProfessionals()]);
  const practitionerId = sp1(sp, "praticante");
  return (
    <div className="max-w-2xl">
      <PageHeader title="Novo agendamento" back={practitionerId ? `/praticantes/${practitionerId}/agenda` : "/agenda"} />
      <AppointmentForm practitioners={practitioners.filter((p) => p.status !== "closed")} professionals={professionals} types={settings.sessionTypes} defaults={{ date: sp1(sp, "data") ?? todayISO(settings.timezone), practitionerId }} returnTo={practitionerId ? `/praticantes/${practitionerId}/agenda` : undefined} />
    </div>
  );
}
