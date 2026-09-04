import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const BASE = process.env.BASE_URL || "http://localhost:3100";
const last = JSON.parse(readFileSync("e2e/.last-run.json", "utf8"));
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto(BASE + "/entrar"); await page.fill('input[type="email"]', "dona@teste.com"); await page.fill('input[type="password"]', "senha12345"); await page.click('button[type="submit"]'); await page.waitForURL(/painel/, { waitUntil: "commit" }); await page.waitForLoadState("networkidle");
for (const p of ["/painel", `/praticantes/${last.joaoId}`, "/agenda", "/pagamentos"]) {
  const t = [];
  for (let i = 0; i < 3; i++) {
    await page.goto(BASE + p, { waitUntil: "load" });
    t.push(await page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return { ttfb: Math.round(n.responseStart), docEnd: Math.round(n.responseEnd), dcl: Math.round(n.domContentLoadedEventEnd) }; }));
  }
  console.log(p, JSON.stringify(t));
}
await browser.close();
