"use client";
import { useState } from "react";
import { Button, Field, Input, Alert } from "@/components/ui";

export function SetupForm({ requiresSecret }: { requiresSecret: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch("/api/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Erro."); return; }
    // Navegação completa de propósito: o cookie de sessão mudou e o layout precisa ser recarregado.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/entrar";
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Nome da instituição"><Input name="orgName" defaultValue="Equoterapia Nossa Senhora Aparecida" /></Field>
      <Field label="Seu nome"><Input name="name" required /></Field>
      <Field label="E-mail"><Input name="email" type="email" required /></Field>
      <Field label="Senha" hint="Mínimo de 8 caracteres."><Input name="password" type="password" minLength={8} required /></Field>
      {requiresSecret && <Field label="Segredo de configuração" hint="Definido na variável SETUP_SECRET."><Input name="secret" type="password" required /></Field>}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Configurando…" : "Criar acesso e começar"}</Button>
    </form>
  );
}
