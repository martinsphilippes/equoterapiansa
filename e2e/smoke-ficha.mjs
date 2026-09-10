// Fumaça Ficha pública: gerar link → preencher sem login → conferir → imprimir → converter em praticante.
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
async function login(p, email, pass) {
  await p.goto(BASE + "/entrar");
  await p.fill('input[type="email"]', email);
  await p.fill('input[type="password"]', pass);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 60000, waitUntil: "commit" });
}
try {
  await login(page, "dona@teste.com", "senha12345");
  await page.goto(BASE + "/cadastros");
  await page.waitForSelector("text=Link do formulário público");
  if (await page.$('button:has-text("Gerar link")')) {
    await page.click('button:has-text("Gerar link")');
    await page.waitForSelector("text=Copiar link", { timeout: 60000 });
  }
  const url = (await page.textContent("code")).trim();
  const token = url.split("/cadastro/")[1];
  if (!token) throw new Error("token não encontrado: " + url);
  step("link público gerado");

  // ----- Preenchimento sem sessão, praticante menor de idade
  const anon = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  anon.setDefaultTimeout(120000);
  const p2 = await anon.newPage();
  p2.on("pageerror", (e) => console.log("PAGEERROR-PUB", e.message));
  const r = await p2.goto(`${BASE}/cadastro/${token}`);
  if (r.status() !== 200) throw new Error("formulário público respondeu " + r.status());
  if (p2.url().includes("/entrar")) throw new Error("formulário público exigiu login");
  step("formulário abre sem login");

  await p2.fill('input[name="nome"]', "Miguel Ficha " + RUN);
  await p2.fill('input[name="nascimento"]', "2016-04-10");
  await p2.waitForSelector("text=Responsável legal");
  step("seção do responsável aparece sozinha para menor de idade");
  await p2.fill('input[name="telefone"]', "11955554444");
  await p2.fill('input[name="cidade"]', "Sorocaba");
  await p2.fill('input[name="resp_nome"]', "Renata Ficha " + RUN);
  await p2.fill('input[name="resp_telefone"]', "11944443333");
  await p2.fill('input[name="resp_parentesco"]', "Mãe");
  await p2.fill('input[name="eme_nome"]', "Carlos Ficha " + RUN);
  await p2.fill('input[name="eme_telefone1"]', "11933332222");
  // uma condição de saúde marcada como sim revela a observação
  await p2.click('label:near(:text("Possui alergias?")) >> text=Sim');
  await p2.fill('input[name="sau_alergias_obs"]', "Alergia a poeira");
  await p2.selectOption('select[name="apt_autorizacao"]', "Sim");
  // documento 2: autoriza imagem e escolhe finalidades
  await p2.click('label:near(:text("Autoriza a captação e o uso de imagem e voz?")) >> text=Sim');
  await p2.check('input[name="img_fin_atividades"]');
  await p2.check('input[name="img_fin_redes"]');
  await p2.check('input[name="img_declaracao"]');
  // documento 3: ciência dos riscos
  await p2.check('input[name="termo_ciencia"]');
  await p2.fill('input[name="assin_nome"]', "Renata Ficha " + RUN);
  await p2.fill('input[name="assin_cpf"]', "12345678901");
  await p2.selectOption('select[name="assin_qualidade"]', "Responsável legal");
  await p2.check('input[name="aceite_declaracoes"]');
  await p2.check('input[name="aceite_privacidade"]');
  await p2.check('input[name="aceite_autorizacao"]');
  if (await p2.$('text=Autorização para captação e uso de imagem e voz') === null) throw new Error("documento de imagem não apareceu");
  if (await p2.$('text=Termo de ciência e responsabilidade para a prática') === null) throw new Error("termo de ciência não apareceu");
  await p2.click('button:has-text("Enviar ficha")');
  await p2.waitForURL(/\/enviado/, { timeout: 60000 });
  await p2.waitForSelector("text=Ficha enviada");
  const protocolo = (await p2.textContent(".tnum")).trim();
  step("ficha enviada, protocolo " + protocolo);
  await p2.screenshot({ path: "e2e/ui-ficha-enviada.png" });
  await anon.close();

  // ----- Conferência interna
  await page.goto(BASE + "/cadastros");
  await page.waitForSelector(`text=Miguel Ficha ${RUN}`);
  await page.waitForSelector("text=Menor");
  await page.click(`text=Miguel Ficha ${RUN}`);
  await page.waitForURL(/\/cadastros\/[^/]+$/);
  await page.waitForSelector("text=Alergia a poeira");
  await page.waitForSelector(`text=${protocolo}`);
  await page.waitForSelector("text=Autorização para captação e uso de imagem e voz");
  await page.waitForSelector("text=Termo de ciência e responsabilidade para a prática");
  await page.waitForSelector("text=Publicações nas redes sociais e plataformas digitais da instituição");
  const graficos = await page.locator('div:has(> dt:text-is("Materiais gráficos, cartazes, folders e materiais institucionais"))').first().innerText();
  if (!graficos.includes("Não autorizado")) throw new Error("finalidade não marcada deveria sair como não autorizada: " + graficos);
  const redes = await page.locator('div:has(> dt:text-is("Publicações nas redes sociais e plataformas digitais da instituição"))').first().innerText();
  if (!redes.includes("Autorizado") || redes.includes("Não autorizado")) throw new Error("finalidade marcada deveria sair como autorizada: " + redes);
  step("documento traz os três termos e marca cada finalidade de imagem");
  await page.screenshot({ path: "e2e/ui-ficha-detalhe.png", fullPage: true });
  step("ficha aparece na lista e o documento traz as respostas");

  await page.selectOption('select[name="status"]', "reviewed");
  await page.selectOption('select[name="registryStatus"]', "aprovado");
  await page.fill('input[name="supportDescription"]', "Acompanhamento na montaria.");
  await page.check('input[name="medicalDocs"]');
  await page.fill('textarea[name="notes"]', "Conferido na recepção.");
  await page.click('button:has-text("Salvar conferência")');
  await page.waitForTimeout(2000);
  await page.reload();
  await page.waitForSelector("text=Conferido na recepção.");
  await page.waitForSelector("text=Aprovado");
  await page.waitForSelector("text=Acompanhamento na montaria.");
  step("conferência salva, com status do cadastro e descrição do acompanhamento");

  // ----- Conversão em praticante
  page.once("dialog", (d) => d.accept());
  await page.click('button:has-text("Converter em praticante")');
  await page.waitForURL(/\/praticantes\/[^/]+$/, { timeout: 60000 });
  await page.waitForSelector(`text=Miguel Ficha ${RUN}`);
  await page.waitForSelector("text=Alergia a poeira");
  await page.waitForSelector("text=Autorizadas");
  const pid = page.url().split("/").pop();
  await page.goto(`${BASE}/praticantes/${pid}/responsaveis`);
  await page.waitForSelector(`text=Renata Ficha ${RUN}`);
  step("praticante e responsável criados a partir da ficha");

  await page.goto(BASE + "/cadastros?situacao=converted");
  await page.waitForSelector(`text=Miguel Ficha ${RUN}`);
  await page.goto(`${BASE}/cadastros?situacao=new`);
  if (await page.$(`text=Miguel Ficha ${RUN}`)) throw new Error("ficha convertida continua na lista de novas");
  step("situação da ficha acompanha a conversão");

  // ----- Link renovado invalida o anterior
  await page.goto(BASE + "/cadastros");
  page.once("dialog", (d) => d.accept());
  await page.click('button:has-text("Gerar link novo")');
  await page.waitForTimeout(2500);
  const anon2 = await browser.newContext();
  const p3 = await anon2.newPage();
  const old = await p3.goto(`${BASE}/cadastro/${token}`);
  if (old.status() !== 404) throw new Error("link antigo continuou válido: " + old.status());
  await anon2.close();
  step("link antigo deixa de funcionar após renovar");

  console.log("FICHA OK");
} catch (e) {
  console.log("FAIL", e.message);
  await page.screenshot({ path: "e2e/shot-fail.png", fullPage: true });
  process.exitCode = 1;
} finally {
  await browser.close();
}
