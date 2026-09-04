import "server-only";
import { db } from "@/lib/firebase/admin";
import { Collections } from "./collections";
import type { DreGroup } from "./finance-types";

/** Cadastros iniciais do financeiro (idempotente: só roda se não houver categorias). */
export async function seedFinanceDefaults() {
  const existing = await Collections.financialCategories().limit(1).get();
  if (!existing.empty) return false;
  const now = Date.now();
  const batch = db.batch();
  let order = 0;
  const cat = (name: string, type: "income" | "expense", dre: DreGroup, parentId: string | null = null) => {
    const ref = Collections.financialCategories().doc();
    batch.set(ref, { id: ref.id, name, type, parentId, order: ++order, dreGroup: dre, active: true, createdAt: now });
    return ref.id;
  };
  const tuition = cat("Mensalidades", "income", "revenue");
  cat("Atendimentos avulsos", "income", "revenue");
  cat("Convênios", "income", "revenue");
  cat("Doações", "income", "revenue");
  cat("Eventos", "income", "revenue");
  cat("Outros serviços", "income", "revenue");
  const pessoal = cat("Pessoal", "expense", "costs");
  const salaries = cat("Salários", "expense", "costs", pessoal);
  cat("Prestadores", "expense", "costs", pessoal);
  cat("Benefícios", "expense", "costs", pessoal);
  const animais = cat("Cavalos", "expense", "costs");
  cat("Alimentação dos animais", "expense", "costs", animais);
  cat("Veterinário", "expense", "costs", animais);
  cat("Medicamentos", "expense", "costs", animais);
  cat("Ferrageamento", "expense", "costs", animais);
  const estrutura = cat("Estrutura", "expense", "operating");
  cat("Aluguel", "expense", "operating", estrutura);
  cat("Energia", "expense", "operating", estrutura);
  cat("Água", "expense", "operating", estrutura);
  cat("Manutenção", "expense", "operating", estrutura);
  cat("Materiais", "expense", "operating");
  cat("Transporte", "expense", "operating");
  cat("Marketing", "expense", "operating");
  cat("Impostos e taxas", "expense", "operating");
  cat("Outras despesas", "expense", "other");

  const cc = (name: string, parentId: string | null = null) => {
    const ref = Collections.costCenters().doc();
    batch.set(ref, { id: ref.id, name, parentId, active: true, createdAt: now });
    return ref.id;
  };
  cc("Administração");
  const equo = cc("Equoterapia");
  cc("Profissionais", equo); cc("Materiais", equo);
  cc("Cavalos"); cc("Estrutura"); cc("RH"); cc("Marketing"); cc("Transporte"); cc("Eventos");

  const acc = Collections.financialAccounts().doc();
  batch.set(acc, { id: acc.id, name: "Caixa", type: "cash", initialBalance: 0, initialBalanceDate: new Date().toISOString().slice(0, 10), active: true, createdAt: now });
  ["Pix", "Dinheiro", "Transferência", "Boleto", "Cartão de débito", "Cartão de crédito", "Outra"].forEach((name, i) => {
    const ref = Collections.paymentMethods().doc();
    batch.set(ref, { id: ref.id, name, order: i + 1, active: true });
  });
  batch.set(db.collection("financialSettings").doc("general"), { defaultAccountId: acc.id, payrollCategoryId: salaries, tuitionCategoryId: tuition, showToGuardians: true, updatedAt: now });
  await batch.commit();
  return true;
}
