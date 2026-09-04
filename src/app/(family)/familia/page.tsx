import Link from "next/link";
import { requireGuardian } from "@/lib/db/queries/family";
import { getSettings } from "@/lib/db/settings";
import { appointmentsOfPractitioner } from "@/lib/db/queries/practitioners";
import { announcementsFor } from "@/lib/db/queries/announcements";
import { Card, EmptyState, PageHeader, Avatar } from "@/components/ui";
import { PractitionerStatusBadge } from "@/components/collaborators/StatusBadge";
import { computeFrequency } from "@/lib/domain/frequency";
import { isoToBR, todayISO, weekdayLabel } from "@/lib/domain/dates";

export const metadata = { title: "Área da família" };

export default async function FamilyHome() {
  const [{ user, guardian, practitioners }, settings] = await Promise.all([requireGuardian(), getSettings()]);
  const today = todayISO(settings.timezone);
  const cards = await Promise.all(practitioners.map(async (p) => {
    const appts = await appointmentsOfPractitioner(p.id);
    const next = appts.find((a) => a.date >= today && (a.status === "scheduled" || a.status === "confirmed"));
    return { p, next, freq: computeFrequency(appts) };
  }));
  const unread = (await announcementsFor(user, practitioners.map((p) => p.id))).filter((a) => !a.readBy.includes(user.id));
  return (
    <div className="space-y-5">
      <PageHeader title={`Olá, ${guardian.name.split(" ")[0]}`} subtitle={settings.orgName} />
      {unread.length > 0 && (
        <Link href="/familia/comunicados" className="block rounded-2xl bg-brand-600 text-white p-4">
          <p className="font-semibold">{unread.length} comunicado{unread.length > 1 ? "s" : ""} novo{unread.length > 1 ? "s" : ""}</p>
          <p className="text-sm opacity-90 truncate">{unread[0].title}</p>
        </Link>
      )}
      {cards.length === 0 ? <Card><EmptyState title="Nenhum praticante vinculado ao seu acesso" description="Fale com a equipe da instituição." /></Card> : cards.map(({ p, next, freq }) => (
        <Card key={p.id}>
          <div className="flex items-center gap-3">
            <Avatar name={p.name} size="lg" />
            <div className="min-w-0 flex-1"><p className="text-lg font-semibold truncate">{p.name}</p><PractitionerStatusBadge status={p.status} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl bg-sand-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-500">Próximo atendimento</p>
              {next ? <><p className="text-lg font-semibold">{isoToBR(next.date)}</p><p className="text-sm text-ink-700">{weekdayLabel(next.date)} às {next.startTime} · {next.professionalName}</p></> : <p className="text-sm text-ink-500 mt-1">Nenhum agendado</p>}
            </div>
            <div className="rounded-xl bg-sand-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-500">Frequência</p>
              <p className="text-lg font-semibold">{freq.percent}%</p>
              <p className="text-sm text-ink-700">{freq.done} atendimentos · {freq.missed} faltas</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {[["agenda", "Agenda"], ["evolucao", "Evolução"], ["relatorios", "Relatórios"], ["documentos", "Documentos"]].map(([k, l]) => (
              <Link key={k} href={`/familia/${p.id}/${k}`} className="rounded-xl border border-ink-100 bg-white py-3 text-center text-sm font-medium hover:bg-sand-50">{l}</Link>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
