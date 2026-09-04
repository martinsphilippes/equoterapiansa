import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff, hasPermission } from "@/lib/auth/session";
import { getPractitionerFor, sessionsOfPractitioner } from "@/lib/db/queries/practitioners";
import { Badge, Card, EmptyState, LinkButton } from "@/components/ui";
import { isoToBR } from "@/lib/domain/dates";
import type { Params } from "@/lib/types";

export default async function PractitionerSessionsPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  const p = await getPractitionerFor(user, id);
  if (!p) notFound();
  const sessions = await sessionsOfPractitioner(id);
  const canRecord = hasPermission(user, "sessions.record");
  return (
    <Card title={`Atendimentos (${sessions.length})`} action={canRecord && p.status !== "closed" && <LinkButton href={`/atendimentos/novo?praticante=${id}`} size="sm">Registrar atendimento</LinkButton>} className="p-0">
      {sessions.length === 0 ? <EmptyState title="Nenhum atendimento registrado" /> : (
        <ul className="divide-y divide-border -mt-5">
          {sessions.map((s) => (
            <li key={s.id} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link prefetch={false} href={`/atendimentos/${s.id}`} className="font-medium hover:underline">{isoToBR(s.date)} {s.time} <span className="text-ink-500 font-normal">· {s.professionalName}</span></Link>
                {s.attended ? <Badge tone="green">Presente</Badge> : <Badge tone="red">Faltou</Badge>}
              </div>
              {s.attended && (s.activities.length > 0 || s.objective) && <p className="text-sm text-ink-700 mt-1">{s.objective ? `Objetivo: ${s.objective}. ` : ""}{s.activities.join(", ")}</p>}
              {s.evolution && <p className="text-sm text-primary-800 mt-1">Evolução: {s.evolution}</p>}
              {s.incidents && <p className="text-sm text-red-700 mt-1">Intercorrência: {s.incidents}</p>}
              {s.observations && <p className="text-sm text-ink-500 mt-1">{s.observations}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
