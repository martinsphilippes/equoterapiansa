"use client";
import { useActionState, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "./index";
import type { ActionResult } from "@/lib/actions/result";

type Action = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

/**
 * Formulário padrão: envia para uma server action, mostra erro/sucesso
 * e opcionalmente redireciona após sucesso.
 */
export function ActionForm({
  action, children, className, redirectTo, resetOnSuccess, onSuccess, keepOnSuccess,
}: { action: Action; children: ReactNode; className?: string; redirectTo?: string | ((r: ActionResult) => string); resetOnSuccess?: boolean; onSuccess?: () => void; /** Não recarrega a página após sucesso (útil quando a mensagem traz informação importante). */ keepOnSuccess?: boolean }) {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const [state, formAction] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const r = await action(prev, fd);
    if (r.ok) {
      onSuccess?.();
      if (resetOnSuccess) setFormKey((k) => k + 1);
      const dest = r.redirect ?? redirectTo;
      if (dest) {
        const target = typeof dest === "function" ? dest(r) : dest;
        router.push(target as never);
        router.refresh();
      } else if (!keepOnSuccess) {
        router.refresh();
      }
    }
    return r;
  }, null);

  return (
    <form action={formAction} className={className} key={formKey}>
      {state && !state.ok && <div className="mb-4"><Alert tone="error">{state.error}</Alert></div>}
      {state?.ok && state.message && (
        <div className="mb-4 space-y-2">
          <Alert tone="success">{state.message}</Alert>
          {keepOnSuccess && <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>Continuar</Button>}
        </div>
      )}
      {children}
    </form>
  );
}
