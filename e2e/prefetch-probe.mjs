import { chromium } from "@playwright/test";
const BASE = process.env.BASE_URL || "http://localhost:3100";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(BASE + "/entrar");
await page.fill('input[type="email"]', "dona@teste.com"); await page.fill('input[type="password"]', "senha12345");
await page.click('button[type="submit"]'); await page.waitForURL(/painel/, { waitUntil: "commit" }); await page.waitForLoadState("networkidle");
for (const path of ["/praticantes", "/agenda"]) {
  const urls = [];
  const h = (r) => { const ct = r.headers()["content-type"] || ""; if (ct.includes("text/x-component") || r.url().includes("_rsc")) urls.push(r.url().replace(BASE, "") + " [" + r.headers()["content-type"]?.slice(0, 16) + "]"); };
  page.on("response", h);
  await page.request.get(BASE + "/api/perf-reads?reset=1");
  await page.goto(BASE + path, { waitUntil: "load" }); await page.waitForLoadState("networkidle"); await page.waitForTimeout(1500);
  page.off("response", h);
  const reads = await (await page.request.get(BASE + "/api/perf-reads")).json();
  console.log(path, reads, "\n  " + urls.join("\n  "));
}
await browser.close();
