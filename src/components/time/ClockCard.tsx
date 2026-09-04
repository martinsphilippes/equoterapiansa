"use client";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { clockToggle } from "@/lib/actions/time";
import { Alert, Button, Card } from "@/components/ui";
import type { TimeEntry } from "@/lib/db/types";
import type { ActionResult } from "@/lib/actions/result";

export function ClockCard({ today, entry, todayLabel }: { today: string; entry: TimeEntry | null; todayLabel: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (_p: ActionResult | null, fd: FormData) => {
    const r = await clockToggle(null, fd);
    if (r.ok) router.refresh();
    return r;
  }, null);
  const open = entry?.periods.find((p) => !p.out);
  return (
    <Card>
      <p className="text-sm text-ink-500">{todayLabel}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {entry?.periods.map((p, i) => (
          <span key={i} className="rounded-lg bg-sand-100 px-2.5 py-1 text-sm">{p.in} → {p.out ?? "…"}</span>
        ))}
        {!entry?.periods.length && <span className="text-sm text-ink-300">Nenhum registro hoje</span>}
      </div>
      {state && !state.ok && <div className="mt-3"><Alert tone="error">{state.error}</Alert></div>}
      {state?.ok && state.message && <div className="mt-3"><Alert tone="success">{state.message}</Alert></div>}
      <form action={action} className="mt-4">
        <input type="hidden" name="date" value={today} />
        <Button type="submit" size="lg" className="w-full" variant={open ? "secondary" : "primary"} disabled={pending}>
          {pending ? "Registrando…" : open ? "Registrar saída" : "Registrar entrada"}
        </Button>
      </form>
    </Card>
  );
}
