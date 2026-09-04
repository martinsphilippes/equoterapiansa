// Fumaça Fases 2–5: praticante → responsável (acesso) → agenda → atendimento → avaliações → evolução → relatório → família → comunicados → painel → auditoria.
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const exe = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const RUN = Date.now().toString(36);
const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
const step = (s) => console.log("✓", s);
const today = new Date().toISOString().slice(0, 10);
async function login(p, email, pass) {
  await p.goto(BASE + "/entrar");
  await p.fill('input[type="email"]', email);
  await p.fill('input[type="password"]', pass);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 60000, waitUntil: "commit" });
}
try {
  await login(page, "dona@teste.com", "senha12345");
  step("login dona");

  // Profissional: colaborador com função de atendimento + acesso
  await page.goto(BASE + "/colaboradores/novo");
  await page.fill('input[name="name"]', "Ana Fisio " + RUN);
  await page.fill('input[name="email"]', `ana.${RUN}@teste.com`);
  await page.selectOption('select[name="jobRoleId"]', { label: "Fisioterapeuta" });
  await page.click('button:has-text("Cadastrar colaborador")');
  await page.waitForURL((u) => /\/colaboradores\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/novo"), { timeout: 60000 });
  const anaId = page.url().split("/").pop();
  await page.goto(`${BASE}/colaboradores/${anaId}/acesso`);
  await page.selectOption('select[name="role"]', "professional");
  await page.fill('input[name="password"]', "ana12345678");
  await page.click('button:has-text("Criar acesso")');
  await page.waitForSelector("text=Acesso criado", { timeout: 30000 });
  step("profissional criada com acesso");

  // Praticante
  await page.goto(BASE + "/praticantes/novo");
  await page.fill('input[name="name"]', "João Silva " + RUN);
  await page.fill('input[name="birthDate"]', "2018-03-10");
  await page.fill('input[name="entryDate"]', "2026-01-15");
  await page.fill('textarea[name="importantInfo"]', "Usa capacete próprio.");
  await page.check(`input[name="professionalIds"][value="${anaId}"]`);
  await page.click('button:has-text("Cadastrar praticante")');
  await page.waitForURL((u) => /\/praticantes\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/novo"), { timeout: 60000 });
  const joaoId = page.url().split("/").pop();
  await page.waitForSelector("text=8 anos");
  step("praticante criado " + joaoId);

  // Documento do praticante (upload via emulador de Storage)
  writeFileSync("/tmp/claude-0/-home-user-equoterapiansa/67a993cc-8f66-5819-922c-3b8bf24f491d/scratchpad/laudo.pdf", "%PDF-1.4\n% teste\n");
  await page.goto(`${BASE}/praticantes/${joaoId}/documentos`);
  await page.click('button:has-text("Enviar documento")');
  const laudoVal = await page.$eval('select[name="typeId"]', (sel) => Array.from(sel.options).find((o) => o.textContent.includes("Laudo")).value);
  await page.selectOption('select[name="typeId"]', laudoVal);
  await page.setInputFiles('input[name="file"]', "/tmp/claude-0/-home-user-equoterapiansa/67a993cc-8f66-5819-922c-3b8bf24f491d/scratchpad/laudo.pdf");
  await page.fill('input[name="expiresAt"]', "2027-12-31");
  await page.click('form button:has-text("Enviar")');
  await page.waitForSelector("text=laudo.pdf", { timeout: 60000 });
  const dl = await page.request.get(`${BASE}/api/files/` + (await page.getAttribute('a[href^="/api/files/"]', "href")).split("/").pop());
  if (dl.status() !== 200) throw new Error("download status " + dl.status());
  step("documento enviado e baixado");

  // Responsável + acesso
  await page.goto(`${BASE}/responsaveis/novo?praticante=${joaoId}`);
  await page.fill('input[name="name"]', "Maria Silva " + RUN);
  await page.fill('input[name="email"]', `maria.${RUN}@teste.com`);
  await page.fill('input[name="phone"]', "11999990000");
  await page.click('button:has-text("Cadastrar responsável")');
  await page.waitForURL(/\/praticantes\/.*\/responsaveis/, { timeout: 60000 });
  await page.waitForSelector(`text=Maria Silva ${RUN}`);
  await page.click(`text=Maria Silva ${RUN}`);
  await page.waitForURL(/\/responsaveis\/[^/]+$/);
  await page.fill('input[name="password"]', "maria12345");
  await page.click('button:has-text("Liberar acesso")');
  await page.waitForSelector("text=Acesso criado", { timeout: 30000 });
  step("responsável criada com acesso");

  // Segundo praticante (não vinculado à Maria) para testar isolamento
  await page.goto(BASE + "/praticantes/novo");
  await page.fill('input[name="name"]', "Outro Praticante " + RUN);
  await page.click('button:has-text("Cadastrar praticante")');
  await page.waitForURL((u) => /\/praticantes\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/novo"), { timeout: 60000 });
  const outroId = page.url().split("/").pop();

  // Agendamento (hoje) + repetição
  await page.goto(`${BASE}/agenda/novo?praticante=${joaoId}`);
  await page.selectOption('select[name="professionalId"]', anaId);
  await page.fill('input[name="date"]', today);
  await page.fill('input[name="startTime"]', "09:00");
  await page.selectOption('select[name="repeatWeeks"]', "2");
  await page.click('button:has-text("Agendar")');
  await page.waitForURL(/\/praticantes\/.*\/agenda/, { timeout: 60000 });
  await page.waitForSelector("text=09:00");
  step("agendamentos criados");

  // Registrar atendimento a partir do agendamento (como dona)
  await page.goto(`${BASE}/agenda?data=${today}`);
  await page.click('a:has-text("Registrar")');
  await page.waitForURL(/atendimentos\/novo/);
  await page.click('button:has-text("Montaria")');
  await page.fill('textarea[name="objective"]', "Controle postural");
  await page.fill('textarea[name="evolution"]', "Manteve o tronco alinhado por mais tempo.");
  await page.click('button:has-text("Salvar atendimento")');
  await page.waitForURL(/agenda/, { timeout: 60000 });
  await page.waitForSelector("text=Realizado");
  step("atendimento registrado");

  // Avaliação inicial
  await page.goto(`${BASE}/praticantes/${joaoId}/avaliacoes/nova`);
  await page.selectOption('select[name="professionalId"]', anaId);
  await page.fill('input[name="date"]', "2026-01-15");
  const btns = await page.$$('li button[title]');
  // dá nota 2 em todos os itens
  for (const b of btns) { if ((await b.textContent()) === "2") await b.click(); }
  await page.click('button:has-text("Salvar avaliação")');
  await page.waitForURL(/avaliacoes\/[^/]+$/, { timeout: 60000 });
  await page.waitForSelector("text=Avaliação inicial");
  step("avaliação inicial (todas 2)");

  // Avaliação periódica
  await page.goto(`${BASE}/praticantes/${joaoId}/avaliacoes/nova`);
  await page.selectOption('select[name="professionalId"]', anaId);
  await page.fill('input[name="date"]', today);
  const btns2 = await page.$$('li button[title]');
  for (const b of btns2) { if ((await b.textContent()) === "4") await b.click(); }
  await page.click('button:has-text("+ observação")');
  await page.fill('li textarea', "Realiza grande parte dos exercícios com maior estabilidade.");
  await page.click('button:has-text("Salvar avaliação")');
  await page.waitForURL(/avaliacoes\/[^/]+$/, { timeout: 60000 });
  await page.waitForSelector("text=Avaliação periódica");
  step("avaliação periódica (todas 4)");

  // Evolução + comparativo
  await page.goto(`${BASE}/praticantes/${joaoId}/evolucao`);
  await page.waitForSelector("text=+2");
  await page.waitForSelector("text=+100%");
  await page.screenshot({ path: "e2e/shot-evolucao.png", fullPage: true });
  step("evolução e comparativo (+2, +100%)");

  // Relatório
  await page.goto(`${BASE}/praticantes/${joaoId}/relatorios`);
  await page.fill('textarea[name="conclusion"]', "Evolução consistente em todas as áreas.");
  await page.check('input[name="sharedWithGuardians"]');
  await page.click('button:has-text("Gerar relatório")');
  await page.waitForURL(/relatorios\/[^/]+$/, { timeout: 60000 });
  await page.waitForSelector("text=Evolução consistente");
  await page.screenshot({ path: "e2e/shot-relatorio.png", fullPage: true });
  step("relatório gerado e compartilhado");

  // Comunicado para o praticante
  await page.goto(BASE + "/comunicados/novo");
  await page.selectOption('select[name="audience"]', "practitioner");
  await page.selectOption('select[name="practitionerId"]', joaoId);
  await page.fill('input[name="title"]', "Horário alterado " + RUN);
  await page.fill('textarea[name="body"]', "O atendimento de sexta passa para 16h.");
  await page.click('button:has-text("Enviar comunicado")');
  await page.waitForURL(/comunicados$/, { timeout: 60000 });
  await page.waitForSelector("text=Horário alterado " + RUN);
  step("comunicado enviado");

  // Painel + auditoria + histórico
  await page.goto(BASE + "/painel");
  await page.waitForSelector("text=Atendimentos hoje");
  await page.screenshot({ path: "e2e/shot-painel-desktop.png", fullPage: true });
  await page.goto(BASE + "/auditoria");
  await page.waitForSelector("text=assessment.create");
  await page.goto(`${BASE}/praticantes/${joaoId}/historico`);
  await page.waitForSelector("text=Entrada na instituição");
  await page.waitForSelector("text=Avaliação inicial");
  step("painel, auditoria e linha do tempo");

  // Família (Maria)
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx2.newPage();
  p2.on("pageerror", (e) => console.log("PAGEERROR2", e.message));
  await login(p2, `maria.${RUN}@teste.com`, "maria12345");
  await p2.waitForURL(/conta/, { waitUntil: "commit" });
  await p2.fill('input[name="password"]', "maria123456");
  await p2.fill('input[name="confirm"]', "maria123456");
  await p2.click('button:has-text("Salvar nova senha")');
  await p2.waitForURL(/entrar/);
  await login(p2, `maria.${RUN}@teste.com`, "maria123456");
  await p2.waitForURL(/familia/, { timeout: 30000, waitUntil: "commit" });
  await p2.waitForSelector(`text=João Silva ${RUN}`);
  await p2.waitForSelector("text=/comunicados? novos?/");
  await p2.screenshot({ path: "e2e/shot-familia.png", fullPage: true });
  await p2.goto(`${BASE}/familia/${joaoId}/evolucao`);
  await p2.waitForSelector("text=+2");
  await p2.goto(`${BASE}/familia/${joaoId}/relatorios`);
  await p2.click("text=Relatório de evolução");
  await p2.waitForSelector("text=Evolução consistente");
  // isolamento: outro praticante e área administrativa
  await p2.goto(`${BASE}/familia/${outroId}/agenda`);
  await p2.waitForURL((u) => u.pathname === "/familia", { timeout: 30000 });
  await p2.goto(`${BASE}/praticantes/${joaoId}`);
  await p2.waitForURL(/familia/, { timeout: 30000, waitUntil: "commit" });
  const forbidden = await p2.request.get(`${BASE}/praticantes/${outroId}`, { maxRedirects: 0 });
  if (forbidden.status() !== 307 && forbidden.status() !== 302) throw new Error("guardian reached staff page: " + forbidden.status());
  await p2.goto(`${BASE}/familia/comunicados`);
  await p2.waitForSelector("text=Horário alterado " + RUN);
  await p2.click('button:has-text("Marcar como lido")');
  await p2.waitForSelector("text=Marcar como lido", { state: "detached", timeout: 30000 });
  step("família: acesso restrito ao próprio praticante, relatório, comunicados");
  await ctx2.close();

  // Profissional (Ana): vê apenas João; registra avaliação própria; não acessa equipe
  const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p3 = await ctx3.newPage();
  await login(p3, `ana.${RUN}@teste.com`, "ana12345678");
  await p3.waitForURL(/conta/, { waitUntil: "commit" });
  await p3.fill('input[name="password"]', "ana123456789");
  await p3.fill('input[name="confirm"]', "ana123456789");
  await p3.click('button:has-text("Salvar nova senha")');
  await p3.waitForURL(/entrar/);
  await login(p3, `ana.${RUN}@teste.com`, "ana123456789");
  await p3.goto(BASE + "/praticantes");
  await p3.waitForSelector(`text=João Silva ${RUN}`);
  if (await p3.$(`text=Outro Praticante ${RUN}`)) throw new Error("professional sees unassigned practitioner");
  const r = await p3.request.get(`${BASE}/praticantes/${outroId}`);
  if (r.status() !== 404) throw new Error("professional reached unassigned practitioner: " + r.status());
  await p3.goto(BASE + "/colaboradores");
  await p3.waitForURL(/sem-permissao/);
  await p3.screenshot({ path: "e2e/shot-profissional.png", fullPage: true });
  step("profissional: escopo restrito");
  await ctx3.close();

  // Encerramento
  await page.goto(`${BASE}/praticantes/${joaoId}/encerrar`);
  await page.fill('input[name="reason"]', "Objetivos alcançados");
  await page.check('input[name="shareReport"]');
  page.once("dialog", (d) => d.accept());
  await page.click('button:has-text("Encerrar acompanhamento")');
  await page.waitForURL(new RegExp(`/praticantes/${joaoId}$`), { timeout: 60000 });
  await page.waitForSelector("text=Encerrado");
  await page.waitForSelector("text=Ver relatório final");
  step("encerramento com relatório final");

  console.log("PHASE2-5 OK");
} catch (e) {
  console.log("FAIL", e.message);
  await page.screenshot({ path: "e2e/shot-fail.png", fullPage: true });
  process.exitCode = 1;
} finally {
  await browser.close();
}
