import { requireFinance, financeTabs } from "@/lib/auth/finance-access";
import { allCategories } from "@/lib/db/queries/finance-ref";
import { hasPermission } from "@/lib/auth/session";
import { FinanceNav } from "@/components/finance/FinanceNav";
import { Alert } from "@/components/ui";
import { InitFinanceButton } from "@/components/finance/InitFinanceButton";
import type { ReactNode } from "react";

export default async function FinanceLayout({ children }: { children: ReactNode }) {
  const user = await requireFinance();
  const cats = await allCategories();
  return (
    <div>
      <FinanceNav tabs={financeTabs(user)} />
      {cats.length === 0 && (
        <div className="mb-4">
          <Alert tone="warning">
            <span className="flex flex-wrap items-center justify-between gap-2">O financeiro ainda não tem cadastros básicos (categorias, centros de custo, conta e formas de pagamento).
            {hasPermission(user, "finance.setup") ? <InitFinanceButton /> : <span>Peça ao Dono para inicializar.</span>}</span>
          </Alert>
        </div>
      )}
      {children}
    </div>
  );
}
