import Link from "next/link";
import { CalendarDays, Heart, FileText, FolderOpen, Megaphone } from "lucide-react";
import { requireGuardian } from "@/lib/db/queries/family";
import { getSettings } from "@/lib/db/settings";
import { appointmentsOfPractitioner } from "@/lib/db/queries/practitioners";
import { announcementsFor } from "@/lib/db/queries/announcements";
import { Card, EmptyState, Avatar } from "@/components/ui";
import { PractitionerStatusBadge } from "@/components/collaborators/StatusBadge";
import { BrandLogo } from "@/components/brand/Brand";
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
  const unread = (await announcementsFor(user, practitioners.map((p) => p.id), 40)).filter((a) => !a.readBy.includes(user.id));
  const links = [["agenda", "Agenda", CalendarDays], ["evolucao", "Evolução", Heart], ["relatorios", "Relatórios", FileText], ["documentos", "Documentos", FolderOpen]] as const;
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl brand-gradient text-white px-5 py-6 md:px-8 md:py-8">
        <div className="absolute inset-0 brand-glow" aria-hidden />
        <div className="absolute -right-6 -bottom-8 w-64 opacity-[0.10] brand-watermark aspect-[988/518]" aria-hidden />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/75">Área da família</p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Olá, {guardian.name.split(" ")[0]}</h1>
            <p className="text-sm text-white/80 mt-1">Acompanhe aqui o desenvolvimento de quem você cuida.</p>
          </div>
          <BrandLogo tone="white" className="w-24 md:w-32 shrink-0 hidden sm:block" sizes="128px" />
        </div>
      </section>

      {unread.length > 0 && (
        <Link prefetch={false} href="/familia/comunicados" className="flex items-center gap-3 rounded-2xl bg-surface border border-primary-200 shadow-card p-4">
          <span className="h-10 w-10 rounded-xl bg-primary-soft text-primary-600 flex items-center justify-center shrink-0"><Megaphone className="h-5 w-5" /></span>
          <span className="min-w-0"><p className="font-bold">{unread.length} comunicado{unread.length > 1 ? "s" : ""} novo{unread.length > 1 ? "s" : ""}</p><p className="text-sm text-ink-500 truncate">{unread[0].title}</p></span>
        </Link>
      )}

      {cards.length === 0 ? <Card><EmptyState title="Nenhum praticante vinculado ao seu acesso" description="Fale com a equipe da instituição." /></Card> : cards.map(({ p, next, freq }) => (
        <Card key={p.id}>
          <div className="flex items-center gap-3">
            <Avatar name={p.name} size="lg" />
            <div className="min-w-0 flex-1"><p className="text-lg font-extrabold truncate">{p.name}</p><PractitionerStatusBadge status={p.status} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl bg-primary-soft p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-700">Próximo atendimento</p>
              {next ? <><p className="text-lg font-extrabold text-primary-800 tnum">{isoToBR(next.date)}</p><p className="text-sm text-ink-700">{weekdayLabel(next.date)} às {next.startTime} · {next.professionalName}</p></> : <p className="text-sm text-ink-500 mt-1">Nenhum agendado</p>}
            </div>
            <div className="rounded-xl bg-surface-100 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Frequência</p>
              <p className="text-lg font-extrabold tnum">{freq.percent}%</p>
              <p className="text-sm text-ink-700">{freq.done} atendimentos · {freq.missed} faltas</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {links.map(([k, l, Icon]) => (
              <Link prefetch={false} key={k} href={`/familia/${p.id}/${k}`} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3 text-sm font-semibold text-ink-700 hover:border-primary-300 hover:text-primary-700 transition"><Icon className="h-4 w-4 text-primary-600" />{l}</Link>
            ))}
          </div>
        </Card>
      ))}
      <p className="text-center text-[11px] uppercase tracking-[0.18em] text-ink-300 pt-2">{settings.orgName}</p>
    </div>
  );
}
