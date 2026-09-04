// Gera os ícones do PWA a partir de um SVG usando o Chromium do Playwright.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const svg = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${pad ? 0 : 112}" fill="#2f6549"/>
  <g transform="translate(256 268) scale(${pad ? 0.72 : 0.9}) translate(-256 -268)">
    <!-- ferradura -->
    <path d="M166 396 V262 a90 90 0 0 1 180 0 V396" fill="none" stroke="#f5f0e7" stroke-width="58" stroke-linecap="round"/>
    <g fill="#2f6549">
      <circle cx="166" cy="330" r="9"/><circle cx="166" cy="378" r="9"/>
      <circle cx="346" cy="330" r="9"/><circle cx="346" cy="378" r="9"/>
      <circle cx="196" cy="216" r="9"/><circle cx="316" cy="216" r="9"/>
    </g>
  </g>
</svg>`;

mkdirSync("public/icons", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
for (const [file, size, pad] of [["icon-512.png", 512, false], ["icon-192.png", 192, false], ["icon-512-maskable.png", 512, true]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(pad).replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
  const buf = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  writeFileSync(`public/icons/${file}`, buf);
  console.log("wrote", file);
}
await browser.close();
