// Medição de performance por tela (build de produção + emuladores).
// Métricas: TTFB, LCP, CLS, requisições, bytes por tipo, leituras do Firestore no servidor.
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const BASE = process.env.BASE_URL || "http://localhost:3100";
const exe = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const label = process.env.PERF_LABEL || "run";
const last = JSON.parse(readFileSync("e2e/.last-run.json", "utf8"));
const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.setDefaultTimeout(120000);

await page.addInitScript(() => {
  window.__lcp = 0; window.__cls = 0;
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
});

async function login(email, pass) {
  await page.goto(BASE + "/entrar");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { waitUntil: "commit" });
  await page.waitForLoadState("networkidle");
}

async function measure(path, samples = 3) {
  const rows = [];
  for (let i = 0; i < samples; i++) {
    const sizes = { doc: 0, js: 0, css: 0, img: 0, font: 0, other: 0, n: 0 };
    const onResp = async (r) => {
      try {
        const h = r.headers();
        const ct = h["content-type"] || "";
        const len = Number(h["content-length"]) || (await r.body().catch(() => Buffer.alloc(0))).length;
        const t = r.request().resourceType();
        const k = t === "document" ? "doc" : t === "script" ? "js" : t === "stylesheet" ? "css" : t === "image" ? "img" : t === "font" ? "font" : (ct.includes("text/x-component") ? "doc" : "other");
        sizes[k] += len; sizes.n++;
      } catch {}
    };
    page.on("response", onResp);
    await page.request.get(BASE + "/api/perf-reads?reset=1").catch(() => {});
    await page.goto(BASE + path, { waitUntil: "load" });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    page.off("response", onResp);
    const nav = await page.evaluate(() => {
      const n = performance.getEntriesByType("navigation")[0];
      return { ttfb: n.responseStart - n.requestStart, domContent: n.domContentLoadedEventEnd - n.startTime, load: n.loadEventEnd - n.startTime, lcp: window.__lcp, cls: window.__cls };
    });
    const reads = await (await page.request.get(BASE + "/api/perf-reads")).json().catch(() => ({}));
    rows.push({ ...nav, ...sizes, reads: reads.docs ?? null, ops: reads.ops ?? null });
  }
  const med = (k) => { const v = rows.map((r) => r[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
  return { path, ttfb: Math.round(med("ttfb")), lcp: Math.round(med("lcp")), cls: +med("cls").toFixed(3), load: Math.round(med("load")), requests: med("n"), kb_js: Math.round(med("js") / 1024), kb_img: Math.round(med("img") / 1024), kb_font: Math.round(med("font") / 1024), kb_doc: Math.round(med("doc") / 1024), reads: med("reads"), ops: med("ops") };
}

const results = [];
results.push(await measure("/entrar"));
await login("dona@teste.com", "senha12345");
for (const p of ["/painel", "/agenda", "/praticantes", `/praticantes/${last.joaoId}`, `/praticantes/${last.joaoId}/evolucao`, `/praticantes/${last.joaoId}/agenda`, "/pagamentos", "/colaboradores", "/jornada", "/comunicados"]) results.push(await measure(p));
await ctx.clearCookies();
await login(last.familyEmail, last.familyPass);
results.push(await measure("/familia"));
await browser.close();
console.table(results);
writeFileSync(`e2e/perf-${label}.json`, JSON.stringify(results, null, 2));
