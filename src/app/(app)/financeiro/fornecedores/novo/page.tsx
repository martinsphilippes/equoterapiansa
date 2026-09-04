import { notFound } from "next/navigation";
import { requireFinance } from "@/lib/auth/finance-access";
import { Collections, getDoc } from "@/lib/db/collections";
import { financeRefData, treeOrder } from "@/lib/db/queries/finance-ref";
import { Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { saveSupplier } from "@/lib/actions/finance-setup";
import type { SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

export default async function SupplierFormPage({ searchParams }: { searchParams: SearchParams }) {
  await requireFinance("finance.setup");
  const sp = await searchParams;
  const editId = sp1(sp, "editar");
  const [s, ref] = await Promise.all([editId ? getDoc(Collections.suppliers(), editId) : null, financeRefData()]);
  if (editId && !s) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader title={s ? `Editar · ${s.name}` : "Novo fornecedor"} back="/financeiro/fornecedores" />
      <ActionForm action={saveSupplier} className="space-y-4">
        {s && <input type="hidden" name="id" value={s.id} />}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome / razão social" className="sm:col-span-2"><Input name="name" defaultValue={s?.name} required autoFocus /></Field>
            <Field label="CPF / CNPJ"><Input name="taxId" defaultValue={s?.taxId} inputMode="numeric" /></Field>
            <Field label="Telefone"><Input name="phone" defaultValue={s?.phone} inputMode="tel" /></Field>
            <Field label="E-mail"><Input name="email" type="email" defaultValue={s?.email} /></Field>
            <Field label="Pix"><Input name="pix" defaultValue={s?.pix} /></Field>
            <Field label="Dados bancários" className="sm:col-span-2"><Input name="bankInfo" defaultValue={s?.bankInfo} /></Field>
            <Field label="Categoria padrão"><Select name="defaultCategoryId" defaultValue={s?.defaultCategoryId ?? ""}><option value="">—</option>{treeOrder(ref.categories.filter((c) => c.type === "expense")).map((c) => <option key={c.id} value={c.id}>{"  ".repeat(c.depth)}{c.name}</option>)}</Select></Field>
            <Field label="Centro de custo padrão"><Select name="defaultCostCenterId" defaultValue={s?.defaultCostCenterId ?? ""}><option value="">—</option>{treeOrder(ref.costCenters).map((c) => <option key={c.id} value={c.id}>{"  ".repeat(c.depth)}{c.name}</option>)}</Select></Field>
            <Field label="Observações" className="sm:col-span-2"><Textarea name="notes" defaultValue={s?.notes} className="min-h-16" /></Field>
          </div>
        </Card>
        <SubmitButton size="lg">{s ? "Salvar" : "Cadastrar fornecedor"}</SubmitButton>
      </ActionForm>
    </div>
  );
}
