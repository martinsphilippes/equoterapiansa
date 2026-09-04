import { notFound } from "next/navigation";
import { requireFinance } from "@/lib/auth/finance-access";
import { Collections, getDoc } from "@/lib/db/collections";
import { financeRefData, treeOrder } from "@/lib/db/queries/finance-ref";
import { listGuardians, listPractitioners } from "@/lib/db/queries/practitioners";
import { todayFin } from "@/lib/db/queries/finance";
import { PageHeader } from "@/components/ui";
import { PlanForm } from "@/components/finance/PlanForm";
import type { SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

export default async function NewPlanPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireFinance("finance.receivables.manage");
  const sp = await searchParams;
  const editId = sp1(sp, "editar");
  const [plan, ref, practitioners, guardians, today] = await Promise.all([editId ? getDoc(Collections.billingPlans(), editId) : null, financeRefData(), listPractitioners(user, { status: "all" }), listGuardians(), todayFin()]);
  if (editId && !plan) notFound();
  const practitionerId = sp1(sp, "praticante");
  const back = practitionerId ? `/praticantes/${practitionerId}/financeiro` : "/financeiro/mensalidades";
  return (
    <div className="max-w-3xl">
      <PageHeader title={plan ? "Editar plano" : "Novo plano de cobrança"} back={back} />
      <PlanForm plan={plan ?? undefined} practitioners={practitioners.filter((p) => p.status !== "closed" || p.id === plan?.practitionerId).map((p) => ({ id: p.id, name: p.name, guardianIds: p.guardianIds }))} guardians={guardians.map((g) => ({ id: g.id, name: g.name }))}
        categories={treeOrder(ref.categories.filter((c) => c.type === "income")).map((c) => ({ id: c.id, name: c.name, depth: c.depth }))} costCenters={treeOrder(ref.costCenters).map((c) => ({ id: c.id, name: c.name, depth: c.depth }))}
        today={today} defaultCategoryId={ref.settings.tuitionCategoryId} defaultPractitionerId={practitionerId} returnTo={practitionerId ? back : "/financeiro/mensalidades"} />
    </div>
  );
}
