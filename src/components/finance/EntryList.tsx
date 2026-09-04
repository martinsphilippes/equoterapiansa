import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { EntryStatusBadge } from "./EntryStatusBadge";
import { Money } from "./Money";
import { isoToBR } from "@/lib/domain/dates";
import { displayStatus } from "@/lib/domain/finance";
import type { FinancialEntry } from "@/lib/db/finance-types";

/** Lista responsiva de lançamentos (cards no celular, linhas no desktop). */
export function EntryList({ entries, today, basePath, emptyTitle = "Nenhum lançamento" }: { entries: FinancialEntry[]; today: string; basePath: string; emptyTitle?: string }) {
  if (entries.length === 0) return <EmptyState title={emptyTitle} />;
  return (
    <ul className="divide-y divide-border">
      {entries.map((e) => {
        const st = displayStatus(e, today);
        const who = e.guardianName ?? e.supplierName ?? e.collaboratorName ?? e.practitionerName;
        return (
          <li key={e.id}>
            <Link prefetch={false} href={`${basePath}/${e.id}` as never} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-50">
              <div className="w-14 shrink-0 text-center">
                <p className="text-[11px] uppercase text-ink-500">{isoToBR(e.dueDate).slice(3, 5)}/{e.dueDate.slice(2, 4)}</p>
                <p className={`text-lg font-extrabold leading-none tnum ${st === "overdue" ? "text-danger" : "text-ink-900"}`}>{e.dueDate.slice(8, 10)}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{e.description}</p>
                <p className="text-xs text-ink-500 truncate">{[who, e.categoryName, e.installment ? `${e.installment.number}/${e.installment.total}` : null].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="text-right shrink-0">
                <Money value={e.openAmount > 0 && e.status !== "cancelled" ? e.openAmount : e.netAmount} className={`block font-bold ${e.status === "cancelled" ? "line-through text-ink-300" : ""}`} />
                <EntryStatusBadge status={st} />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
