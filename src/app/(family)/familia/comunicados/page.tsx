import { requireGuardian } from "@/lib/db/queries/family";
import { announcementsFor } from "@/lib/db/queries/announcements";
import { EmptyState, PageHeader } from "@/components/ui";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";

export default async function FamilyAnnouncementsPage() {
  const { user, practitioners } = await requireGuardian();
  const list = await announcementsFor(user, practitioners.map((p) => p.id));
  return (
    <div>
      <PageHeader title="Comunicados" />
      {list.length === 0 ? <EmptyState title="Nenhum comunicado" /> : <ul className="space-y-3">{list.map((a) => <AnnouncementCard key={a.id} a={a} userId={user.id} canManage={false} showAudience={false} />)}</ul>}
    </div>
  );
}
