"use client";
import { Building2, Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { switchOrg } from "@/lib/actions/orgs";

export interface OrgOption { id: string; name: string }

/**
 * Troca de empresa para quem tem acesso a mais de uma. Cada unidade tem dados
 * próprios; a escolha vale para toda a sessão até ser trocada de novo.
 */
export function OrgSwitcher({ orgs, activeId, compact }: { orgs: OrgOption[]; activeId: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const active = orgs.find((o) => o.id === activeId) ?? orgs[0];
  if (orgs.length < 2) return null;
  return (
    <div className={compact ? "" : "px-3 pb-2"}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="w-full flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-left text-sm font-semibold text-ink-900 hover:bg-surface-50">
        <Building2 className="h-4 w-4 text-primary shrink-0" />
        <span className="truncate flex-1">{active?.name}</span>
        <ChevronDown className={`h-4 w-4 text-ink-500 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="mt-1 rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
          {orgs.map((o) => (
            <li key={o.id}>
              <form action={switchOrg}>
                <input type="hidden" name="orgId" value={o.id} />
                <button type="submit" className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-surface-50 ${o.id === activeId ? "font-bold text-primary-700" : "text-ink-700"}`}>
                  <Check className={`h-4 w-4 ${o.id === activeId ? "" : "opacity-0"}`} />
                  <span className="truncate">{o.name}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
