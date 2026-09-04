import { Badge } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { deleteAnnouncement, markAnnouncementRead } from "@/lib/actions/announcements";
import { formatDateTime } from "@/lib/domain/dates";
import type { Announcement } from "@/lib/db/types";

const AUD: Record<Announcement["audience"], string> = { all: "Todos", staff: "Equipe", guardians: "Responsáveis", guardian: "Responsável", practitioner: "Praticante" };

export function AnnouncementCard({ a, userId, canManage, showAudience }: { a: Announcement; userId: string; canManage: boolean; showAudience: boolean }) {
  const read = a.readBy.includes(userId);
  return (
    <li className={`rounded-2xl border p-4 ${read ? "bg-surface border-border" : "bg-primary-50 border-primary-100"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{!read && <span className="inline-block h-2 w-2 rounded-full bg-primary-600 mr-2 align-middle" />}{a.title}</p>
          <p className="text-xs text-ink-500">{formatDateTime(a.createdAt)} · {a.createdByName}{showAudience ? ` · ${AUD[a.audience]}${a.targetName ? `: ${a.targetName}` : ""}` : ""}</p>
        </div>
        {showAudience && <Badge tone={a.audience === "staff" ? "blue" : a.audience === "all" ? "green" : "amber"}>{AUD[a.audience]}</Badge>}
      </div>
      <p className="mt-2 text-sm whitespace-pre-wrap">{a.body}</p>
      <div className="mt-3 flex gap-2 no-print">
        {!read && <ActionForm action={markAnnouncementRead}><input type="hidden" name="id" value={a.id} /><SubmitButton size="sm" variant="outline" pendingText="…">Marcar como lido</SubmitButton></ActionForm>}
        {canManage && <ActionForm action={deleteAnnouncement}><input type="hidden" name="id" value={a.id} /><ConfirmButton message="Excluir este comunicado?" size="sm" variant="ghost" className="text-red-700">Excluir</ConfirmButton></ActionForm>}
        {canManage && <span className="text-xs text-ink-500 self-center">{a.readBy.length} leitura{a.readBy.length === 1 ? "" : "s"}</span>}
      </div>
    </li>
  );
}
