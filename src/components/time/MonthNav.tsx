import Link from "next/link";
import { addMonths, competenceLabel } from "@/lib/domain/dates";

export function MonthNav({ competence, basePath, param = "mes" }: { competence: string; basePath: string; param?: string }) {
  const sep = basePath.includes("?") ? "&" : "?";
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-surface border border-border px-2 py-1.5 no-print">
      <Link prefetch={false} href={`${basePath}${sep}${param}=${addMonths(competence, -1)}`} className="px-3 py-1 rounded-lg hover:bg-surface-100">‹</Link>
      <span className="font-medium">{competenceLabel(competence)}</span>
      <Link prefetch={false} href={`${basePath}${sep}${param}=${addMonths(competence, 1)}`} className="px-3 py-1 rounded-lg hover:bg-surface-100">›</Link>
    </div>
  );
}
