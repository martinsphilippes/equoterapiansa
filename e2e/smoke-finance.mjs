// Fumaça Financeiro: cadastros → receita → recebimento → parcelas/parcial → recorrência → plano de cobrança → folha → área da família → auditoria/permissões.
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const exe = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
ctx.setDefaultTimeout(120000);
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
const step = (s) => console.log("✓", s);
const RUN = Date.now().toString(36);
const today = new Date().toISOString().slice(0, 10);
const ym = today.slice(0, 7);
const brl = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
async function login(p, email, pass) {
  await p.goto(BASE + "/entrar");
  await p.fill('input[type="email"]', email);
  await p.fill('input[type="password"]', pass);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 60000, waitUntil: "commit" });
}
async function optionByText(p, selector, text) {
  return p.$eval(selector, (sel, t) => (Array.from(sel.options).find((o) => o.textContent.includes(t)) || {}).value, text);
}
try {
  await login(page, "dona@teste.com", "senha12345");
  step("login dona");

  // ----- Cadastros de apoio (idempotente)
  await page.goto(BASE + "/financeiro");
  if (await page.$('button:has-text("Criar cadastros iniciais")')) {
    await page.click('button:has-text("Criar cadastros iniciais")');
    await page.waitForSelector("text=Saldo das contas", { timeout: 60000 });
  }
  await page.waitForSelector("text=A receber");
  step("módulo inicializado / dashboard");
  await page.goto(BASE + "/financeiro/configuracoes?aba=contas");
  await page.fill('form:has(button:has-text("Adicionar")) input[name="name"]', "Banco Teste " + RUN);
  await page.fill('form:has(button:has-text("Adicionar")) input[name="initialBalance"]', "1000");
  await page.click('form:has(button:has-text("Adicionar")) button:has-text("Adicionar")');
  await page.waitForSelector(`input[value="Banco Teste ${RUN}"]`);
  step("conta financeira criada");
  await page.goto(BASE + "/financeiro/fornecedores/novo");
  await page.fill('input[name="name"]', "Ração Boa " + RUN);
  await page.click('button:has-text("Cadastrar fornecedor")');
  await page.waitForURL(/fornecedores$/);
  await page.waitForSelector(`text=Ração Boa ${RUN}`);
  step("fornecedor criado");

  // ----- Praticante + responsável para as cobranças
  await page.goto(BASE + "/praticantes/novo");
  await page.fill('input[name="name"]', "Pedro Fin " + RUN);
  await page.fill('input[name="birthDate"]', "2017-05-20");
  await page.fill('input[name="entryDate"]', "2026-02-01");
  await page.click('button:has-text("Cadastrar praticante")');
  await page.waitForURL((u) => /\/praticantes\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/novo"), { timeout: 60000 });
  const pedroId = page.url().split("/").pop();
  await page.goto(`${BASE}/responsaveis/novo?praticante=${pedroId}`);
  await page.fill('input[name="name"]', "Carla Fin " + RUN);
  await page.fill('input[name="email"]', `carla.${RUN}@teste.com`);
  await page.fill('input[name="phone"]', "11988887777");
  await page.click('button:has-text("Cadastrar responsável")');
  await page.waitForURL(/\/praticantes\/.*\/responsaveis/, { timeout: 60000 });
  await page.click(`text=Carla Fin ${RUN}`);
  await page.waitForURL(/\/responsaveis\/[^/]+$/);
  const carlaId = page.url().split("/").pop();
  await page.fill('input[name="password"]', "carla12345");
  await page.click('button:has-text("Liberar acesso")');
  await page.waitForSelector("text=Acesso criado", { timeout: 30000 });
  step("praticante Pedro + responsável Carla com acesso");

  // ----- Fluxo 1: receita avulsa → recebimento total
  await page.goto(`${BASE}/financeiro/receber/novo?praticante=${pedroId}`);
  await page.fill('input[name="description"]', "Avaliação inicial " + RUN);
  await page.fill('input[name="amount"]', "150,00");
  await page.fill('input[name="dueDate"]', today);
  await page.selectOption('select[name="categoryId"]', await optionByText(page, 'select[name="categoryId"]', "Mensalidade"));
  await page.selectOption('select[name="guardianId"]', { label: `Carla Fin ${RUN}` });
  await page.click('button:has-text("Criar receita")');
  await page.waitForURL(/\/financeiro\/receber\/[^/]+$/, { timeout: 60000 });
  const rec1 = page.url();
  await page.waitForSelector("text=Registrar recebimento");
  await page.fill('form:has(button:has-text("Registrar recebimento")) input[name="amount"]', "150,00");
  await page.click('button:has-text("Registrar recebimento")');
  await page.waitForSelector("text=Recebido em", { timeout: 60000 }).catch(() => {});
  await page.reload();
  await page.waitForSelector('span:has-text("Liquidado")');
  step("fluxo 1: receita criada e recebida integralmente");

  // ----- Fluxo 2: despesa parcelada (3x) → pagamento parcial → vencida
  await page.goto(`${BASE}/financeiro/pagar/novo`);
  await page.click('button:has-text("Parcelado")');
  await page.fill('input[name="description"]', "Ração " + RUN);
  await page.fill('input[name="amount"]', "300,00");
  await page.fill('input[name="dueDate"]', "2026-08-10"); // primeira parcela no passado → vencida
  await page.fill('input[name="installments"]', "3");
  await page.selectOption('select[name="categoryId"]', await optionByText(page, 'select[name="categoryId"]', "Alimentação"));
  await page.selectOption('select[name="supplierId"]', { label: `Ração Boa ${RUN}` });
  await page.click('button:has-text("Criar despesa")');
  await page.waitForURL(/\/financeiro\/pagar(\?|$)/, { timeout: 60000 });
  await page.goto(`${BASE}/financeiro/pagar?mes=2026-08&status=open`);
  await page.waitForSelector(`text=Ração ${RUN} (1/3)`);
  await page.waitForSelector("text=Vencido");
  await page.click(`a:has-text("Ração ${RUN} (1/3)")`);
  await page.waitForSelector("text=Registrar pagamento");
  await page.fill('form:has(button:has-text("Registrar pagamento")) input[name="amount"]', "40,00");
  await page.click('button:has-text("Registrar pagamento")');
  await page.waitForTimeout(1500);
  await page.reload();
  await page.waitForSelector('span:has-text("Vencido")'); // vencido prevalece na exibição; o status interno é "partial"
  await page.waitForSelector("text=R$ 60,00");
  await page.waitForSelector("text=R$ 40,00");
  await page.goto(`${BASE}/financeiro/pagar?mes=2026-08&status=open`);
  await page.waitForSelector(`text=Ração ${RUN} (1/3)`);
  await page.goto(`${BASE}/financeiro/pagar?mes=2026-08&status=paid`);
  if (await page.locator(`a:has-text("Ração ${RUN} (1/3)")`).count() !== 0) throw new Error("parcela parcial listada como liquidada");
  step("fluxo 2: parcelas geradas, parcial e vencida corretos");

  // ----- Fluxo 3: recorrência → gerar → editar futuras → encerrar
  await page.goto(`${BASE}/financeiro/pagar/novo`);
  await page.click('button:has-text("Recorrente")');
  await page.fill('input[name="description"]', "Aluguel " + RUN);
  await page.fill('input[name="amount"]', "1200,00");
  await page.fill('input[name="dueDate"]', `${ym}-05`);
  await page.selectOption('select[name="categoryId"]', await optionByText(page, 'select[name="categoryId"]', "Aluguel"));
  await page.click('button:has-text("Criar despesa")');
  await page.waitForURL(/\/financeiro\/(pagar|recorrencias)/, { timeout: 60000 });
  await page.goto(`${BASE}/financeiro/recorrencias`);
  await page.waitForSelector(`text=Aluguel ${RUN}`);
  const next = new Date(); next.setUTCMonth(next.getUTCMonth() + 2);
  await page.fill('input[name="upTo"]', next.toISOString().slice(0, 7));
  await page.click('button:has-text("Gerar lançamentos")');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("Gerar lançamentos")'); // idempotente
  await page.waitForTimeout(2000);
  await page.goto(`${BASE}/financeiro/pagar?mes=${next.toISOString().slice(0, 7)}&status=open`);
  const alugCount = await page.locator(`a:has-text("Aluguel ${RUN}")`).count();
  if (alugCount !== 1) throw new Error("recorrência duplicou: " + alugCount);
  await page.goto(`${BASE}/financeiro/recorrencias`);
  await page.click(`li:has-text("Aluguel ${RUN}") button:has-text("Editar futuras")`);
  await page.fill(`li:has-text("Aluguel ${RUN}") input[name="amount"]`, "1300,00");
  await page.click(`li:has-text("Aluguel ${RUN}") button:has-text("Aplicar a esta e às futuras")`);
  await page.waitForTimeout(2000);
  await page.goto(`${BASE}/financeiro/pagar?mes=${next.toISOString().slice(0, 7)}&status=open`);
  await page.waitForSelector("text=R$ 1.300,00");
  await page.goto(`${BASE}/financeiro/recorrencias`);
  page.once("dialog", (d) => d.accept());
  await page.click(`li:has-text("Aluguel ${RUN}") button:has-text("Encerrar")`);
  await page.waitForTimeout(2000);
  await page.reload();
  await page.waitForSelector(`li:has-text("Aluguel ${RUN}") span:has-text("Encerrada")`);
  await page.goto(`${BASE}/financeiro/pagar?mes=${next.toISOString().slice(0, 7)}&status=open`);
  if (await page.locator(`a:has-text("Aluguel ${RUN}")`).count() !== 0) throw new Error("ocorrência futura não cancelada");
  step("fluxo 3: recorrência gerada sem duplicar, editada e encerrada");

  // ----- Fluxo 4: plano de cobrança → gerar mensalidades (sem duplicar)
  await page.goto(`${BASE}/financeiro/mensalidades/novo?praticante=${pedroId}`);
  await page.selectOption('select[name="guardianId"]', { label: `Carla Fin ${RUN}` });
  await page.fill('input[name="amount"]', "400,00");
  await page.selectOption('select[name="discountType"]', "percent");
  await page.fill('input[name="discountValue"]', "10");
  await page.fill('input[name="dueDay"]', "10");
  await page.fill('input[name="startDate"]', `${ym}-01`);
  await page.click('button:has-text("Criar plano")');
  await page.waitForURL(new RegExp(`/praticantes/${pedroId}/financeiro`), { timeout: 60000 });
  await page.waitForSelector("text=R$ 360,00");
  await page.goto(`${BASE}/financeiro/mensalidades`);
  await page.fill('input[name="upTo"]', ym);
  await page.click('button:has-text("Gerar cobranças pendentes")');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("Gerar cobranças pendentes")');
  await page.waitForTimeout(2000);
  await page.goto(`${BASE}/praticantes/${pedroId}/financeiro`);
  const mens = await page.locator('a:has-text("Mensalidade equoterapia")').count();
  if (mens !== 1) throw new Error("mensalidade duplicada/ausente: " + mens);
  step("fluxo 4: plano criado e mensalidade gerada uma única vez");

  // ----- Fluxo 5: folha → conta a pagar → liquidação reflete na ficha
  await page.goto(BASE + "/colaboradores/novo");
  await page.fill('input[name="name"]', "Bruno Guia " + RUN);
  await page.fill('input[name="admissionDate"]', "2026-01-05");
  await page.selectOption('select[name="jobRoleId"]', { label: "Auxiliar guia" });
  await page.fill('input[name="salary"]', "2100,00");
  await page.click('button:has-text("Cadastrar colaborador")');
  await page.waitForURL((u) => /\/colaboradores\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/novo"), { timeout: 60000 });
  const brunoId = page.url().split("/").pop();
  const firstPay = `/pagamentos/${brunoId}/${ym}`;
  await page.goto(BASE + firstPay);
  await page.waitForSelector("text=Módulo financeiro");
  if (await page.$('button:has-text("Gerar conta a pagar")')) {
    page.once("dialog", (d) => d.accept());
    await page.click('button:has-text("Gerar conta a pagar")');
    await page.waitForTimeout(2500);
  }
  await page.goto(BASE + firstPay);
  await page.waitForSelector('a[href^="/financeiro/pagar/pay_"]');
  const payHref = await page.getAttribute('a[href^="/financeiro/pagar/pay_"]', "href");
  const payId = payHref.split("/").pop();
  if (!payId.startsWith("pay_")) throw new Error("id da conta da folha inesperado: " + payId);
  await page.goto(BASE + payHref);
  if (await page.$('button:has-text("Registrar pagamento")')) {
    await page.click('button:has-text("Registrar pagamento")');
    await page.waitForTimeout(2500);
  }
  await page.goto(BASE + firstPay);
  await page.waitForSelector('span:has-text("PAGO")');
  if (await page.$('button:has-text("Marcar como PAGO")')) throw new Error("ficha vinculada ainda permite marcar pago manualmente");
  step("fluxo 5: folha → conta a pagar → liquidação reflete na ficha");

  // ----- Movimentações, transferência, conciliação, DRE, relatórios, inadimplência
  await page.goto(`${BASE}/financeiro/movimentacoes?mes=${ym}`);
  await page.waitForSelector(`text=Avaliação inicial ${RUN}`);
  await page.selectOption('select[name="toAccountId"]', { label: `Banco Teste ${RUN}` });
  await page.fill('input[name="amount"]', "50,00");
  await page.click('button:has-text("Transferir")');
  await page.waitForTimeout(2000);
  await page.reload();
  await page.waitForSelector("text=transferência");
  await page.click('li:has-text("Avaliação inicial") button:has-text("Conferir")');
  await page.waitForTimeout(1500);
  await page.reload();
  await page.waitForSelector('li:has-text("Avaliação inicial") span:has-text("Conferida")');
  for (const p of ["/financeiro/dre", "/financeiro/relatorios?tipo=fluxo", "/financeiro/relatorios?tipo=categorias", "/financeiro/inadimplencia", `/financeiro/receber?status=overdue`]) {
    const r = await page.goto(BASE + p);
    if (r.status() !== 200) throw new Error(p + " status " + r.status());
  }
  await page.goto(`${BASE}/financeiro/inadimplencia`);
  await page.goto(`${BASE}/financeiro/dre?mes=${ym}`);
  await page.waitForSelector("text=Receita bruta");
  // resumo incremental por competência: avaliação (150) + mensalidade com 10% de bolsa (360)
  await page.waitForSelector('tr:has-text("Receita bruta") >> text=R$ 510,00');
  await page.waitForSelector('tr:has-text("Mensalidades") >> text=R$ 510,00');
  await page.goto(`${BASE}/financeiro?mes=${ym}`);
  await page.waitForSelector("text=Saldo das contas");
  await page.waitForSelector(`text=Banco Teste ${RUN}`);
  step("movimentações, transferência, conciliação, DRE e relatórios");

  // ----- Fluxo 6: área da família vê só as próprias cobranças
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  ctx2.setDefaultTimeout(120000);
  const p2 = await ctx2.newPage();
  await login(p2, `carla.${RUN}@teste.com`, "carla12345");
  await p2.waitForURL(/conta/, { timeout: 30000 });
  await p2.fill('input[name="password"]', "carla123456");
  await p2.fill('input[name="confirm"]', "carla123456");
  await p2.click('button:has-text("Salvar nova senha")');
  await p2.waitForURL(/entrar/, { timeout: 30000 });
  await login(p2, `carla.${RUN}@teste.com`, "carla123456");
  await p2.goto(BASE + "/familia/financeiro");
  await p2.waitForSelector("text=Mensalidade equoterapia");
  await p2.waitForSelector("text=R$ 360,00");
  await p2.waitForSelector(`text=Avaliação inicial ${RUN}`);
  if (await p2.$(`text=Ração ${RUN}`)) throw new Error("família viu despesa da empresa");
  const forb = await p2.request.get(`${BASE}/financeiro`);
  if ((await forb.text()).includes("Saldo das contas")) throw new Error("responsável acessou o financeiro interno");
  await p2.screenshot({ path: "e2e/shot-familia-financeiro.png", fullPage: true });
  await ctx2.close();
  step("fluxo 6: família vê apenas as próprias cobranças");

  // ----- Auditoria
  await page.goto(`${BASE}/auditoria`);
  await page.goto(`${BASE}/auditoria?entidade=financialEntry`);
  await page.waitForSelector(`text=Avaliação inicial ${RUN}`, { timeout: 30000 });
  step("auditoria registra ações financeiras");

  writeFileSync("e2e/.last-finance.json", JSON.stringify({ pedroId, carlaId, rec1 }));
  console.log("FINANCE OK");
} catch (e) {
  console.log("FAIL", e.message);
  await page.screenshot({ path: "e2e/shot-fail.png", fullPage: true });
  process.exitCode = 1;
} finally {
  await browser.close();
}
