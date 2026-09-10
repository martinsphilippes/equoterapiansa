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
  return (
    <div className="min-h-dvh bg-surface-50">
      <header className="bg-surface border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <BrandLockup compact />
          <span className="text-xs text-ink-500 text-right">{settings.orgName}</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">{INTAKE_TITLE}</h1>
          <p className="text-sm text-ink-700 mt-1">
            {config.intro || "Preencha os dados abaixo antes da primeira aula. Leva poucos minutos e evita preencher papel na chegada."}
          </p>
        </div>
        <IntakeForm token={token} today={todayISO(settings.timezone)} />
      </main>
      <footer className="max-w-3xl mx-auto px-4 pb-10 pt-2 text-xs text-ink-500">
        {settings.orgName} · Os dados informados são usados para cadastro, planejamento das atividades e segurança do praticante.
      </footer>
    </div>
  );
}
