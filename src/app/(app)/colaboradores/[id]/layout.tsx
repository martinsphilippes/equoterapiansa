import { notFound } from "next/navigation";
import { requirePermission, hasPermission, hasAny } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { CollaboratorHeader } from "@/components/collaborators/CollaboratorHeader";
import type { ReactNode } from "react";

export default async function CollaboratorLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const user = await requirePermission(["collaborators.view", "collaborators.manage"]);
  const { id } = await params;
  const c = await getDoc(Collections.collaborators(), id);
  if (!c) notFound();
  const tabs = [
    { href: `/colaboradores/${id}`, label: "Dados" },
    { href: `/colaboradores/${id}/documentos`, label: "Documentos" },
    { href: `/colaboradores/${id}/jornada`, label: "Jornada" },
  ];
  if (hasAny(user, ["finance.view", "payments.manage"])) tabs.push({ href: `/colaboradores/${id}/pagamentos`, label: "Pagamentos" });
  if (hasPermission(user, "users.manage")) tabs.push({ href: `/colaboradores/${id}/acesso`, label: "Acesso" });
  return (
    <div>
      <CollaboratorHeader collaborator={c} tabs={tabs} canManage={hasPermission(user, "collaborators.manage")} />
      {children}
    </div>
  );
}
