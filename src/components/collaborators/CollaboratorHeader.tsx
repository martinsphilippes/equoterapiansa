"use client";
import { usePathname } from "next/navigation";
import { Avatar, LinkButton, PageHeader, Tabs } from "@/components/ui";
import { CollaboratorStatusBadge } from "./StatusBadge";
import type { Collaborator } from "@/lib/db/types";

export function CollaboratorHeader({ collaborator: c, tabs, canManage }: { collaborator: Collaborator; tabs: { href: string; label: string }[]; canManage: boolean }) {
  const pathname = usePathname();
  return (
    <>
      <PageHeader
        back="/colaboradores"
        title={<span className="flex items-center gap-3"><Avatar name={c.name} /> {c.name}</span>}
        subtitle={<span className="flex items-center gap-2">{c.jobRoleName ?? "Sem função"} <CollaboratorStatusBadge status={c.status} /></span>}
        actions={canManage && <LinkButton href={`/colaboradores/${c.id}/editar`} variant="outline">Editar</LinkButton>}
      />
      <Tabs tabs={tabs} current={pathname} />
    </>
  );
}
