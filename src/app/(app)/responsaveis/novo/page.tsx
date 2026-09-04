import { requirePermission } from "@/lib/auth/session";
import { listPractitioners } from "@/lib/db/queries/practitioners";
import { PageHeader } from "@/components/ui";
import { GuardianForm } from "@/components/guardians/GuardianForm";
import type { SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

export default async function NewGuardianPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("practitioners.manage");
  const sp = await searchParams;
  const preselect = sp1(sp, "praticante");
  const practitioners = await listPractitioners(user, { status: "all" });
  return (
    <div className="max-w-3xl">
      <PageHeader title="Novo responsável" back={preselect ? `/praticantes/${preselect}/responsaveis` : "/responsaveis"} />
      <GuardianForm practitioners={practitioners} preselect={preselect} returnTo={preselect ? `/praticantes/${preselect}/responsaveis` : undefined} />
    </div>
  );
}
