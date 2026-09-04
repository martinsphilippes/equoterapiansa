import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/auth/session";
import { listGuardians, listPractitioners } from "@/lib/db/queries/practitioners";
import { Avatar, Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { formatPhone } from "@/lib/domain/format";

export const metadata = { title: "Responsáveis" };

export default async function GuardiansPage() {
  const user = await requirePermission(["practitioners.view", "practitioners.manage"]);
  const [guardians, practitioners] = await Promise.all([listGuardians(), listPractitioners(user, { status: "all" })]);
  const pName = new Map(practitioners.map((p) => [p.id, p.name]));
  const canManage = hasPermission(user, "practitioners.manage");
  return (
    <div>
      <PageHeader title="Responsáveis" subtitle={`${guardians.length} cadastrado${guardians.length === 1 ? "" : "s"}`} actions={canManage && <LinkButton href="/responsaveis/novo">+ Novo responsável</LinkButton>} />
      <Card className="p-0">
        {guardians.length === 0 ? <EmptyState title="Nenhum responsável cadastrado" /> : (
          <ul className="divide-y divide-ink-100">
            {guardians.map((g) => (
              <li key={g.id}>
                <Link href={`/responsaveis/${g.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-sand-50">
                  <Avatar name={g.name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{g.name} <span className="text-ink-500 font-normal">· {g.relationship}</span></p>
                    <p className="text-sm text-ink-500 truncate">{g.practitionerIds.map((id) => pName.get(id)).filter(Boolean).join(", ") || "Sem praticante vinculado"} · {formatPhone(g.phone)}</p>
                  </div>
                  {g.userId ? <Badge tone="green">Com acesso</Badge> : <Badge tone="gray">Sem acesso</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
