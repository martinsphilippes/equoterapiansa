import { requirePermission } from "@/lib/auth/session";
import { listGuardians, listPractitioners } from "@/lib/db/queries/practitioners";
import { Card, PageHeader } from "@/components/ui";
import { AnnouncementForm } from "@/components/announcements/AnnouncementForm";

export default async function NewAnnouncementPage() {
  const user = await requirePermission("announcements.manage");
  const [guardians, practitioners] = await Promise.all([listGuardians(), listPractitioners(user, { status: "all" })]);
  return (
    <div className="max-w-2xl">
      <PageHeader title="Novo comunicado" back="/comunicados" />
      <Card><AnnouncementForm guardians={guardians.map((g) => ({ id: g.id, name: g.name }))} practitioners={practitioners.map((p) => ({ id: p.id, name: p.name }))} /></Card>
    </div>
  );
}
