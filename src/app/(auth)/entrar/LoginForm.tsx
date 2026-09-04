"use client";
import { useState } from "react";
import { loadClientAuth } from "@/lib/firebase/client";
import { Button, Field, Input, Alert } from "@/components/ui";

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Pré-carrega o SDK ao focar no formulário, para o envio ser imediato.
  const warm = () => { void loadClientAuth(); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const { clientAuth, signInWithEmailAndPassword, signOut } = await loadClientAuth();
      const cred = await signInWithEmailAndPassword(clientAuth, email.trim(), password);
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível entrar.");
      await signOut(clientAuth).catch(() => {});
      const dest = data.mustChangePassword ? "/conta?trocar-senha=1" : next && next.startsWith("/") ? next : data.role === "guardian" ? "/familia" : "/painel";
      // Navegação completa de propósito: o cookie de sessão acabou de ser criado.
      window.location.href = dest;
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) setError("E-mail ou senha incorretos.");
      else if (code.includes("too-many-requests")) setError("Muitas tentativas. Aguarde alguns minutos.");
      else setError(err instanceof Error ? err.message : "Não foi possível entrar.");
      setLoading(false);
    }
  }

  async function forgot() {
    setError(null);
    if (!email) { setError("Informe seu e-mail para recuperar a senha."); return; }
    try {
      const { clientAuth, sendPasswordResetEmail } = await loadClientAuth();
      await sendPasswordResetEmail(clientAuth, email.trim());
      setInfo("Enviamos um link de redefinição para o seu e-mail.");
    } catch {
      setError("Não foi possível enviar o e-mail de recuperação.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-busy={loading}>
      {error && <Alert tone="error">{error}</Alert>}
      {info && <Alert tone="success">{info}</Alert>}
      <Field label="E-mail">
        <Input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={warm} required />
      </Field>
      <Field label="Senha">
        <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={warm} required />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</Button>
      <button type="button" onClick={forgot} className="w-full text-sm font-semibold text-primary-600 hover:underline">Esqueci minha senha</button>
    </form>
  );
}
