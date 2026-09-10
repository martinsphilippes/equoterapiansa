import { requireStaff } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { AppShell, buildNav } from "@/components/layout/AppShell";
import { organizationsFor } from "@/lib/db/queries/orgs";

export default async function StaffLayout({ children }: LayoutProps<"/">) {
  const user = await requireStaff();
  const [settings, orgs] = await Promise.all([getSettings(), organizationsFor(user)]);
  return (
    <AppShell user={user} nav={buildNav(user)} orgName={settings.orgName} orgs={orgs.map((o) => ({ id: o.id, name: o.name }))}>
      {children}
    </AppShell>
  );
}
