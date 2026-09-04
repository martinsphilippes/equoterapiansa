import { notFound } from "next/navigation";
import { requireStaff, hasPermission } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { Collections, getDoc } from "@/lib/db/collections";
import { getPractitionerFor, listProfessionals } from "@/lib/db/queries/practitioners";
import { Card, DescriptionList, PageHeader, Badge } from "@/components/ui";
import { SessionForm } from "@/components/sessions/SessionForm";
import { isoToBR, todayISO } from "@/lib/domain/dates";
import type { Params, SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";
import Link from "next/link";

export default async function SessionPage({ params, searchParams }: { params: Params<{ id: string }>; searchParams: SearchParams }) {
  const user = await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const s = await getDoc(Collections.sessions(), id);
  if (!s) notFound();
  const p = await getPractitionerFor(user, s.practitionerId);
  if (!p) notFound();
  const canEdit = hasPermission(user, "sessions.record") && (user.role !== "professional" || s.professionalId === user.collaboratorId);
  const editing = sp1(sp, "editar") === "1" && canEdit;
  if (editing) {
    const [professionals, settings] = await Promise.all([listProfessionals(), getSettings()]);
    return (
      <div className="max-w-2xl">
        <PageHeader title="Editar atendimento" back={`/atendimentos/${id}`} />
        <SessionForm session={s} practitionerId={p.id} practitionerName={p.name} professionals={professionals} lockProfessional={user.role === "professional"} today={todayISO(settings.timezone)} returnTo={`/atendimentos/${id}`} />
      </div>
    );
  }
  return (
    <div className="max-w-2xl">
      <PageHeader title={`Atendimento · ${isoToBR(s.date)} ${s.time}`} subtitle={<Link href={`/praticantes/${p.id}/atendimentos`} className="text-primary-700 hover:underline">{p.name}</Link>} actions={canEdit && <Link href={`/atendimentos/${id}?editar=1`} className="text-sm text-primary-700 hover:underline">Editar</Link>} />
      <Card>
        <div className="mb-4">{s.attended ? <Badge tone="green">Presente</Badge> : <Badge tone="red">Faltou</Badge>}</div>
        <DescriptionList items={[
          { label: "Profissional", value: s.professionalName },
          { label: "Cavalo", value: s.horse ?? "—" },
          { label: "Atividades", value: s.activities.length ? s.activities.join(", ") : "—" },
          { label: "Objetivo trabalhado", value: s.objective ?? "—" },
          { label: "Observações", value: s.observations ?? "—" },
          { label: "Evolução observada", value: s.evolution ?? "—" },
          { label: "Intercorrências", value: s.incidents ?? "—" },
        ]} />
      </Card>
    </div>
  );
}
