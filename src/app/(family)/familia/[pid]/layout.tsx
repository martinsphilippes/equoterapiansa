import { requireGuardianPractitioner } from "@/lib/db/queries/family";
import { PageHeader } from "@/components/ui";
import { FamilyTabs } from "@/components/practitioners/FamilyTabs";
import type { ReactNode } from "react";

export default async function FamilyPractitionerLayout({ children, params }: { children: ReactNode; params: Promise<{ pid: string }> }) {
  const { pid } = await params;
  const { practitioner: p } = await requireGuardianPractitioner(pid);
  return (
    <div>
      <PageHeader title={p.name} back="/familia" />
      <FamilyTabs base={`/familia/${pid}`} />
      {children}
    </div>
  );
}
