"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { initFinance } from "@/lib/actions/finance-setup";
export function InitFinanceButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return <Button size="sm" disabled={pending} onClick={() => start(async () => { await initFinance(); router.refresh(); })}>{pending ? "Criando…" : "Criar cadastros iniciais"}</Button>;
}
