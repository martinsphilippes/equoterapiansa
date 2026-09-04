import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const BASE = "http://localhost:3100";
const last = JSON.parse(readFileSync("e2e/.last-run.json", "utf8"));
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.addInitScript(() => {
  window.__reveal = null; window.__skeleton = null;
  const t0 = performance.timeOrigin;
  const iv = setInterval(() => {
    const hasSk = !!document.querySelector('[aria-label="Carregando"]');
    if (hasSk && window.__skeleton === null) window.__skeleton = Math.round(performance.now());
    const txt = document.body?.innerText || "";
    if (window.__reveal === null && (txt.includes("COLABORADORES") || txt.includes("Frequência") || txt.includes("Comparativo"))) { window.__reveal = Math.round(performance.now()); clearInterval(iv); }
  }, 5);
});
await page.goto(BASE + "/entrar"); await page.fill('input[type="email"]', "dona@teste.com"); await page.fill('input[type="password"]', "senha12345"); await page.click('button[type="submit"]'); await page.waitForURL(/painel/, { waitUntil: "commit" }); await page.waitForLoadState("networkidle");
for (const p of ["/painel", `/praticantes/${last.joaoId}`, `/praticantes/${last.joaoId}/evolucao`]) {
  await page.goto(BASE + p, { waitUntil: "load" }); await page.waitForTimeout(600);
  console.log(p, await page.evaluate(() => ({ skeletonAt: window.__skeleton, contentAt: window.__reveal, docEnd: Math.round(performance.getEntriesByType("navigation")[0].responseEnd) })));
}
await browser.close();
