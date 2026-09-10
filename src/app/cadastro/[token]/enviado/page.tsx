import { CheckCircle2 } from "lucide-react";
import { getSettings } from "@/lib/db/settings";
import { BrandLockup } from "@/components/brand/Brand";
import type { Params, SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

export const metadata = { title: "Ficha enviada", robots: { index: false, follow: false } };

export default async function IntakeSentPage({ params, searchParams }: { params: Params<{ token: string }>; searchParams: SearchParams }) {
  await params;
  const [sp, settings] = await Promise.all([searchParams, getSettings()]);
  const protocol = sp1(sp, "p");
  return (
    <div className="min-h-dvh bg-surface-50 flex flex-col">
      <header className="bg-surface border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4"><BrandLockup compact /></div>
      </header>
      <main className="flex-1 max-w-xl mx-auto px-4 py-14 text-center">
        <CheckCircle2 className="h-14 w-14 mx-auto text-success" strokeWidth={1.6} />
        <h1 className="mt-4 text-2xl font-extrabold text-ink-900">Ficha enviada</h1>
        <p className="mt-2 text-ink-700">Recebemos suas informações. A secretaria vai conferir antes da primeira aula.</p>
        {protocol && (
          <div className="mt-6 inline-block rounded-2xl border border-border bg-surface px-6 py-4">
            <p className="text-xs uppercase tracking-wide text-ink-500">Protocolo</p>
            <p className="text-2xl font-extrabold tnum text-primary-700">{protocol}</p>
          </div>
        )}
        <p className="mt-6 text-sm text-ink-500">Guarde este número. Se precisar corrigir alguma informação, fale com {settings.orgName} informando o protocolo.</p>
      </main>
    </div>
  );
}
