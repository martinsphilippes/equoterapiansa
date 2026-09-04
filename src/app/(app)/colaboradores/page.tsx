import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/auth/session";
import { listCollaborators, pendingDocumentsCount } from "@/lib/db/queries/collaborators";
import { Card, EmptyState, LinkButton, PageHeader, Badge, Avatar } from "@/components/ui";
import { CollaboratorStatusBadge } from "@/components/collaborators/StatusBadge";
import type { SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

export const metadata = { title: "Equipe" };

export default async function CollaboratorsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission(["collaborators.view", "collaborators.manage"]);
  const sp = await searchParams;
  const status = (sp1(sp, "situacao") ?? "active") as "active" | "away" | "terminated" | "all";
  const items = await listCollaborators({ status });
  const pending = await pendingDocumentsCount("collaborator", items.map((c) => c.id));
  const pendingMap = new Map(pending.map((p) => [p.ownerId, p]));
  const filters = [["active", "Ativos"], ["away", "Afastados"], ["terminated", "Desligados"], ["all", "Todos"]];

  return (
    <div>
      <PageHeader title="Equipe" subtitle={`${items.length} colaborador${items.length === 1 ? "" : "es"}`} actions={hasPermission(user, "collaborators.manage") && <LinkButton href="/colaboradores/novo">+ Novo colaborador</LinkButton>} />
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {filters.map(([v, l]) => (
          <Link key={v} href={`/colaboradores?situacao=${v}`} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${status === v ? "bg-brand-600 text-white" : "bg-white border border-ink-100 text-ink-700"}`}>{l}</Link>
        ))}
      </div>
      <Card className="p-0">
        {items.length === 0 ? (
          <EmptyState title="Nenhum colaborador nesta situação" action={hasPermission(user, "collaborators.manage") && <LinkButton href="/colaboradores/novo" variant="secondary">Cadastrar o primeiro</LinkButton>} />
        ) : (
          <ul className="divide-y divide-ink-100">
            {items.map((c) => {
              const p = pendingMap.get(c.id);
              return (
                <li key={c.id}>
                  <Link href={`/colaboradores/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-sand-50">
                    <Avatar name={c.name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{c.name}</p>
                      <p className="text-sm text-ink-500 truncate">{c.jobRoleName ?? "Sem função"}{c.phone ? ` · ${c.phone}` : ""}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <CollaboratorStatusBadge status={c.status} />
                      {p && <Badge tone={p.expired ? "red" : "amber"}>Docs: {p.missing + p.expired}</Badge>}
                      {!c.userId && c.status === "active" && <span className="text-[11px] text-ink-300">sem acesso</span>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
