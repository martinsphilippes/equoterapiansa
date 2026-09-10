import { notFound } from "next/navigation";
import { configForToken } from "@/lib/db/queries/intake";
import { getSettings } from "@/lib/db/settings";
import { todayISO } from "@/lib/domain/dates";
import { BrandLockup } from "@/components/brand/Brand";
import { IntakeForm } from "@/components/intake/IntakeForm";
import { INTAKE_TITLE } from "@/lib/domain/intake";
import type { Params } from "@/lib/types";

export const metadata = { title: "Ficha de cadastro", robots: { index: false, follow: false } };

export default async function PublicIntakePage({ params }: { params: Params<{ token: string }> }) {
  const { token } = await params;
  const [config, settings] = await Promise.all([configForToken(token), getSettings()]);
  if (!config) notFound();
  const entityName = config.entityName?.trim() || settings.orgName;
  const ownBrand = entityName === settings.orgName;
  return (
    <div className="min-h-dvh bg-surface-50">
      <header className="bg-surface border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          {ownBrand ? <BrandLockup compact /> : <span className="font-extrabold text-ink-900">{entityName}</span>}
          <span className="text-xs text-ink-500 text-right">{config.entityCity || (ownBrand ? "" : settings.orgName)}</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">{INTAKE_TITLE}</h1>
          <p className="text-sm text-ink-700 mt-1">
            {config.intro || "Três documentos em um só preenchimento: cadastro e saúde, autorização de imagem e termo de ciência. A identificação é pedida uma única vez."}
          </p>
        </div>
        <IntakeForm token={token} today={todayISO(settings.timezone)} orgName={entityName} />
      </main>
      <footer className="max-w-3xl mx-auto px-4 pb-10 pt-2 text-xs text-ink-500">
        {entityName}{config.entityCity ? ` · ${config.entityCity}` : ""} · Os dados informados são usados para cadastro, planejamento das atividades e segurança do praticante.
      </footer>
    </div>
  );
}
