import Link from "next/link";
import { Alert } from "@/components/ui";
import { pendingIndexIssues } from "@/lib/db/firestore-safe";
import { hasPermission } from "@/lib/auth/session";
import type { UserProfile } from "@/lib/db/types";

/**
 * Renderizado depois que os dados da página foram buscados: avisa que parte dos
 * números está indisponível porque um índice do Firestore falta ou está sendo
 * construído. Sem isso, a página inteira quebraria com erro do servidor.
 */
export function IndexNotice({ user }: { user?: UserProfile }) {
  const issues = pendingIndexIssues();
  if (issues.length === 0) return null;
  const canFix = !!user && hasPermission(user, "finance.setup");
  const links = issues.map((i) => i.link).filter((l): l is string => !!l);
  if (!canFix) {
    return (
      <Alert tone="warning" className="no-print">
        Alguns dados ainda estão sendo preparados e podem aparecer incompletos. Tente novamente em alguns minutos.
      </Alert>
    );
  }
  return (
    <Alert tone="warning" className="no-print">
      <p className="font-semibold">Alguns dados ainda não podem ser exibidos</p>
      <p className="text-sm mt-1">
        O banco precisa de índices para: {Array.from(new Set(issues.map((i) => i.label))).join(", ")}. Se você acabou de criá-los, a construção leva alguns minutos e a tela volta ao normal sozinha.
      </p>
      <p className="text-sm mt-2">
        <Link prefetch={false} href="/financeiro/configuracoes?aba=indices" className="font-semibold underline">Conferir e criar os índices</Link>
        {links.length > 0 && <> · <a href={links[0]!} target="_blank" rel="noreferrer" className="underline">criar pelo console do Firebase</a></>}
      </p>
    </Alert>
  );
}
