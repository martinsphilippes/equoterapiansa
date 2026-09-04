import Link from "next/link";
import { requireFinance } from "@/lib/auth/finance-access";
import { allSuppliers } from "@/lib/db/queries/finance-ref";
import { listCollaborators } from "@/lib/db/queries/collaborators";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { toggleSupplier } from "@/lib/actions/finance-setup";
import { formatPhone } from "@/lib/domain/format";

export const metadata = { title: "Fornecedores" };

export default async function SuppliersPage() {
  await requireFinance("finance.setup");
  const [suppliers, collaborators] = await Promise.all([allSuppliers(), listCollaborators({ status: "active" })]);
  return (
    <div className="space-y-4">
      <PageHeader title="Fornecedores e favorecidos" subtitle="Colaboradores não precisam ser cadastrados aqui: aparecem direto como favorecidos nas despesas." actions={<LinkButton href="/financeiro/fornecedores/novo" size="sm">+ Fornecedor</LinkButton>} />
      <Card className="p-0" title="Fornecedores">
        {suppliers.length === 0 ? <EmptyState title="Nenhum fornecedor" /> : (
          <ul className="divide-y divide-border -mt-5">{suppliers.map((s) => (
            <li key={s.id} className={`px-4 py-3 flex flex-wrap items-center justify-between gap-2 ${s.active ? "" : "opacity-60"}`}>
              <div className="min-w-0"><Link prefetch={false} href={`/financeiro/fornecedores/novo?editar=${s.id}`} className="font-semibold hover:underline">{s.name}</Link><p className="text-xs text-ink-500">{[s.taxId, formatPhone(s.phone) !== "—" ? formatPhone(s.phone) : null, s.email, s.pix ? `Pix: ${s.pix}` : null].filter(Boolean).join(" · ")}</p></div>
              <div className="flex items-center gap-2">{s.active ? <Badge tone="green">Ativo</Badge> : <Badge tone="gray">Inativo</Badge>}<Link prefetch={false} href={`/financeiro/pagar/novo?fornecedor=${s.id}`} className="text-xs text-primary-600 hover:underline">+ despesa</Link><ActionForm action={toggleSupplier}><input type="hidden" name="id" value={s.id} /><SubmitButton size="sm" variant="ghost" className="h-7 text-xs" pendingText="…">{s.active ? "Inativar" : "Reativar"}</SubmitButton></ActionForm></div>
            </li>
          ))}</ul>
        )}
      </Card>
      <Card className="p-0" title="Colaboradores (favorecidos diretos)">
        <ul className="divide-y divide-border -mt-5">{collaborators.map((c) => <li key={c.id} className="px-4 py-2.5 flex items-center justify-between text-sm"><span>{c.name} <span className="text-ink-500">· {c.jobRoleName ?? ""}</span></span><Link prefetch={false} href={`/financeiro/pagar/novo?colaborador=${c.id}`} className="text-xs text-primary-600 hover:underline">+ despesa</Link></li>)}</ul>
      </Card>
    </div>
  );
}
