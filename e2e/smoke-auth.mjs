// Fumaça: configuração inicial + login + troca de senha, contra os emuladores.
import { chromium } from "@playwright/test";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const exe = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(120000);
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
try {
  await page.goto(BASE + "/");
  await page.waitForURL(/configuracao-inicial|entrar/, { timeout: 60000 });
  if (page.url().includes("configuracao-inicial")) {
    await page.fill('input[name="orgName"]', "Equoterapia Teste");
    await page.fill('input[name="name"]', "Dona Teste");
    await page.fill('input[name="email"]', "dona@teste.com");
    await page.fill('input[name="password"]', "senha12345");
    await page.fill('input[name="secret"]', "setup-local");
    await page.click('button[type="submit"]');
    await page.waitForURL(/entrar/, { timeout: 60000 });
    console.log("setup ok");
  }
  await page.fill('input[type="email"]', "dona@teste.com");
  await page.fill('input[type="password"]', "senha12345");
  await page.click('button[type="submit"]');
  await page.waitForURL(/painel/, { timeout: 60000 });
  console.log("login ok ->", page.url());
  await page.screenshot({ path: process.env.SHOT || "e2e/shot-painel.png" });
  await page.goto(BASE + "/conta");
  await page.fill('input[name="password"]', "senha12345");
  await page.fill('input[name="confirm"]', "senha12345");
  await page.click('button:has-text("Salvar nova senha")');
  await page.waitForURL(/entrar\?msg=senha-alterada/, { timeout: 30000 });
  console.log("change password ok");
} catch (e) {
  console.log("FAIL", e.message);
  await page.screenshot({ path: "e2e/shot-fail.png" });
  process.exitCode = 1;
} finally {
  await browser.close();
}
