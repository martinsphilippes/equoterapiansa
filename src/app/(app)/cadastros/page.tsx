import Link from "next/link";
import { headers } from "next/headers";
import { requirePermission } from "@/lib/auth/session";
import { getIntakeConfig, listSubmissions } from "@/lib/db/queries/intake";
import { Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui";
import { IntakeLinkCard } from "@/components/intake/IntakeLinkCard";
import { IntakeSettingsCard } from "@/components/intake/IntakeSettingsCard";
import { getSettings } from "@/lib/db/settings";
import { formatDateTime } from "@/lib/domain/dates";
import { formatPhone } from "@/lib/domain/format";
import type { IntakeStatus } from "@/lib/db/types";
import type { SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

export const metadata = { title: "Fichas recebidas" };

const TABS: [IntakeStatus | "all", string][] = [
  ["new", "Novas"], ["reviewed", "Conferidas"], ["converted", "Convertidas"], ["archived", "Arquivadas"], ["all", "Todas"],
];
const TONE: Record<IntakeStatus, "amber" | "blue" | "green" | "gray"> = { new: "amber", reviewed: "blue", converted: "green", archived: "gray" };
const LABEL: Record<IntakeStatus, string> = { new: "Nova", reviewed: "Conferida", converted: "Convertida", archived: "Arquivada" };

export default async function IntakeListPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("intake.manage");
  const sp = await searchParams;
  const status = (sp1(sp, "situacao") ?? "new") as IntakeStatus | "all";
  const [config, items, h, settings] = await Promise.all([getIntakeConfig(), listSubmissions(status), headers(), getSettings()]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const publicUrl = config.token ? `${proto}://${host}/cadastro/${config.token}` : "";
  const q = (sp1(sp, "busca") ?? "").toLowerCase();
  const list = q ? items.filter((i) => `${i.practitionerName} ${i.guardianName ?? ""} ${i.protocol}`.toLowerCase().includes(q)) : items;
  return (
    <div className="space-y-5">
      <PageHeader title="Fichas recebidas" subtitle="Cadastros preenchidos pelo formulário público, antes de virarem praticantes." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <IntakeLinkCard token={config.token} active={config.active} url={publicUrl} />
        <IntakeSettingsCard entityName={config.entityName} entityCity={config.entityCity} intro={config.intro} orgName={settings.orgName} />
      </div>

      <div className="flex flex-wrap gap-2 no-print">
        {TABS.map(([v, label]) => (
          <Link prefetch={false} key={v} href={`/cadastros?situacao=${v}`}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold ${status === v ? "bg-primary text-white" : "bg-surface border border-border"}`}>{label}</Link>
        ))}
      </div>

      <form className="no-print"><input name="situacao" type="hidden" value={status} />
        <input name="busca" defaultValue={q} placeholder="Buscar por nome ou protocolo" className="w-full sm:max-w-sm rounded-xl border border-border bg-surface px-3.5 h-10 text-base" />
      </form>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Nesta lista" value={list.length} />
        <Stat label="Menores de idade" value={list.filter((i) => i.minor).length} />
        <Stat label="Com alerta de saúde" value={list.filter((i) => Object.entries(i.answers).some(([k, v]) => k.startsWith("sau_") && v === "sim")).length} tone="amber" />
        <Stat label="Já convertidas" value={list.filter((i) => i.status === "converted").length} tone="green" />
      </div>

      <Card className="p-0">
        {list.length === 0 ? (
          <EmptyState title="Nenhuma ficha nesta situação" description={config.token ? "Envie o link do formulário para as famílias." : "Gere o link do formulário para começar a receber fichas."} />
        ) : (
          <ul className="divide-y divide-border">
            {list.map((i) => {
              const alerts = Object.entries(i.answers).filter(([k, v]) => k.startsWith("sau_") && v === "sim").length;
              return (
                <li key={i.id}>
                  <Link prefetch={false} href={`/cadastros/${i.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-50">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{i.practitionerName}</p>
                      <p className="text-xs text-ink-500 truncate">
                        {i.protocol} · {formatDateTime(i.submittedAt)}
                        {i.minor && i.guardianName ? ` · resp. ${i.guardianName}` : ""}
                        {i.phone ? ` · ${formatPhone(i.phone)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {i.minor && <Badge tone="blue">Menor</Badge>}
                      {alerts > 0 && <Badge tone="amber">{alerts} alerta(s)</Badge>}
                      <Badge tone={TONE[i.status]}>{LABEL[i.status]}</Badge>
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
