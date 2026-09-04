import { requireStaff, hasPermission } from "@/lib/auth/session";
import { announcementsFor } from "@/lib/db/queries/announcements";
import { listPractitioners } from "@/lib/db/queries/practitioners";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";

export const metadata = { title: "Comunicados" };

export default async function AnnouncementsPage() {
  const user = await requireStaff();
  const mine = user.role === "professional" ? (await listPractitioners(user, { status: "all" })).map((p) => p.id) : [];
  const list = await announcementsFor(user, mine);
  const canManage = hasPermission(user, "announcements.manage");
  return (
    <div>
      <PageHeader title="Comunicados" actions={canManage && <LinkButton href="/comunicados/novo">+ Novo comunicado</LinkButton>} />
      {list.length === 0 ? <EmptyState title="Nenhum comunicado" /> : <ul className="space-y-3">{list.map((a) => <AnnouncementCard key={a.id} a={a} userId={user.id} canManage={canManage} showAudience={canManage} />)}</ul>}
    </div>
  );
}
