// Fumaça Unidades: duas empresas na mesma base, com isolamento total entre elas.
// Daniela é da Equoterapia; Kauan é da Equitação Vida. Nenhum vê nada do outro.
import { chromium } from "@playwright/test";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const exe = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe });
const step = (s) => console.log("✓", s);
const RUN = Date.now().toString(36);
const nova = (n) => `${n} ${RUN}`;
// Nome único por execução: a base dos emuladores é compartilhada entre os testes.
const UNIDADE = `Equitacao Vida ${RUN}`;
async function ctx() { const c = await browser.newContext({ viewport: { width: 1280, height: 900 } }); c.setDefaultTimeout(120000); return c; }
async function login(p, email, pass) {
  // Uma segunda tentativa cobre o emulador de autenticação recusando o primeiro
  // envio logo após uma troca de senha (as sessões acabaram de ser revogadas).
  for (let tentativa = 1; ; tentativa++) {
    await p.goto(BASE + "/entrar");
    await p.fill('input[type="email"]', email);
    await p.fill('input[type="password"]', pass);
    await p.click('button[type="submit"]');
    try {
      await p.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 30000, waitUntil: "commit" });
      return;
    } catch (e) {
      const erro = await p.locator('[role="alert"], .text-danger').first().innerText().catch(() => "");
      if (tentativa >= 3) throw new Error(`login de ${email} falhou: ${erro || e.message}`);
      await p.waitForTimeout(2000);
    }
  }
}
async function trocaSenha(p, email, provisoria, nova) {
  await login(p, email, provisoria);
  await p.waitForURL(/conta/, { timeout: 30000 });
  await p.fill('input[name="password"]', nova);
  await p.fill('input[name="confirm"]', nova);
  await p.click('button:has-text("Salvar nova senha")');
  await p.waitForURL(/entrar/, { timeout: 30000 });
  await login(p, email, nova);
}
/** Texto visível da tela, para afirmar ausência de dados da outra empresa. */
const texto = (p) => p.innerText("main");
const c1 = await ctx();
const dono = await c1.newPage();
dono.on("pageerror", (e) => console.log("PAGEERROR", e.message));
try {
  await login(dono, "dona@teste.com", "senha12345");
  step("login do dono");

  // ----- Praticante só da Equoterapia
  await dono.goto(BASE + "/praticantes/novo");
  await dono.fill('input[name="name"]', nova("Praticante Equo"));
  await dono.click('button:has-text("Cadastrar praticante")');
  await dono.waitForURL((u) => /\/praticantes\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/novo"), { timeout: 60000 });
  const praticanteEquo = dono.url().split("/").pop();

  // Daniela, da Equoterapia
  await dono.goto(BASE + "/configuracoes/usuarios");
  await dono.fill('form:has(button:has-text("Criar acesso")) input[name="name"]', nova("Daniela Equo"));
  await dono.fill('form:has(button:has-text("Criar acesso")) input[name="email"]', `daniela.${RUN}@teste.com`);
  await dono.selectOption('form:has(button:has-text("Criar acesso")) select[name="role"]', "manager");
  await dono.fill('form:has(button:has-text("Criar acesso")) input[name="password"]', "daniela12345");
  await dono.click('button:has-text("Criar acesso")');
  await dono.waitForSelector("text=Acesso criado para", { timeout: 60000 });
  await dono.click('button:has-text("Continuar")');
  step("Daniela criada na Equoterapia");

  // ----- Nova unidade
  await dono.goto(BASE + "/configuracoes/unidades");
  await dono.fill('form:has(button:has-text("Criar unidade")) input[name="name"]', UNIDADE);
  await dono.fill('form:has(button:has-text("Criar unidade")) input[name="city"]', "Ituiutaba – Minas Gerais");
  await dono.click('button:has-text("Criar unidade")');
  await dono.waitForSelector(`text=Unidade ${UNIDADE} criada`, { timeout: 90000 });
  step("unidade Equitação Vida criada");

  // ----- Dono troca para a nova unidade
  await dono.goto(BASE + "/painel");
  await dono.click(`button[aria-expanded="false"]:has-text("Equoterapia"), button[aria-expanded="false"]:has-text("${UNIDADE}")`);
  await dono.click(`form button:has-text("${UNIDADE}")`);
  // A troca redireciona para /painel, que já é a página atual: espera o seletor
  // exibir a nova unidade, senão a próxima navegação sairia com o cookie antigo.
  await dono.waitForSelector(`button[aria-expanded="false"]:has-text("${UNIDADE}")`, { timeout: 60000 });
  await dono.goto(BASE + "/praticantes");
  const listaEV = await texto(dono);
  if (listaEV.includes(nova("Praticante Equo"))) throw new Error("praticante da Equoterapia apareceu na Equitação Vida");
  step("na unidade nova, a lista de praticantes começa vazia");

  // Praticante e usuário só da Equitação Vida
  await dono.goto(BASE + "/praticantes/novo");
  await dono.fill('input[name="name"]', nova("Praticante Vida"));
  await dono.click('button:has-text("Cadastrar praticante")');
  await dono.waitForURL((u) => /\/praticantes\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/novo"), { timeout: 60000 });
  const praticanteVida = dono.url().split("/").pop();
  await dono.goto(BASE + "/configuracoes/usuarios");
  await dono.fill('form:has(button:has-text("Criar acesso")) input[name="name"]', nova("Kauan Vida"));
  await dono.fill('form:has(button:has-text("Criar acesso")) input[name="email"]', `kauan.${RUN}@teste.com`);
  await dono.selectOption('form:has(button:has-text("Criar acesso")) select[name="role"]', "manager");
  await dono.fill('form:has(button:has-text("Criar acesso")) input[name="password"]', "kauan1234567");
  await dono.click('button:has-text("Criar acesso")');
  await dono.waitForSelector("text=Acesso criado para", { timeout: 60000 });
  await dono.click('button:has-text("Continuar")');
  const usuariosEV = await texto(dono);
  if (usuariosEV.includes(nova("Daniela Equo"))) throw new Error("Daniela apareceu na lista de usuários da Equitação Vida");
  step("Kauan criado na Equitação Vida, sem ver usuários da outra");

  // ----- Kauan não vê nada da Equoterapia
  const c2 = await ctx();
  const kauan = await c2.newPage();
  await trocaSenha(kauan, `kauan.${RUN}@teste.com`, "kauan1234567", "kauan12345678");
  await kauan.goto(BASE + "/praticantes");
  const kauanLista = await texto(kauan);
  if (!kauanLista.includes(nova("Praticante Vida"))) throw new Error("Kauan não viu o praticante da própria empresa");
  if (kauanLista.includes(nova("Praticante Equo"))) throw new Error("Kauan viu praticante da Equoterapia");
  const direto = await kauan.request.get(`${BASE}/praticantes/${praticanteEquo}`);
  const htmlDireto = await direto.text();
  if (htmlDireto.includes(nova("Praticante Equo"))) throw new Error("Kauan abriu por endereço direto o praticante da Equoterapia");
  await kauan.goto(BASE + "/configuracoes/usuarios");
  if ((await texto(kauan)).includes(nova("Daniela Equo"))) throw new Error("Kauan viu usuária da Equoterapia");
  step("Kauan vê só a Equitação Vida, inclusive por endereço direto");

  // ----- Daniela não vê nada da Equitação Vida
  const c3 = await ctx();
  const daniela = await c3.newPage();
  await trocaSenha(daniela, `daniela.${RUN}@teste.com`, "daniela12345", "daniela123456");
  await daniela.goto(BASE + "/praticantes");
  const danielaLista = await texto(daniela);
  if (!danielaLista.includes(nova("Praticante Equo"))) throw new Error("Daniela não viu o praticante da própria empresa");
  if (danielaLista.includes(nova("Praticante Vida"))) throw new Error("Daniela viu praticante da Equitação Vida");
  const direto2 = await daniela.request.get(`${BASE}/praticantes/${praticanteVida}`);
  if ((await direto2.text()).includes(nova("Praticante Vida"))) throw new Error("Daniela abriu por endereço direto o praticante da outra empresa");
  if ((await daniela.request.get(`${BASE}/configuracoes/unidades`)).status() === 200 && (await daniela.request.get(`${BASE}/configuracoes/unidades`)).url().includes("unidades")) {
    const u = await daniela.goto(BASE + "/configuracoes/unidades");
    if ((await u.text()).includes("Nova unidade")) throw new Error("Gerente alcançou o cadastro de unidades");
  }
  step("Daniela vê só a Equoterapia e não administra unidades");

  // ----- Sem seletor de unidade para quem tem uma só
  await daniela.goto(BASE + "/painel");
  if (await daniela.$(`button:has-text("${UNIDADE}")`)) throw new Error("Daniela viu o seletor de unidades");
  step("seletor de unidade só aparece para quem tem mais de uma");

  // ----- Financeiro e fichas também separados
  // O dono continua na unidade nova: confere que ela nasceu com cadastros próprios.
  await dono.goto(BASE + "/financeiro/configuracoes?aba=categorias");
  if (!(await texto(dono)).includes("Mensalidades")) throw new Error("unidade nova ficou sem plano de contas próprio");
  step("unidade nova nasce com cadastros próprios do financeiro");

  await c2.close(); await c3.close();
  console.log("UNIDADES OK");
} catch (e) {
  console.log("FAIL", e.message);
  await dono.screenshot({ path: "e2e/shot-fail.png", fullPage: true });
  process.exitCode = 1;
} finally {
  await browser.close();
}
