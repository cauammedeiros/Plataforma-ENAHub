/**
 * Popula o banco com dados de DEMONSTRAÇÃO (cursos, temas, instituições,
 * usuários de teste, questões demonstrativas, fórum e simulados de exemplo).
 *
 * É idempotente: pode ser executado várias vezes sem duplicar registros.
 * As questões são marcadas como não oficiais (oficial_enade = 0) e trazem
 * na fonte o aviso de que foram elaboradas pela equipe.
 *
 * Uso: npm run db:seed
 */
const path = require('path');
const config = require('../src/config');
const db = require('../src/database');
const senhaUtil = require('../src/utils/senha');
const simulados = require('../src/services/simulados.service');

const dados = require(path.join(__dirname, '..', '..', 'database', 'seeds', 'dados_demonstracao.json'));

const SENHA_DEMO = process.env.SEED_SENHA || 'Enahub@2026';
const fonteDemo = (codigo) =>
    `Questão demonstrativa elaborada pela equipe ENAHub (${codigo}). Não é questão oficial do ENADE.`;

async function obterId(sqlBusca, paramsBusca, sqlInsert, paramsInsert) {
    const [linhas] = await db.query(sqlBusca, paramsBusca);
    if (linhas[0]) return { id: linhas[0].id, criado: false };
    const [resultado] = await db.query(sqlInsert, paramsInsert);
    return { id: resultado.insertId, criado: true };
}

async function seed({ silencioso = false } = {}) {
    if (config.ambiente === 'production') throw new Error('Seed de demonstração bloqueado em produção.');
    const log = silencioso ? () => {} : console.log;
    const contagem = { instituicoes: 0, cursos: 0, temas: 0, usuarios: 0, questoes: 0, topicos: 0, simulados: 0 };

    const instituicoes = {};
    for (const nome of dados.instituicoes) {
        const r = await obterId('SELECT id FROM instituicoes WHERE nome = ?', [nome],
            'INSERT INTO instituicoes (nome) VALUES (?)', [nome]);
        instituicoes[nome] = r.id;
        if (r.criado) contagem.instituicoes++;
    }

    const cursos = {};
    const temas = {};
    for (const [nomeCurso, listaTemas] of Object.entries(dados.cursos)) {
        const r = await obterId('SELECT id FROM cursos WHERE nome = ?', [nomeCurso],
            'INSERT INTO cursos (nome) VALUES (?)', [nomeCurso]);
        cursos[nomeCurso] = r.id;
        if (r.criado) contagem.cursos++;
        for (const nomeTema of listaTemas) {
            const t = await obterId('SELECT id FROM temas WHERE nome = ? AND curso_id = ?', [nomeTema, r.id],
                'INSERT INTO temas (nome, curso_id) VALUES (?, ?)', [nomeTema, r.id]);
            temas[`${nomeCurso}|${nomeTema}`] = t.id;
            if (t.criado) contagem.temas++;
        }
    }

    const usuarios = {};
    const hash = await senhaUtil.gerarHash(SENHA_DEMO);
    for (const u of dados.usuarios) {
        const r = await obterId('SELECT id FROM usuarios WHERE email = ?', [u.email],
            `INSERT INTO usuarios (nome, email, senha, perfil, curso_id, instituicao_id, aceitou_termos_em)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [u.nome, u.email, hash, u.perfil, cursos[u.curso], instituicoes[u.instituicao], new Date()]);
        usuarios[u.email] = { id: r.id, perfil: u.perfil };
        if (r.criado) contagem.usuarios++;
    }

    const autorQuestoes = usuarios['admin@enahub.demo'].id;
    const questoesPorCodigo = {};
    for (const q of dados.questoes) {
        const fonte = fonteDemo(q.codigo);
        const [existente] = await db.query('SELECT id FROM questoes WHERE fonte = ?', [fonte]);
        if (existente[0]) { questoesPorCodigo[q.codigo] = existente[0].id; continue; }

        const id = await db.transacao(async (conn) => {
            const [resultado] = await conn.query(
                `INSERT INTO questoes (enunciado, ano, dificuldade, curso_id, tema_id, oficial_enade, fonte,
                                       status, criado_por, aprovado_por, aprovado_em)
                 VALUES (?, ?, ?, ?, ?, 0, ?, 'aprovada', ?, ?, ?)`,
                [q.enunciado, q.ano, q.dificuldade, cursos[q.curso], temas[`${q.curso}|${q.tema}`], fonte,
                    autorQuestoes, autorQuestoes, new Date()]
            );
            const letras = ['A', 'B', 'C', 'D', 'E'];
            for (let i = 0; i < 5; i++) {
                await conn.query('INSERT INTO alternativas (questao_id, letra, texto, correta) VALUES (?, ?, ?, ?)',
                    [resultado.insertId, letras[i], q.alternativas[i], letras[i] === q.correta]);
            }
            await conn.query('INSERT INTO comentarios_questao (questao_id, usuario_id, texto) VALUES (?, ?, ?)',
                [resultado.insertId, usuarios['professor@enahub.demo'].id, q.comentario]);
            return resultado.insertId;
        });
        questoesPorCodigo[q.codigo] = id;
        contagem.questoes++;
    }

    for (const t of dados.topicos) {
        const [existente] = await db.query('SELECT id FROM topicos WHERE titulo = ?', [t.titulo]);
        if (existente[0]) continue;
        const [resultado] = await db.query('INSERT INTO topicos (titulo, conteudo, usuario_id) VALUES (?, ?, ?)',
            [t.titulo, t.conteudo, usuarios[t.autor].id]);
        for (const r of t.respostas) {
            await db.query('INSERT INTO respostas_forum (topico_id, usuario_id, conteudo) VALUES (?, ?, ?)',
                [resultado.insertId, usuarios[r.autor].id, r.conteudo]);
        }
        contagem.topicos++;
    }

    // Simulado oficial de demonstração (RF032)
    const [modelos] = await db.query("SELECT id FROM modelos_simulado WHERE nome = 'Simulado Demonstrativo — ADS'");
    if (!modelos[0]) {
        await simulados.criarModelo(usuarios['admin@enahub.demo'], {
            nome: 'Simulado Demonstrativo — ADS',
            descricao: 'Simulado montado pela administração com 10 questões demonstrativas de ADS (não oficiais).',
            cursoId: cursos['Análise e Desenvolvimento de Sistemas'],
            tempoMinutos: 30,
            questaoIds: Array.from({ length: 10 }, (_, i) => questoesPorCodigo[`DEMO-ADS-${String(i + 1).padStart(2, '0')}`])
        });
    }

    // Simulados finalizados de outros alunos, para o ranking e os relatórios.
    // Usa as próprias regras do sistema (criar → responder → finalizar).
    const exemplos = [
        { email: 'bruna@enahub.demo', cursoId: cursos['Análise e Desenvolvimento de Sistemas'], quantidade: 8, acertar: 6 },
        { email: 'rafael@enahub.demo', cursoId: cursos['Administração'], quantidade: 8, acertar: 5 }
    ];
    for (const ex of exemplos) {
        const usuario = usuarios[ex.email];
        const [feitos] = await db.query('SELECT id FROM simulados WHERE usuario_id = ?', [usuario.id]);
        if (feitos.length) continue;

        const criado = await simulados.criar(usuario, { quantidade: ex.quantidade, tempoMinutos: 20, cursoId: ex.cursoId });
        const prova = await simulados.obter(usuario, criado.id);
        for (const [i, questao] of prova.questoes.entries()) {
            const [alternativas] = await db.query(
                'SELECT id, correta FROM alternativas WHERE questao_id = ? ORDER BY letra', [questao.id]
            );
            // Acerta as primeiras questões, erra as seguintes e deixa a última em branco
            if (i === prova.questoes.length - 1) continue;
            const escolhida = i < ex.acertar ? alternativas.find((a) => a.correta) : alternativas.find((a) => !a.correta);
            await simulados.salvarResposta(usuario, criado.id, questao.id, escolhida.id);
        }
        await simulados.finalizar(usuario, criado.id);
        contagem.simulados++;
    }

    log('✔ Seed de demonstração concluído:', contagem);
    // A senha só é exibida quando é a senha pública da demonstração local
    const senhaExibida = process.env.SEED_SENHA ? 'definida em SEED_SENHA' : `"${SENHA_DEMO}"`;
    log(`  Usuários de teste (senha ${senhaExibida}): ${dados.usuarios.map((u) => u.email).join(', ')}`);
}

if (require.main === module) {
    seed()
        .catch((erro) => {
            console.error('✖', erro.message);
            process.exitCode = 1;
        })
        .finally(() => db.end());
}

module.exports = { seed };
