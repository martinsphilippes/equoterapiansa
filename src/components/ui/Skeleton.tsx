import { cn } from "./index";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-200/70", className)} aria-hidden />;
}

/** Esqueleto genérico de página: título + cards. */
export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="space-y-5" aria-busy aria-label="Carregando">
      <div className="space-y-2"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-72" /></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      {Array.from({ length: cards }).map((_, i) => <Skeleton key={i} className="h-40" />)}
    </div>
  );
}

/** Esqueleto de conteúdo de aba (sem título). */
export function TabSkeleton() {
  return (
    <div className="space-y-4" aria-busy aria-label="Carregando">
      <Skeleton className="h-44" />
      <Skeleton className="h-32" />
    </div>
  );
}
