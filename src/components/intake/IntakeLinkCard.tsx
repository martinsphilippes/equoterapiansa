"use client";
import { useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { rotateIntakeLink, setIntakeActive } from "@/lib/actions/intake";

/**
 * Endereço do formulário público, com cópia rápida e renovação do link.
 * A URL vem pronta do servidor: montá-la no cliente causaria divergência de
 * hidratação, já que o endereço só existe depois que a página carrega.
 */
export function IntakeLinkCard({ token, active, url }: { token: string; active: boolean; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card title="Link do formulário público">
      {token ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {active ? <Badge tone="green">Aberto</Badge> : <Badge tone="gray">Fechado</Badge>}
            <code className="text-xs bg-surface-100 rounded-lg px-2 py-1 break-all flex-1 min-w-48">{url}</code>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={async () => {
              try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); }
            }}>{copied ? "Copiado" : "Copiar link"}</Button>
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center h-9 px-3 rounded-xl border border-border bg-surface text-sm font-semibold">Abrir</a>
            <ActionForm action={setIntakeActive}>
              <input type="hidden" name="active" value={active ? "0" : "1"} />
              <SubmitButton size="sm" variant="ghost" pendingText="…">{active ? "Fechar formulário" : "Abrir formulário"}</SubmitButton>
            </ActionForm>
            <ActionForm action={rotateIntakeLink}>
              <ConfirmButton message="Gerar um link novo? O endereço atual deixa de funcionar para quem já o recebeu." size="sm" variant="ghost" className="text-danger">Gerar link novo</ConfirmButton>
            </ActionForm>
          </div>
          <p className="text-xs text-ink-500">Envie por WhatsApp antes da primeira aula. Quem preenche não precisa de senha, e o link pode ser renovado a qualquer momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink-700">Ainda não existe um link público. Ao gerar, qualquer pessoa com o endereço poderá preencher a ficha de cadastro, saúde e aptidão.</p>
          <ActionForm action={rotateIntakeLink}><SubmitButton>Gerar link</SubmitButton></ActionForm>
        </div>
      )}
    </Card>
  );
}
