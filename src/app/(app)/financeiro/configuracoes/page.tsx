import { requireFinance } from "@/lib/auth/finance-access";
import { allCategories, allCostCenters, allAccounts, allPaymentMethods, getFinanceSettings, treeOrder } from "@/lib/db/queries/finance-ref";
import { Badge, Card, Checkbox, Field, Input, PageHeader, Select } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { saveAccount, saveCategory, saveCostCenter, savePaymentMethod, toggleAccount, toggleCategory, toggleCostCenter, togglePaymentMethod, updateFinanceSettings } from "@/lib/actions/finance-setup";
import { Money } from "@/components/finance/Money";
import type { SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";
import Link from "next/link";

export const metadata = { title: "Configurações financeiras" };
const DRE = [["revenue", "Receita bruta"], ["deductions", "Dedução da receita"], ["costs", "Custo"], ["operating", "Despesa operacional"], ["other", "Outras"]];
const TABS = [["categorias", "Categorias"], ["centros", "Centros de custo"], ["contas", "Contas financeiras"], ["formas", "Formas de pagamento"], ["geral", "Geral"]];

export default async function FinanceSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireFinance("finance.setup");
  const sp = await searchParams;
  const tab = sp1(sp, "aba") ?? "categorias";
  const [cats, ccs, accs, methods, settings] = await Promise.all([allCategories(), allCostCenters(), allAccounts(), allPaymentMethods(), getFinanceSettings()]);
  const catTree = treeOrder(cats), ccTree = treeOrder(ccs);
  return (
    <div className="space-y-4">
      <PageHeader title="Configurações financeiras" />
      <div className="flex gap-2 overflow-x-auto no-print">{TABS.map(([v, l]) => <Link prefetch={false} key={v} href={`/financeiro/configuracoes?aba=${v}`} className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${tab === v ? "bg-primary text-white" : "bg-surface border border-border"}`}>{l}</Link>)}</div>

      {tab === "categorias" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {(["income", "expense"] as const).map((type) => (
              <Card key={type} title={type === "income" ? "Receitas" : "Despesas"}>
                <ul className="divide-y divide-border">
                  {catTree.filter((c) => c.type === type).map((c) => (
                    <li key={c.id} className={`py-2 ${c.active ? "" : "opacity-60"}`} style={{ paddingLeft: c.depth * 16 }}>
                      <ActionForm action={saveCategory} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={c.id} /><input type="hidden" name="type" value={c.type} />
                        <Input name="name" defaultValue={c.name} className="h-9 flex-1 min-w-36" />
                        <Select name="parentId" defaultValue={c.parentId ?? ""} className="h-9 w-40 text-xs"><option value="">Sem pai</option>{cats.filter((p) => p.type === type && p.id !== c.id && !p.parentId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
                        <Select name="dreGroup" defaultValue={c.dreGroup ?? ""} className="h-9 w-40 text-xs"><option value="">DRE: automático</option>{DRE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
                        <Input name="order" type="number" defaultValue={c.order} className="h-9 w-16 text-xs" title="Ordem" />
                        <SubmitButton size="sm" variant="outline" pendingText="…">Salvar</SubmitButton>
                      </ActionForm>
                      <div className="flex items-center gap-2 mt-1">{c.active ? <Badge tone="green">Ativa</Badge> : <Badge tone="gray">Inativa</Badge>}<ActionForm action={toggleCategory}><input type="hidden" name="id" value={c.id} /><SubmitButton size="sm" variant="ghost" pendingText="…" className="h-7 text-xs">{c.active ? "Inativar" : "Reativar"}</SubmitButton></ActionForm></div>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          <Card title="Nova categoria">
            <ActionForm action={saveCategory} className="space-y-3" resetOnSuccess>
              <Field label="Nome"><Input name="name" required /></Field>
              <Field label="Tipo"><Select name="type"><option value="income">Receita</option><option value="expense">Despesa</option></Select></Field>
              <Field label="Categoria pai (opcional)"><Select name="parentId"><option value="">—</option>{cats.filter((c) => !c.parentId).map((c) => <option key={c.id} value={c.id}>{c.type === "income" ? "R" : "D"} · {c.name}</option>)}</Select></Field>
              <Field label="Grupo na DRE"><Select name="dreGroup"><option value="">Automático pelo tipo</option>{DRE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
              <Field label="Código (opcional)"><Input name="code" /></Field>
              <SubmitButton>Adicionar</SubmitButton>
            </ActionForm>
            <p className="text-xs text-ink-500 mt-3">Categorias com lançamentos não são excluídas: inative-as.</p>
          </Card>
        </div>
      )}

      {tab === "centros" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card title="Centros de custo" className="lg:col-span-2">
            <ul className="divide-y divide-border">
              {ccTree.map((c) => (
                <li key={c.id} className={`py-2 ${c.active ? "" : "opacity-60"}`} style={{ paddingLeft: c.depth * 16 }}>
                  <ActionForm action={saveCostCenter} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <Input name="name" defaultValue={c.name} className="h-9 flex-1 min-w-36" />
                    <Select name="parentId" defaultValue={c.parentId ?? ""} className="h-9 w-44 text-xs"><option value="">Sem pai</option>{ccs.filter((p) => p.id !== c.id && !p.parentId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
                    <SubmitButton size="sm" variant="outline" pendingText="…">Salvar</SubmitButton>
                  </ActionForm>
                  <div className="flex items-center gap-2 mt-1">{c.active ? <Badge tone="green">Ativo</Badge> : <Badge tone="gray">Inativo</Badge>}<ActionForm action={toggleCostCenter}><input type="hidden" name="id" value={c.id} /><SubmitButton size="sm" variant="ghost" pendingText="…" className="h-7 text-xs">{c.active ? "Inativar" : "Reativar"}</SubmitButton></ActionForm></div>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Novo centro de custo">
            <ActionForm action={saveCostCenter} className="space-y-3" resetOnSuccess>
              <Field label="Nome"><Input name="name" required /></Field>
              <Field label="Pai (opcional)"><Select name="parentId"><option value="">—</option>{ccs.filter((c) => !c.parentId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
              <SubmitButton>Adicionar</SubmitButton>
            </ActionForm>
          </Card>
        </div>
      )}

      {tab === "contas" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card title="Contas financeiras" className="lg:col-span-2">
            <ul className="divide-y divide-border">
              {accs.map((a) => (
                <li key={a.id} className={`py-3 ${a.active ? "" : "opacity-60"}`}>
                  <ActionForm action={saveAccount} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                    <input type="hidden" name="id" value={a.id} />
                    <Field label="Nome"><Input name="name" defaultValue={a.name} className="h-9" /></Field>
                    <Field label="Tipo"><Select name="type" defaultValue={a.type} className="h-9"><option value="cash">Caixa</option><option value="bank">Banco</option><option value="digital">Conta digital</option><option value="wallet">Carteira</option><option value="other">Outra</option></Select></Field>
                    <Field label="Instituição"><Input name="institution" defaultValue={a.institution ?? ""} className="h-9" /></Field>
                    <Field label="Saldo inicial"><Input name="initialBalance" inputMode="decimal" defaultValue={a.initialBalance} className="h-9" /></Field>
                    <Field label="Data do saldo"><Input name="initialBalanceDate" type="date" defaultValue={a.initialBalanceDate} className="h-9" /></Field>
                    <div className="col-span-2 sm:col-span-5"><SubmitButton size="sm" variant="outline" pendingText="…">Salvar</SubmitButton></div>
                  </ActionForm>
                  <div className="flex items-center gap-2 mt-1">{a.active ? <Badge tone="green">Ativa</Badge> : <Badge tone="gray">Inativa</Badge>}<ActionForm action={toggleAccount}><input type="hidden" name="id" value={a.id} /><SubmitButton size="sm" variant="ghost" pendingText="…" className="h-7 text-xs">{a.active ? "Inativar" : "Reativar"}</SubmitButton></ActionForm></div>
                </li>
              ))}
            </ul>
            <p className="text-xs text-ink-500 mt-2">O saldo atual é sempre calculado pelas movimentações: saldo inicial + entradas − saídas.</p>
          </Card>
          <Card title="Nova conta">
            <ActionForm action={saveAccount} className="space-y-3" resetOnSuccess>
              <Field label="Nome"><Input name="name" required placeholder="Ex.: Banco do Brasil" /></Field>
              <Field label="Tipo"><Select name="type"><option value="bank">Banco</option><option value="cash">Caixa</option><option value="digital">Conta digital</option><option value="wallet">Carteira</option><option value="other">Outra</option></Select></Field>
              <Field label="Instituição"><Input name="institution" /></Field>
              <Field label="Saldo inicial (R$)"><Input name="initialBalance" inputMode="decimal" defaultValue="0" /></Field>
              <Field label="Data do saldo inicial"><Input name="initialBalanceDate" type="date" /></Field>
              <SubmitButton>Adicionar</SubmitButton>
            </ActionForm>
          </Card>
        </div>
      )}

      {tab === "formas" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card title="Formas de pagamento" className="lg:col-span-2">
            <ul className="divide-y divide-border">{methods.map((m) => (
              <li key={m.id} className={`py-2 ${m.active ? "" : "opacity-60"}`}>
                <ActionForm action={savePaymentMethod} className="flex items-center gap-2"><input type="hidden" name="id" value={m.id} /><Input name="name" defaultValue={m.name} className="h-9 flex-1" /><SubmitButton size="sm" variant="outline" pendingText="…">Salvar</SubmitButton></ActionForm>
                <div className="flex items-center gap-2 mt-1">{m.active ? <Badge tone="green">Ativa</Badge> : <Badge tone="gray">Inativa</Badge>}<ActionForm action={togglePaymentMethod}><input type="hidden" name="id" value={m.id} /><SubmitButton size="sm" variant="ghost" pendingText="…" className="h-7 text-xs">{m.active ? "Inativar" : "Reativar"}</SubmitButton></ActionForm></div>
              </li>
            ))}</ul>
          </Card>
          <Card title="Nova forma"><ActionForm action={savePaymentMethod} className="space-y-3" resetOnSuccess><Field label="Nome"><Input name="name" required /></Field><SubmitButton>Adicionar</SubmitButton></ActionForm></Card>
        </div>
      )}

      {tab === "geral" && (
        <Card title="Padrões e integrações" className="max-w-2xl">
          <ActionForm action={updateFinanceSettings} className="space-y-4">
            <Field label="Conta financeira padrão"><Select name="defaultAccountId" defaultValue={settings.defaultAccountId ?? ""}><option value="">—</option>{accs.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.name} (<MoneyText v={a.initialBalance} />)</option>)}</Select></Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Categoria da folha (salários)"><Select name="payrollCategoryId" defaultValue={settings.payrollCategoryId ?? ""}><option value="">—</option>{catTree.filter((c) => c.type === "expense").map((c) => <option key={c.id} value={c.id}>{"  ".repeat(c.depth)}{c.name}</option>)}</Select></Field>
              <Field label="Centro de custo da folha"><Select name="payrollCostCenterId" defaultValue={settings.payrollCostCenterId ?? ""}><option value="">—</option>{ccTree.map((c) => <option key={c.id} value={c.id}>{"  ".repeat(c.depth)}{c.name}</option>)}</Select></Field>
              <Field label="Categoria das mensalidades"><Select name="tuitionCategoryId" defaultValue={settings.tuitionCategoryId ?? ""}><option value="">—</option>{catTree.filter((c) => c.type === "income").map((c) => <option key={c.id} value={c.id}>{"  ".repeat(c.depth)}{c.name}</option>)}</Select></Field>
              <Field label="Centro de custo das mensalidades"><Select name="tuitionCostCenterId" defaultValue={settings.tuitionCostCenterId ?? ""}><option value="">—</option>{ccTree.map((c) => <option key={c.id} value={c.id}>{"  ".repeat(c.depth)}{c.name}</option>)}</Select></Field>
            </div>
            <Checkbox name="showToGuardians" label="Mostrar cobranças aos responsáveis na área da família" defaultChecked={settings.showToGuardians} />
            <SubmitButton>Salvar</SubmitButton>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
function MoneyText({ v }: { v: number }) { return <>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)}</>; }
void Money;
