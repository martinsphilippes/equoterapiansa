// Capturas para revisão visual da identidade (celular e desktop).
import { chromium } from "@playwright/test";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const exe = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe });
async function login(p, email, pass) {
  await p.goto(BASE + "/entrar");
  await p.fill('input[type="email"]', email);
  await p.fill('input[type="password"]', pass);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 120000, waitUntil: "commit" });
  await p.waitForLoadState("networkidle");
}
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const m = await mobile.newPage(); m.setDefaultTimeout(120000);
await m.goto(BASE + "/entrar"); await m.waitForLoadState("networkidle");
await m.screenshot({ path: "e2e/ui-login-mobile.png", fullPage: true });
await login(m, "dona@teste.com", "senha12345");
await m.screenshot({ path: "e2e/ui-painel-mobile.png", fullPage: true });
await m.goto(BASE + "/praticantes"); await m.waitForLoadState("networkidle");
const first = await m.$('a[href^="/praticantes/"]:not([href$="/novo"])');
if (first) {
  const href = await first.getAttribute("href");
  await m.goto(BASE + href + "/evolucao"); await m.waitForLoadState("networkidle");
  await m.screenshot({ path: "e2e/ui-evolucao-mobile.png", fullPage: true });
  await m.goto(BASE + href); await m.waitForLoadState("networkidle");
  await m.screenshot({ path: "e2e/ui-praticante-mobile.png", fullPage: true });
}
await m.goto(BASE + "/agenda"); await m.waitForLoadState("networkidle");
await m.screenshot({ path: "e2e/ui-agenda-mobile.png", fullPage: true });
await mobile.close();
const desktop = await browser.newContext({ viewport: { width: 1366, height: 860 } });
const d = await desktop.newPage(); d.setDefaultTimeout(120000);
await d.goto(BASE + "/entrar"); await d.waitForLoadState("networkidle");
await d.screenshot({ path: "e2e/ui-login-desktop.png" });
await login(d, "dona@teste.com", "senha12345");
await d.screenshot({ path: "e2e/ui-painel-desktop.png", fullPage: true });
await d.goto(BASE + "/pagamentos"); await d.waitForLoadState("networkidle");
await d.screenshot({ path: "e2e/ui-pagamentos-desktop.png", fullPage: true });
await desktop.close();
// família
const fam = process.env.FAMILY_EMAIL;
if (fam) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const f = await c.newPage(); f.setDefaultTimeout(120000);
  await login(f, fam, process.env.FAMILY_PASS);
  await f.screenshot({ path: "e2e/ui-familia-mobile.png", fullPage: true });
  await c.close();
}
await browser.close();
console.log("screenshots ok");
