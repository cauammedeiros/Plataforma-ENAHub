// Teste E2E da jornada completa do ENAHub: cadastro → login → questões → simulado → resultado → gabarito,
// além de finalização por tempo, desempenho, fórum, perfil, celular e administração.
// Executa no Google Chrome instalado (headless). Requer back-end + front-end rodando e o seed aplicado.
// Uso: cd e2e && npm install && npm run jornada
// Atenção: cria um usuário e um tópico de teste no banco configurado em backend/.env.
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const path = require('path');
const SHOTS = path.join(__dirname, 'shots');
require('fs').mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.E2E_URL || 'http://localhost:5173';
const email = `e2e.${Date.now()}@unifor.br`;
const senha = 'Teste2026e2e';
const sql = (q) => execFileSync('mysql', ['-u', varBanco('DB_USER'), '-N', varBanco('DB_NAME'), '-e', q], { env: { ...process.env, MYSQL_PWD: varBanco('DB_PASSWORD') } }).toString().trim();
const log = (...a) => console.log('•', ...a);

// Lê a conexão do MySQL de backend/.env (usada só para conferir dados e encurtar o prazo de um simulado)
function varBanco(nome) {
  const env = require('fs').readFileSync(path.join(__dirname, '..', 'backend', '.env'), 'utf8')
  return (env.match(new RegExp(`^${nome}=(.*)$`, 'm')) || [])[1] || ''
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: 'pt-BR' });
  const page = await ctx.newPage();
  const problemas = [];
  page.on('console', (m) => m.type() === 'error' && problemas.push('console: ' + m.text()));
  page.on('pageerror', (e) => problemas.push('pageerror: ' + e.message));
  page.on('response', (r) => r.status() >= 500 && problemas.push(`HTTP ${r.status()} ${r.url()}`));
  const foto = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true });

  // 1. Login e cadastro com validação
  await page.goto(BASE + '/');
  await page.waitForURL('**/login'); await foto('01_login');
  await page.getByRole('link', { name: 'Criar conta' }).click();
  await page.getByRole('button', { name: 'Cadastrar' }).click();
  log('erros de validação no cadastro vazio:', await page.locator('.invalid-feedback').count()); await foto('02_cadastro_validacao');
  await page.getByLabel('Nome completo').fill('Estudante E2E Teste');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByLabel('Curso').selectOption({ label: 'Análise e Desenvolvimento de Sistemas' });
  await page.getByLabel('Instituição').fill('Universidade de Fortaleza (UNIFOR)');
  await page.locator('#aceite').check();
  await page.getByRole('button', { name: 'Cadastrar' }).click();
  await page.getByRole('heading', { name: /Olá, Estudante/ }).waitFor(); await page.waitForTimeout(500); await foto('03_inicio');
  log('cadastro OK; usuário no banco:', sql(`SELECT CONCAT(perfil,' / ',LEFT(senha,7)) FROM usuarios WHERE email='${email}'`));

  // 2. Banco de questões: filtros, busca, visualização, prática, favorito
  await page.getByRole('link', { name: 'Questões', exact: true }).click();
  await page.getByText(/questões encontradas/).waitFor();
  log('banco:', await page.getByText(/questões encontradas/).textContent());
  await page.getByLabel('Curso').selectOption({ label: 'Análise e Desenvolvimento de Sistemas' });
  await page.waitForURL(/curso_id=/); await page.waitForTimeout(400);
  log('ADS:', await page.getByText(/encontrad/).textContent());
  await page.getByLabel('Dificuldade').selectOption('media');
  await page.waitForTimeout(400); log('ADS + média:', await page.getByText(/encontrad/).textContent());
  await page.getByLabel('Pesquisar questões').fill('SQL'); await page.getByRole('button', { name: 'Buscar' }).click();
  await page.waitForTimeout(400); log('busca SQL:', await page.getByText(/encontrad/).textContent(), '| URL', page.url().replace(BASE, ''));
  await foto('04_banco_filtrado');
  await page.getByLabel('Pesquisar questões').fill(''); await page.getByRole('button', { name: 'Buscar' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Favoritar questão' }).first().click();
  await page.getByText('Questão adicionada aos favoritos.').waitFor();
  await page.getByRole('link', { name: 'Visualizar' }).first().click();
  await page.getByText('Enunciado').waitFor();
  await page.locator('label.alternativa').first().click();
  await page.getByRole('button', { name: 'Responder' }).click();
  await page.locator('.alert-success, .alert-danger').first().waitFor();
  log('prática:', (await page.locator('[role=status].alert').textContent()).trim().slice(0, 60));
  await foto('05_questao_pratica');

  // 3. Simulado: configurar, responder, recarregar (persistência + tempo), finalizar
  await page.getByRole('link', { name: 'Simulados' }).click();
  await page.getByLabel('Quantidade de questões').fill('5');
  await page.getByLabel('Tempo (minutos)').fill('10');
  await foto('06_simulado_config');
  await page.getByRole('button', { name: 'Iniciar simulado' }).click();
  await page.getByText(/Questão 1 de 5/).waitFor(); await foto('07_simulado_q1');
  const simId = page.url().split('/').pop();
  for (let i = 0; i < 3; i++) {
    await page.locator('label.alternativa').nth(i % 5).click();
    await page.getByText('✓ Resposta salva').waitFor();
    await page.getByRole('button', { name: 'Próxima Questão' }).click();
  }
  const antes = await page.locator('.cronometro').textContent();
  log('cronômetro logo após iniciar (deve ser ≤ 00:10:00):', (await page.locator('.cronometro').textContent()).trim());
  log('respostas salvas no banco antes do reload:', sql(`SELECT COUNT(*) FROM respostas WHERE simulado_id=${simId}`));
  await page.waitForTimeout(2200);
  await page.reload(); await page.getByText(/Questão 1 de 5/).waitFor();
  const depois = await page.locator('.cronometro').textContent();
  log('após recarregar: respondidas =', await page.getByText(/Respondidas:/).textContent(), '| cronômetro', antes.trim(), '→', depois.trim());
  await foto('08_simulado_recarregado');
  await page.getByRole('button', { name: 'Finalizar Simulado' }).click();
  await page.getByRole('dialog').waitFor(); await foto('09_modal_finalizar');
  await page.getByRole('dialog').getByRole('button', { name: 'Finalizar', exact: true }).click();
  await page.getByRole('heading', { name: 'Resultado do Simulado' }).waitFor(); await page.waitForTimeout(300);
  log('resultado (banco):', sql(`SELECT CONCAT(acertos,' acertos, ',erros,' erros, ',em_branco,' em branco, ',percentual,'%, nota ',nota,', ',finalizado_por) FROM simulados WHERE id=${simId}`));
  log('resultado (tela):', (await page.locator('.valor-hero').allTextContents()).join(' | '));
  await foto('10_resultado');
  await page.getByRole('button', { name: 'Ver Gabarito Comentado' }).click();
  await page.getByText('Gabarito comentado').waitFor();
  log('gabarito: questões', await page.locator('article.card').count(), '| corretas marcadas', await page.locator('.alternativa.correta').count(), '| explicações', await page.locator('.comentario').count());
  await foto('11_gabarito');
  await page.goto(BASE + `/simulados/${simId}`); await page.waitForURL(`**/simulados/${simId}/resultado`);
  log('abrir simulado finalizado redireciona ao resultado: OK');

  // 4. Finalização automática por tempo no navegador
  await page.goto(BASE + '/simulados');
  await page.getByLabel('Quantidade de questões').fill('3'); await page.getByLabel('Tempo (minutos)').fill('5');
  await page.getByRole('button', { name: 'Iniciar simulado' }).click();
  await page.getByText(/Questão 1 de 3/).waitFor();
  const sim2 = page.url().split('/').pop();
  await page.locator('label.alternativa').first().click(); await page.getByText('✓ Resposta salva').waitFor();
  sql(`UPDATE simulados SET data_limite = DATE_ADD(NOW(), INTERVAL 4 SECOND) WHERE id=${sim2}`);
  await page.reload(); await page.getByText(/Questão 1 de 3/).waitFor();
  log('cronômetro com prazo encurtado:', (await page.locator('.cronometro').textContent()).trim());
  await page.getByRole('heading', { name: 'Resultado do Simulado' }).waitFor({ timeout: 15000 });
  log('auto-finalização:', sql(`SELECT CONCAT(status,' / ',finalizado_por,' / nota ',nota) FROM simulados WHERE id=${sim2}`));
  await foto('12_finalizado_por_tempo');

  // 5. Desempenho, favoritas, fórum, perfil
  await page.getByRole('link', { name: 'Desempenho' }).click();
  await page.getByText('Evolução do aproveitamento').waitFor(); await page.waitForTimeout(500);
  await page.locator('.grafico circle[tabindex="0"]').first().hover(); await page.waitForTimeout(200);
  log('tooltip do gráfico:', await page.locator('.grafico-tooltip').count() ? (await page.locator('.grafico-tooltip').textContent()) : 'NÃO apareceu');
  await foto('13_desempenho');
  await page.goto(BASE + '/favoritas'); await page.getByRole('link', { name: 'Visualizar' }).first().waitFor();
  log('favoritas:', await page.locator('.list-group-item').count());
  await page.getByRole('link', { name: 'Fórum' }).click();
  await page.getByRole('button', { name: 'Criar Tópico' }).click();
  await page.getByRole('dialog').getByLabel('Título').fill('Tópico criado pelo teste E2E');
  await page.getByRole('dialog').getByLabel('Conteúdo').fill('Conteúdo do tópico do teste ponta a ponta.');
  await page.getByRole('dialog').getByRole('button', { name: 'Publicar' }).click();
  await page.getByRole('heading', { name: 'Tópico criado pelo teste E2E' }).waitFor();
  await page.getByLabel('Sua resposta').fill('Resposta do teste E2E.'); await page.getByRole('button', { name: 'Responder' }).click();
  await page.getByText('Resposta do teste E2E.').waitFor();
  await page.getByRole('button', { name: /Curtir/ }).last().click(); await page.getByRole('button', { name: /Curtido · 1/ }).waitFor();
  log('fórum: tópico + resposta + curtida OK'); await foto('14_forum_topico');
  await page.goto(BASE + '/forum'); await page.getByText('Tópico criado pelo teste E2E').first().waitFor(); await foto('15_forum_lista');
  await page.goto(BASE + '/perfil'); await page.getByLabel('Nome completo').fill('Estudante E2E Editado');
  await page.getByRole('button', { name: 'Salvar alterações' }).click(); await page.getByText('Perfil atualizado com sucesso.').waitFor();
  await foto('16_perfil');

  // 6. Responsividade (celular)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/'); await page.getByRole('heading', { name: /Olá/ }).waitFor(); await foto('17_mobile_inicio');
  await page.getByRole('button', { name: 'Abrir menu' }).click(); await page.waitForTimeout(200); await foto('18_mobile_menu');
  await page.goto(BASE + `/simulados/${simId}/resultado`); await page.getByRole('heading', { name: 'Resultado do Simulado' }).waitFor(); await foto('19_mobile_resultado');
  const larguraExtra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  log('rolagem horizontal no celular (px):', larguraExtra);
  await page.getByRole('button', { name: 'Abrir menu' }).click(); await page.getByRole('button', { name: /^E/ }).last().click();
  await page.getByRole('button', { name: 'Sair' }).click(); await page.waitForURL('**/login');
  await page.goto(BASE + '/desempenho'); await page.waitForURL('**/login');
  log('logout OK; /desempenho sem login redireciona para', page.url().replace(BASE, ''));
  log('token antigo após logout:', await page.evaluate(() => localStorage.getItem('enahub_token')));

  // 7. Admin e professor
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.getByLabel('E-mail').fill('admin@enahub.demo'); await page.getByLabel('Senha').fill('Enahub@2026');
  await page.getByRole('button', { name: 'Entrar' }).click(); await page.getByRole('heading', { name: /Olá/ }).waitFor();
  await page.getByRole('link', { name: 'Administração' }).click(); await page.getByRole('heading', { name: 'Administração' }).waitFor();
  await page.waitForTimeout(400); await foto('20_admin_questoes');
  for (const aba of ['Usuários', 'Denúncias', 'Simulados oficiais', 'Relatórios']) {
    await page.getByRole('button', { name: aba, exact: true }).click(); await page.waitForTimeout(500);
    await foto('21_admin_' + aba.split(' ')[0].normalize('NFD').replace(/[^a-zA-Z]/g, '').toLowerCase());
  }
  log('relatórios:', (await page.locator('.valor-stat').allTextContents()).join(' | '));
  await page.goto(BASE + '/admin/questoes/nova'); await page.getByRole('heading', { name: 'Nova questão' }).waitFor();
  await page.getByRole('button', { name: 'Cadastrar questão' }).click(); await page.waitForTimeout(200);
  log('validação nova questão:', await page.locator('.is-invalid').count(), 'campos inválidos'); await foto('22_nova_questao_validacao');

  log('PROBLEMAS (console/5xx):', problemas.length ? problemas : 'nenhum');
  await browser.close();
})().catch(async (e) => { console.error('FALHA:', e.message.split('\n').slice(0, 6).join('\n')); process.exit(1); });
