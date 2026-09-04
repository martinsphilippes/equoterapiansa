import { requireStaff } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { AppShell, buildNav } from "@/components/layout/AppShell";

export default async function StaffLayout({ children }: LayoutProps<"/">) {
  const [user, settings] = await Promise.all([requireStaff(), getSettings()]);
  return (
    <AppShell user={user} nav={buildNav(user)} orgName={settings.orgName}>
      {children}
    </AppShell>
  );
}
