// Cenário E2E de gestão: professor cadastra questão → admin aprova → aluno vê; denúncia e moderação;
// simulado oficial no celular. Uso: cd e2e && npm run gestao
const { chromium } = require('playwright-core');
const path = require('path');
const BASE = process.env.E2E_URL || 'http://localhost:5173'; const SHOTS = path.join(__dirname, 'shots');
require('fs').mkdirSync(SHOTS, { recursive: true });
const log = (...a) => console.log('•', ...a);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const problemas = [];
  async function sessao(email) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
    page.on('pageerror', (e) => problemas.push(e.message));
    page.on('response', (r) => r.status() >= 500 && problemas.push(`HTTP ${r.status()} ${r.url()}`));
    await page.goto(BASE + '/login');
    await page.getByLabel('E-mail').fill(email); await page.getByLabel('Senha').fill(process.env.E2E_SENHA_DEMO || 'Enahub@2026');
    await page.getByRole('button', { name: 'Entrar' }).click(); await page.getByRole('heading', { name: /Olá/ }).waitFor();
    return page;
  }
  const titulo = `Questão do professor ${Date.now()}: qual camada do modelo OSI trata do roteamento de pacotes?`;

  // Professor cadastra questão (fica pendente)
  const prof = await sessao('professor@enahub.demo');
  await prof.getByRole('link', { name: 'Gestão' }).click();
  await prof.getByRole('link', { name: '+ Nova questão' }).click();
  await prof.getByLabel('Enunciado').fill(titulo);
  await prof.getByLabel('Curso').selectOption({ label: 'Análise e Desenvolvimento de Sistemas' });
  await prof.getByLabel('Tema / área').selectOption({ label: 'Redes de Computadores' });
  await prof.getByLabel('Ano').fill('2024');
  for (const [l, t] of [['A', 'Física'], ['B', 'Enlace'], ['C', 'Rede'], ['D', 'Transporte'], ['E', 'Aplicação']]) await prof.getByLabel(`Texto da alternativa ${l}`).fill(t);
  await prof.getByLabel('Alternativa C é a correta').check();
  await prof.getByLabel('Fonte').fill('Questão autoral de teste (não oficial).');
  await prof.getByRole('button', { name: 'Cadastrar questão' }).click();
  await prof.getByText('Status:').waitFor();
  log('professor cadastrou; status na tela:', (await prof.getByText('Status:').textContent()).trim());
  const qid = prof.url().split('/').pop();
  await prof.screenshot({ path: path.join(SHOTS, '30_prof_questao_pendente.png'), fullPage: true });

  // Professor comenta questão de outro autor (RF024)
  await prof.goto(BASE + '/questoes?busca=HTTPS'); await prof.getByRole('link', { name: 'Visualizar' }).first().click();
  await prof.getByText('Gabarito comentado').waitFor();
  const antes = await prof.locator('.comentario').count();
  await prof.getByLabel('Comentário').fill('Dica do professor: HTTPS é HTTP sobre TLS (teste E2E).');
  await prof.getByRole('button', { name: 'Publicar comentário' }).click(); await prof.getByText('Comentário adicionado.').waitFor();
  await prof.waitForTimeout(300);
  log('professor comentou questão de outro autor:', (await prof.locator('.comentario').count()) === antes + 1 ? 'OK' : 'FALHOU');
  // Menu da conta fecha ao clicar fora
  await prof.getByRole('button', { name: /Menu da conta/ }).click(); await prof.locator('.dropdown-menu.show').waitFor();
  await prof.mouse.click(10, 400); await prof.waitForTimeout(150);
  log('menu da conta fecha ao clicar fora:', (await prof.locator('.dropdown-menu.show').count()) === 0 ? 'OK' : 'FALHOU');

  // Aluno não vê a pendente
  const aluno = await sessao('aluno@enahub.demo');
  await aluno.goto(`${BASE}/questoes/${qid}`); await aluno.getByRole('alert').waitFor();
  log('aluno acessando questão pendente:', (await aluno.getByRole('alert').textContent()).trim());
  log('aluno acessando /admin →', (await aluno.goto(BASE + '/admin'), await aluno.waitForURL(BASE + '/'), aluno.url().replace(BASE, '') || '/'));

  // Admin aprova
  const admin = await sessao('admin@enahub.demo');
  await admin.getByRole('link', { name: 'Administração' }).click();
  await admin.getByText(titulo.slice(0, 40)).waitFor();
  await admin.screenshot({ path: path.join(SHOTS, '31_admin_pendentes.png'), fullPage: true });
  await admin.locator('.list-group-item', { hasText: titulo.slice(0, 40) }).getByRole('button', { name: 'Aprovar' }).click();
  await admin.getByText('Questão aprovada e publicada.').waitFor();
  await aluno.goto(`${BASE}/questoes/${qid}`); await aluno.getByText('Enunciado').waitFor();
  log('após aprovação o aluno vê a questão: OK');

  // Denúncia e moderação
  await aluno.goto(BASE + '/forum'); await aluno.getByRole('link', { name: /Dúvida: ponto de equilíbrio/ }).click();
  await aluno.getByRole('button', { name: 'Denunciar' }).first().click();
  await aluno.getByRole('dialog').getByLabel(/inadequado/).fill('Conteúdo fora do tema (teste de moderação).');
  await aluno.getByRole('dialog').getByRole('button', { name: 'Enviar denúncia' }).click();
  await aluno.getByText('Denúncia enviada para análise da administração.').waitFor();
  await admin.goto(BASE + '/admin?aba=denuncias'); await admin.getByText('teste de moderação').waitFor();
  await admin.screenshot({ path: path.join(SHOTS, '32_admin_denuncias.png'), fullPage: true });
  await admin.getByRole('button', { name: 'Improcedente' }).first().click(); await admin.getByText('Denúncia arquivada.').waitFor();
  log('denúncia enviada pelo aluno e analisada pelo admin: OK');

  // Categorias (cursos e temas)
  await admin.goto(BASE + '/admin?aba=categorias'); await admin.getByRole('heading', { name: 'Temas / áreas' }).waitFor();
  await admin.getByLabel('Nome do novo tema').fill(`Tema E2E ${Date.now() % 100000}`);
  await admin.getByLabel('Curso do tema').selectOption({ label: 'Direito' });
  await admin.locator('form', { has: admin.getByLabel('Nome do novo tema') }).getByRole('button', { name: 'Adicionar' }).click();
  await admin.getByText('Categoria cadastrada.').waitFor();
  await admin.screenshot({ path: path.join(SHOTS, '34_admin_categorias.png'), fullPage: true });
  log('admin cadastrou tema em Categorias: OK');

  // Simulado oficial e mobile do simulado
  await aluno.setViewportSize({ width: 390, height: 844 });
  await aluno.goto(BASE + '/simulados');
  await aluno.locator('.border.rounded', { hasText: 'Simulado Demonstrativo — ADS' }).getByRole('button', { name: 'Iniciar' }).click();
  await aluno.getByText(/Questão 1 de 10/).waitFor();
  await aluno.screenshot({ path: path.join(SHOTS, '33_mobile_simulado_oficial.png'), fullPage: true });
  log('simulado oficial iniciado (10 questões); rolagem horizontal:', await aluno.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  await aluno.getByRole('button', { name: 'Finalizar Simulado' }).click();
  await aluno.getByRole('dialog').getByRole('button', { name: 'Finalizar', exact: true }).click();
  await aluno.getByRole('heading', { name: 'Resultado do Simulado' }).waitFor();
  log('simulado oficial finalizado sem respostas: ', (await aluno.locator('.valor-hero').allTextContents()).join(' | '));
  log('PROBLEMAS:', problemas.length ? problemas : 'nenhum');
  await browser.close();
})().catch((e) => { console.error('FALHA:', e.message.split('\n').slice(0, 6).join('\n')); process.exit(1); });
