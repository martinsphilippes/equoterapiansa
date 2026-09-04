// Fumaça Fase 1: colaborador → função → acesso → login do colaborador → ponto → gestor corrige → pagamento.
import { chromium } from "@playwright/test";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const exe = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
const step = (s) => console.log("✓", s);
const RUN = Date.now().toString(36);
const FEMAIL = `felipe.${RUN}@teste.com`;
async function login(p, email, pass) {
  await p.goto(BASE + "/entrar");
  await p.fill('input[type="email"]', email);
  await p.fill('input[type="password"]', pass);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 60000, waitUntil: "commit" });
}
try {
  await login(page, "dona@teste.com", "senha12345");
  step("login dona");

  // Novo colaborador
  await page.goto(BASE + "/colaboradores/novo");
  await page.fill('input[name="name"]', "Felipe Silva " + RUN);
  await page.fill('input[name="cpf"]', "12345678901");
  await page.fill('input[name="email"]', FEMAIL);
  await page.fill('input[name="admissionDate"]', "2026-01-05");
  await page.selectOption('select[name="jobRoleId"]', { label: "Auxiliar guia" });
  await page.fill('input[name="salary"]', "2300,00");
  await page.click('button:has-text("Cadastrar colaborador")');
  await page.waitForURL((u) => /\/colaboradores\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/novo"), { timeout: 60000 });
  const collabUrl = page.url();
  step("colaborador criado " + collabUrl);
  await page.waitForSelector("text=R$ 2.300,00");

  // Acesso
  await page.goto(collabUrl + "/acesso");
  await page.fill('input[name="password"]', "felipe123");
  await page.click('button:has-text("Criar acesso")');
  await page.waitForSelector("text=Acesso criado", { timeout: 30000 });
  await page.click('button:has-text("Continuar")');
  await page.waitForSelector("text=Desativar acesso", { timeout: 30000 });
  step("acesso criado");

  // Login do colaborador e ponto
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx2.newPage();
  p2.on("pageerror", (e) => console.log("PAGEERROR2", e.message));
  await login(p2, FEMAIL, "felipe123");
  await p2.waitForURL(/conta/, { timeout: 30000 });
  step("colaborador redirecionado para troca de senha");
  await p2.fill('input[name="password"]', "felipe12345");
  await p2.fill('input[name="confirm"]', "felipe12345");
  await p2.click('button:has-text("Salvar nova senha")');
  await p2.waitForURL(/entrar/, { timeout: 30000 });
  await login(p2, FEMAIL, "felipe12345");
  await p2.goto(BASE + "/jornada");
  await p2.click('button:has-text("Registrar entrada")');
  await p2.waitForSelector("text=Entrada registrada", { timeout: 30000 });
  await p2.click('button:has-text("Registrar saída")');
  // no mesmo minuto a saída é recusada (regra: saída depois da entrada) — ambos os resultados validam o fluxo
  await p2.waitForSelector("text=/Saída registrada|saída precisa ser depois/", { timeout: 30000 });
  step("ponto entrada/saída");
  await p2.screenshot({ path: "e2e/shot-jornada.png", fullPage: true });
  // colaborador não deve ver /colaboradores nem /pagamentos
  await p2.goto(BASE + "/pagamentos");
  await p2.waitForURL(/sem-permissao/, { timeout: 30000 });
  step("colaborador bloqueado em /pagamentos");
  await ctx2.close();

  // Gestor corrige um dia anterior
  const today = new Date();
  const y = new Date(today); y.setDate(y.getDate() - 1);
  const yIso = y.toISOString().slice(0, 10);
  await page.goto(BASE + "/jornada/equipe?data=" + yIso);
  await page.click(`tr:has-text("Felipe Silva ${RUN}") button:text-matches("Registrar|Corrigir")`);
  await page.fill('input[name="p0_in"]', "08:03");
  await page.fill('input[name="p0_out"]', "11:00");
  await page.fill('input[name="p1_in"]', "15:00");
  await page.fill('input[name="p1_out"]', "17:42");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=5h39", { timeout: 30000 });
  step("gestor registrou dia anterior (5h39)");

  // Pagamento
  const ym = today.toISOString().slice(0, 7);
  const collabId = collabUrl.split("/").pop();
  await page.goto(`${BASE}/pagamentos/${collabId}/${ym}`);
  await page.waitForSelector("text=Valor calculado");
  await page.fill('input[name="adj0_description"]', "Vale transporte");
  await page.fill('input[name="adj0_amount"]', "150");
  await page.click('button:has-text("Salvar ajustes")');
  await page.waitForSelector("text=R$ 2.450,00", { timeout: 30000 });
  step("ajuste salvo (2.450,00)");
  page.once("dialog", (d) => d.accept());
  await page.click('button:has-text("Marcar como PAGO")');
  await page.waitForSelector('button:has-text("Desmarcar pagamento")', { timeout: 30000 });
  step("marcado como pago");
  await page.screenshot({ path: "e2e/shot-pagamento.png", fullPage: true });
  await page.goto(BASE + "/pagamentos");
  await page.waitForSelector("text=Pago");
  step("lista de pagamentos ok");

  // Configurações: nova função
  await page.goto(BASE + "/configuracoes/funcoes");
  await page.fill('form:has(button:has-text("Adicionar")) input[name="name"]', "Função " + RUN);
  await page.click('button:has-text("Adicionar")');
  await page.waitForSelector("text=Função salva", { timeout: 30000 });
  step("função criada");
  console.log("PHASE1 OK");
} catch (e) {
  console.log("FAIL", e.message);
  await page.screenshot({ path: "e2e/shot-fail.png", fullPage: true });
  process.exitCode = 1;
} finally {
  await browser.close();
}
