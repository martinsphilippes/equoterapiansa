import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const BASE = "http://localhost:3100";
const last = JSON.parse(readFileSync("e2e/.last-run.json", "utf8"));
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
await page.addInitScript(() => { window.__lcpInfo = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcpInfo.push({ t: Math.round(e.startTime), el: e.element ? e.element.tagName + "." + (e.element.className || "").toString().slice(0, 40) + " | " + (e.element.textContent || "").slice(0, 30) : "?", url: e.url, size: e.size }); }).observe({ type: "largest-contentful-paint", buffered: true }); });
await page.goto(BASE + "/entrar"); await page.fill('input[type="email"]', "dona@teste.com"); await page.fill('input[type="password"]', "senha12345"); await page.click('button[type="submit"]'); await page.waitForURL(/painel/, { waitUntil: "commit" }); await page.waitForLoadState("networkidle");
for (const p of ["/painel", `/praticantes/${last.joaoId}`, "/pagamentos"]) { await page.goto(BASE + p, { waitUntil: "load" }); await page.waitForLoadState("networkidle"); await page.waitForTimeout(500); console.log(p, JSON.stringify(await page.evaluate(() => window.__lcpInfo))); }
await browser.close();
