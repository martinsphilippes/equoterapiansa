import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff, hasPermission } from "@/lib/auth/session";
import { getPractitionerFor, assessmentsOfPractitioner } from "@/lib/db/queries/practitioners";
import { Badge, Card, EmptyState, LinkButton } from "@/components/ui";
import { isoToBR } from "@/lib/domain/dates";
import type { Params } from "@/lib/types";

const TYPE = { initial: "Inicial", periodic: "Periódica", final: "Final" };

export default async function AssessmentsPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  const p = await getPractitionerFor(user, id);
  if (!p) notFound();
  const list = (await assessmentsOfPractitioner(id)).reverse();
  const canRecord = hasPermission(user, "assessments.record");
  return (
    <Card title={`Avaliações (${list.length})`} action={canRecord && p.status !== "closed" && <LinkButton href={`/praticantes/${id}/avaliacoes/nova`} size="sm">+ Nova avaliação</LinkButton>} className="p-0">
      {list.length === 0 ? <EmptyState title="Nenhuma avaliação registrada" description="Comece pela avaliação inicial: ela é a referência para medir a evolução." action={canRecord && <LinkButton href={`/praticantes/${id}/avaliacoes/nova`} variant="secondary">Registrar avaliação inicial</LinkButton>} /> : (
        <ul className="divide-y divide-ink-100 -mt-5">
          {list.map((a) => (
            <li key={a.id}>
              <Link href={`/praticantes/${id}/avaliacoes/${a.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-sand-50">
                <div>
                  <p className="font-medium">{isoToBR(a.date)} <Badge tone={a.type === "initial" ? "blue" : a.type === "final" ? "gray" : "green"} className="ml-1">{TYPE[a.type]}</Badge></p>
                  <p className="text-sm text-ink-500">{a.professionalName}</p>
                </div>
                <div className="text-right"><p className="text-lg font-semibold">{a.overallAverage ?? "—"}<span className="text-xs text-ink-500">/{a.scaleMax}</span></p><p className="text-xs text-ink-500">média geral</p></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
