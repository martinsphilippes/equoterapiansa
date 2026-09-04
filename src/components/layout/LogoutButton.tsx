"use client";
import { LogOut } from "lucide-react";

export function LogoutButton({ className = "" }: { className?: string }) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // Navegação completa de propósito: o cookie de sessão mudou e o layout precisa ser recarregado.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/entrar";
  }
  return (
    <button onClick={logout} className={`inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-danger ${className}`}>
      <LogOut className="h-4 w-4" /> Sair
    </button>
  );
}
