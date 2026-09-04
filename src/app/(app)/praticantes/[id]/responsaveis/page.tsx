import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff, hasPermission } from "@/lib/auth/session";
import { getPractitionerFor, guardiansOf } from "@/lib/db/queries/practitioners";
import { Badge, Card, EmptyState, LinkButton } from "@/components/ui";
import { formatPhone } from "@/lib/domain/format";
import type { Params } from "@/lib/types";

export default async function PractitionerGuardiansPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  const p = await getPractitionerFor(user, id);
  if (!p) notFound();
  const guardians = await guardiansOf(p);
  const canManage = hasPermission(user, "practitioners.manage");
  return (
    <Card title="Responsáveis" action={canManage && <div className="flex gap-2"><LinkButton href={`/responsaveis/novo?praticante=${id}`} size="sm" variant="secondary">+ Novo responsável</LinkButton><LinkButton href={`/praticantes/${id}/editar`} size="sm" variant="outline">Vincular existente</LinkButton></div>}>
      {guardians.length === 0 ? <EmptyState title="Nenhum responsável vinculado" description="Cadastre ou vincule um responsável para liberar a área da família." /> : (
        <ul className="divide-y divide-border">
          {guardians.map((g) => (
            <li key={g.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <Link href={`/responsaveis/${g.id}`} className="font-medium hover:underline">{g.name}</Link>
                <p className="text-sm text-ink-500">{g.relationship} · {formatPhone(g.phone)}{g.email ? ` · ${g.email}` : ""}</p>
              </div>
              {g.userId ? <Badge tone="green">Com acesso</Badge> : <Badge tone="gray">Sem acesso</Badge>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
