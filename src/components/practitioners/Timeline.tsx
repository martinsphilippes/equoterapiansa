import Link from "next/link";
import { isoToBR } from "@/lib/domain/dates";

const dot = { green: "bg-brand-500", blue: "bg-sky-500", amber: "bg-amber-500", gray: "bg-ink-300", red: "bg-red-500" };

export function Timeline({ items }: { items: { date: string; kind: string; title: string; description?: string; href?: string; tone: keyof typeof dot }[] }) {
  return (
    <ol className="relative border-l-2 border-ink-100 ml-2 space-y-4">
      {items.map((it, i) => (
        <li key={i} className="pl-5">
          <span className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full ${dot[it.tone]}`} />
          <p className="text-xs text-ink-500">{isoToBR(it.date)}</p>
          {it.href ? <Link href={it.href as never} className="font-medium hover:underline">{it.title}</Link> : <p className="font-medium">{it.title}</p>}
          {it.description && <p className="text-sm text-ink-700">{it.description}</p>}
        </li>
      ))}
    </ol>
  );
}
