import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { listPractitioners } from "@/lib/db/queries/practitioners";
import { Collections, getDoc } from "@/lib/db/collections";
import { PageHeader } from "@/components/ui";
import { GuardianForm } from "@/components/guardians/GuardianForm";
import type { Params } from "@/lib/types";

export default async function EditGuardianPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requirePermission("practitioners.manage");
  const { id } = await params;
  const [g, practitioners] = await Promise.all([getDoc(Collections.guardians(), id), listPractitioners(user, { status: "all" })]);
  if (!g) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title={`Editar · ${g.name}`} back={`/responsaveis/${id}`} />
      <GuardianForm guardian={g} practitioners={practitioners} />
    </div>
  );
}
