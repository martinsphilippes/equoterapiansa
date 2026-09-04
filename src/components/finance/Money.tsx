import { cn } from "@/components/ui";
import { formatBRL } from "@/lib/domain/format";

export function Money({ value, className, tone }: { value: number | null | undefined; className?: string; tone?: "in" | "out" | "auto" }) {
  const v = value ?? 0;
  const color = tone === "in" ? "text-success" : tone === "out" ? "text-danger" : tone === "auto" ? (v < 0 ? "text-danger" : v > 0 ? "text-success" : "text-ink-900") : "";
  return <span className={cn("tnum", color, className)}>{formatBRL(v)}</span>;
}
