// Fumaça Usuários: criar acesso na própria tela (pessoa nova, colaborador existente, responsável) e validar o login.
import { chromium } from "@playwright/test";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const exe = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
ctx.setDefaultTimeout(120000);
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
const step = (s) => console.log("✓", s);
const RUN = Date.now().toString(36);
async function optionByText(p, selector, text) {
  return p.$eval(selector, (sel, t) => (Array.from(sel.options).find((o) => o.textContent.includes(t)) || {}).value, text);
}
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

  // ----- Pessoa nova: cadastra colaborador e acesso em um passo
  await page.goto(BASE + "/configuracoes/usuarios");
  await page.waitForSelector("text=Adicionar usuário");
  const email = `novo.${RUN}@teste.com`;
  await page.fill('form:has(button:has-text("Criar acesso")) input[name="name"]', "Novo Usuario " + RUN);
  await page.fill('form:has(button:has-text("Criar acesso")) input[name="email"]', email);
  await page.selectOption('form:has(button:has-text("Criar acesso")) select[name="role"]', "professional");
  await page.fill('form:has(button:has-text("Criar acesso")) input[name="password"]', "novo123456");
  await page.click('button:has-text("Criar acesso")');
  await page.waitForSelector("text=Acesso criado para", { timeout: 60000 });
  step("pessoa nova: acesso criado com senha visível");
  await page.click('button:has-text("Continuar")');
  await page.waitForSelector(`text=${email}`, { timeout: 30000 });
  await page.goto(BASE + "/colaboradores");
  await page.waitForSelector(`text=Novo Usuario ${RUN}`);
  step("pessoa nova aparece na equipe");

  // login do novo usuário: perfil profissional cai na troca de senha
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  ctx2.setDefaultTimeout(120000);
  const p2 = await ctx2.newPage();
  await login(p2, email, "novo123456");
  await p2.waitForURL(/conta/, { timeout: 30000 });
  await p2.fill('input[name="password"]', "novo1234567");
  await p2.fill('input[name="confirm"]', "novo1234567");
  await p2.click('button:has-text("Salvar nova senha")');
  await p2.waitForURL(/entrar/, { timeout: 30000 });
  await login(p2, email, "novo1234567");
  const forb = await p2.request.get(`${BASE}/configuracoes/usuarios`);
  if ((await forb.text()).includes("Adicionar usuário")) throw new Error("profissional alcançou a tela de usuários");
  await ctx2.close();
  step("novo usuário entra e não acessa a tela de usuários");

  // ----- Colaborador já cadastrado
  await page.goto(BASE + "/colaboradores/novo");
  await page.fill('input[name="name"]', "Sem Acesso " + RUN);
  await page.click('button:has-text("Cadastrar colaborador")');
  await page.waitForURL((u) => /\/colaboradores\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/novo"), { timeout: 60000 });
  await page.goto(BASE + "/configuracoes/usuarios");
  await page.click('button:has-text("Colaborador sem acesso")');
  await page.selectOption('select[name="collaboratorId"]', await optionByText(page, 'select[name="collaboratorId"]', `Sem Acesso ${RUN}`));
  const email2 = `semacesso.${RUN}@teste.com`;
  await page.fill('form:has(select[name="collaboratorId"]) input[name="email"]', email2);
  await page.click('button:has-text("Criar acesso")');
  await page.waitForSelector("text=Acesso criado", { timeout: 60000 });
  await page.click('button:has-text("Continuar")');
  await page.waitForSelector(`text=${email2}`, { timeout: 30000 });
  step("colaborador existente ganhou acesso");

  // não some da lista? deve sumir das opções
  await page.goto(BASE + "/configuracoes/usuarios");
  await page.click('button:has-text("Colaborador sem acesso")');
  if (await page.$(`select[name="collaboratorId"] option:has-text("Sem Acesso ${RUN}")`)) throw new Error("colaborador com acesso ainda aparece na lista");
  step("lista de pendentes atualizada");

  // ----- Responsável sem acesso
  await page.goto(BASE + "/praticantes/novo");
  await page.fill('input[name="name"]', "Praticante Usr " + RUN);
  await page.click('button:has-text("Cadastrar praticante")');
  await page.waitForURL((u) => /\/praticantes\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/novo"), { timeout: 60000 });
  const pid = page.url().split("/").pop();
  await page.goto(`${BASE}/responsaveis/novo?praticante=${pid}`);
  await page.fill('input[name="name"]', "Resp Usr " + RUN);
  await page.fill('input[name="phone"]', "11977776666");
  await page.click('button:has-text("Cadastrar responsável")');
  await page.waitForURL(/\/praticantes\/.*\/responsaveis/, { timeout: 60000 });
  await page.goto(BASE + "/configuracoes/usuarios");
  await page.click('button:has-text("Responsável sem acesso")');
  await page.selectOption('select[name="guardianId"]', await optionByText(page, 'select[name="guardianId"]', `Resp Usr ${RUN}`));
  const email3 = `resp.${RUN}@teste.com`;
  await page.fill('form:has(select[name="guardianId"]) input[name="email"]', email3);
  await page.click('button:has-text("Criar acesso")');
  await page.waitForSelector("text=Acesso criado", { timeout: 60000 });
  await page.click('button:has-text("Continuar")');
  await page.waitForSelector(`text=${email3}`, { timeout: 30000 });
  step("responsável ganhou acesso pela tela de usuários");

  // ----- E-mail duplicado é recusado
  await page.goto(BASE + "/configuracoes/usuarios");
  await page.fill('form:has(button:has-text("Criar acesso")) input[name="name"]', "Duplicado " + RUN);
  await page.fill('form:has(button:has-text("Criar acesso")) input[name="email"]', email);
  await page.click('button:has-text("Criar acesso")');
  await page.waitForSelector("text=Já existe um acesso com este e-mail", { timeout: 60000 });
  await page.goto(BASE + "/colaboradores");
  if (await page.$(`text=Duplicado ${RUN}`)) throw new Error("colaborador órfão criado apesar do erro");
  step("e-mail duplicado recusado sem deixar cadastro órfão");

  console.log("USUARIOS OK");
} catch (e) {
  console.log("FAIL", e.message);
  await page.screenshot({ path: "e2e/shot-fail.png", fullPage: true });
  process.exitCode = 1;
} finally {
  await browser.close();
}
