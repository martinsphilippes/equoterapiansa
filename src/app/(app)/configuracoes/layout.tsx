import { requirePermission, hasPermission } from "@/lib/auth/session";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { PageHeader } from "@/components/ui";
import type { ReactNode } from "react";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const user = await requirePermission(["settings.manage", "users.manage"]);
  const tabs = [];
  if (hasPermission(user, "settings.manage")) {
    tabs.push({ href: "/configuracoes", label: "Instituição e jornada" }, { href: "/configuracoes/funcoes", label: "Funções" }, { href: "/configuracoes/documentos", label: "Tipos de documentos" }, { href: "/configuracoes/avaliacao", label: "Avaliação" });
  }
  if (hasPermission(user, "users.manage")) tabs.push({ href: "/configuracoes/usuarios", label: "Usuários e permissões" });
  return (
    <div>
      <PageHeader title="Configurações" />
      <SettingsTabs tabs={tabs} />
      {children}
    </div>
  );
}
