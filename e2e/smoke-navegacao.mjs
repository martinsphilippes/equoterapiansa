// Fumaça Navegação no celular: barra com 4 fixas + "Mais", conteúdo por perfil e acesso completo.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const exe = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe });
const step = (s) => console.log("✓", s);
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
async function login(p, email, pass) {
  await p.goto(BASE + "/entrar");
  await p.fill('input[type="email"]', email);
  await p.fill('input[type="password"]', pass);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 60000, waitUntil: "commit" });
}
const barLabels = (p) => p.$$eval("nav.fixed a, nav.fixed button", (els) => els.map((e) => e.textContent.trim()));
try {
  // ----- Dono: barra fixa + folha com o restante
  const ctx = await browser.newContext(phone); ctx.setDefaultTimeout(120000);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await login(page, "dona@teste.com", "senha12345");
  await page.goto(BASE + "/painel");
  const bar = await barLabels(page);
  if (bar.length !== 5) throw new Error("barra deveria ter 5 alvos, tem " + bar.length + ": " + bar.join(","));
  if (bar[4] !== "Mais") throw new Error("último alvo deveria ser Mais: " + bar.join(","));
  for (const esperado of ["Painel", "Agenda", "Praticantes", "Financeiro"]) {
    if (!bar.includes(esperado)) throw new Error(`${esperado} deveria estar fixo na barra: ${bar.join(",")}`);
  }
  step("dono: barra com " + bar.join(" · "));

  await page.click('button:has-text("Mais")');
  await page.waitForSelector('[role="dialog"]');
  const sheet = await page.$$eval('[role="dialog"] a', (els) => els.map((e) => e.textContent.trim()));
  for (const esperado of ["Jornada", "Equipe", "Pagamentos", "Comunicados", "Auditoria", "Configurações", "Minha conta"]) {
    if (!sheet.includes(esperado)) throw new Error(`${esperado} faltando na folha: ${sheet.join(",")}`);
  }
  if (!(await page.$('[role="dialog"] button:has-text("Sair")'))) throw new Error("Sair faltando na folha");
  await page.screenshot({ path: "e2e/ui-mais-mobile.png" });
  step("dono: folha lista " + sheet.length + " destinos e o botão Sair");

  // navegar pela folha fecha e leva ao destino
  await page.click('[role="dialog"] a:has-text("Configurações")');
  await page.waitForURL(/configuracoes/, { timeout: 30000 });
  if (await page.$('[role="dialog"]')) throw new Error("folha continuou aberta após navegar");
  step("navegação pela folha funciona e fecha a folha");

  // fechar pelo botão e pelo fundo escuro
  await page.click('button:has-text("Mais")');
  await page.waitForSelector('[role="dialog"]');
  await page.click('[role="dialog"] button[aria-label="Fechar"]');
  if (await page.$('[role="dialog"]')) throw new Error("folha não fechou pelo botão");
  await page.click('button:has-text("Mais")');
  await page.waitForSelector('[role="dialog"]');
  await page.mouse.click(195, 80); // fundo escuro, acima da folha
  await page.waitForSelector('[role="dialog"]', { state: "detached", timeout: 10000 });
  step("folha fecha pelo botão e pelo fundo");

  // estado ativo do Mais quando a rota está lá dentro
  await page.goto(BASE + "/auditoria");
  const ativo = await page.$eval('nav.fixed button:has-text("Mais")', (el) => el.className.includes("text-primary-700"));
  if (!ativo) throw new Error("Mais deveria aparecer ativo dentro de Auditoria");
  step("Mais fica destacado quando a tela atual está nele");
  await ctx.close();

  // ----- Responsável: nada de administração
  const last = JSON.parse(readFileSync("e2e/.last-run.json", "utf8"));
  const ctx2 = await browser.newContext(phone); ctx2.setDefaultTimeout(120000);
  const p2 = await ctx2.newPage();
  await login(p2, last.familyEmail, last.familyPass);
  await p2.goto(BASE + "/familia");
  const bar2 = await barLabels(p2);
  if (bar2.some((l) => ["Equipe", "Pagamentos", "Auditoria", "Configurações"].includes(l))) throw new Error("responsável vê item administrativo: " + bar2.join(","));
  if (bar2.includes("Mais")) {
    await p2.click('button:has-text("Mais")');
    await p2.waitForSelector('[role="dialog"]');
    const sheet2 = await p2.$$eval('[role="dialog"] a', (els) => els.map((e) => e.textContent.trim()));
    if (sheet2.some((l) => ["Equipe", "Pagamentos", "Auditoria", "Configurações"].includes(l))) throw new Error("responsável vê item administrativo na folha: " + sheet2.join(","));
  }
  step("responsável: " + bar2.join(" · "));
  await ctx2.close();

  console.log("NAVEGACAO OK");
} catch (e) {
  console.log("FAIL", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
