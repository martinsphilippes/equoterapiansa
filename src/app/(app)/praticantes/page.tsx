import Link from "next/link";
import { requireStaff, hasPermission } from "@/lib/auth/session";
import { listPractitioners } from "@/lib/db/queries/practitioners";
import { Card, EmptyState, Input, LinkButton, PageHeader, Avatar } from "@/components/ui";
import { PractitionerStatusBadge } from "@/components/collaborators/StatusBadge";
import { ageFrom } from "@/lib/domain/dates";
import type { SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";
import { redirect } from "next/navigation";

export const metadata = { title: "Praticantes" };

export default async function PractitionersPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireStaff();
  if (!hasPermission(user, "practitioners.view") && user.role !== "professional") redirect("/sem-permissao");
  const sp = await searchParams;
  const status = (sp1(sp, "situacao") ?? "active") as "active" | "reassessment" | "paused" | "closed" | "all";
  const search = sp1(sp, "busca");
  const items = await listPractitioners(user, { status, search });
  const filters = [["active", "Em acompanhamento"], ["reassessment", "Reavaliação"], ["paused", "Pausados"], ["closed", "Encerrados"], ["all", "Todos"]];
  const canManage = hasPermission(user, "practitioners.manage");
  return (
    <div>
      <PageHeader title="Praticantes" subtitle={`${items.length} praticante${items.length === 1 ? "" : "s"}`} actions={canManage && <LinkButton href="/praticantes/novo">+ Novo praticante</LinkButton>} />
      <form className="mb-3"><Input name="busca" placeholder="Buscar por nome…" defaultValue={search} /><input type="hidden" name="situacao" value={status} /></form>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {filters.map(([v, l]) => (
          <Link prefetch={false} key={v} href={`/praticantes?situacao=${v}${search ? `&busca=${encodeURIComponent(search)}` : ""}`} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${status === v ? "bg-primary-600 text-white" : "bg-surface border border-border text-ink-700"}`}>{l}</Link>
        ))}
      </div>
      <Card className="p-0">
        {items.length === 0 ? (
          <EmptyState title="Nenhum praticante encontrado" description={user.role === "professional" ? "Você vê apenas os praticantes atribuídos a você." : undefined} action={canManage && <LinkButton href="/praticantes/novo" variant="secondary">Cadastrar praticante</LinkButton>} />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((p) => (
              <li key={p.id}>
                <Link prefetch={false} href={`/praticantes/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-50">
                  <Avatar name={p.name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-sm text-ink-500">{ageFrom(p.birthDate) !== null ? `${ageFrom(p.birthDate)} anos` : "Idade não informada"}</p>
                  </div>
                  <PractitionerStatusBadge status={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
