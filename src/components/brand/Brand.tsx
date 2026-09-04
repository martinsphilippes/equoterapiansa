import Image from "next/image";
import { cn } from "@/components/ui";

/**
 * Componentes de marca. Os arquivos em /public/brand são recortes da logomarca
 * oficial (sem alteração do desenho). "white" para fundos azuis, "blue" para claros.
 */
export function BrandSymbol({ tone = "blue", className, priority }: { tone?: "blue" | "white"; className?: string; priority?: boolean }) {
  return (
    <Image src={`/brand/symbol-${tone}.png`} alt="" width={988} height={518} priority={priority} className={cn("h-8 w-auto select-none", className)} draggable={false} />
  );
}

export function BrandLogo({ tone = "blue", className, priority }: { tone?: "blue" | "white"; className?: string; priority?: boolean }) {
  return (
    <Image src={`/brand/logo-${tone}.png`} alt="Equoterapia Nossa Senhora Aparecida" width={1291} height={866} priority={priority} className={cn("w-40 h-auto select-none", className)} draggable={false} />
  );
}

/** Marca horizontal compacta: símbolo + nome em texto (cabeçalhos estreitos). */
export function BrandLockup({ tone = "blue", className, compact }: { tone?: "blue" | "white"; className?: string; compact?: boolean }) {
  const text = tone === "white" ? "text-white" : "text-primary-700";
  const sub = tone === "white" ? "text-white/70" : "text-ink-500";
  return (
    <span className={cn("inline-flex items-center gap-2.5 min-w-0", className)}>
      <BrandSymbol tone={tone} className={compact ? "h-7" : "h-9"} />
      <span className="min-w-0 leading-tight">
        <span className={cn("block font-extrabold tracking-tight truncate", text, compact ? "text-[15px]" : "text-base")}>Equoterapia</span>
        {!compact && <span className={cn("block text-[10px] uppercase tracking-[0.18em] truncate", sub)}>Nossa Senhora Aparecida</span>}
      </span>
    </span>
  );
}

export function BrandLoader({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-24 text-ink-500">
      <BrandSymbol className="h-12 animate-brand-pulse" />
      <p className="mt-4 text-sm">{label}</p>
    </div>
  );
}
