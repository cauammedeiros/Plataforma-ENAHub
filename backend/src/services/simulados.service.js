const db = require('../database');
const config = require('../config');
const AppError = require('../utils/AppError');
const { corrigir, arredondar } = require('../utils/pontuacao');
const { listarComentarios } = require('./questoes.service');

const TOLERANCIA_MS = config.toleranciaSimuladoSegundos * 1000;

function expirou(simulado, agora = new Date()) {
    return agora.getTime() > new Date(simulado.data_limite).getTime() + TOLERANCIA_MS;
}

async function buscarDoUsuario(conn, usuarioId, id, { bloquear = false } = {}) {
    const [linhas] = await conn.query(
        `SELECT * FROM simulados WHERE id = ? AND usuario_id = ? ${bloquear ? 'FOR UPDATE' : ''}`,
        [id, usuarioId]
    );
    if (!linhas[0]) throw new AppError(404, 'Simulado não encontrado.');
    return linhas[0];
}

/**
 * Corrige e grava o resultado de uma tentativa. Deve ser chamada dentro de
 * uma transação, com a linha do simulado bloqueada (SELECT ... FOR UPDATE).
 * O UPDATE condicionado a status = 'em_andamento' garante que a mesma
 * tentativa nunca gere dois resultados.
 */
async function finalizarNaTransacao(conn, simulado, motivo) {
    const [questoes] = await conn.query(
        `SELECT sq.questao_id, r.alternativa_id, a.correta
           FROM simulado_questoes sq
           LEFT JOIN respostas r ON r.simulado_id = sq.simulado_id AND r.questao_id = sq.questao_id
           LEFT JOIN alternativas a ON a.id = r.alternativa_id
          WHERE sq.simulado_id = ?`,
        [simulado.id]
    );

    const resultado = corrigir(questoes.map((q) => ({
        alternativaEscolhida: q.alternativa_id,
        escolhidaCorreta: Boolean(q.correta)
    })));

    // Registra o acerto de cada questão no momento da correção
    await conn.query(
        `UPDATE simulado_questoes sq
           LEFT JOIN respostas r ON r.simulado_id = sq.simulado_id AND r.questao_id = sq.questao_id
           LEFT JOIN alternativas a ON a.id = r.alternativa_id
            SET sq.acertou = a.correta
          WHERE sq.simulado_id = ?`,
        [simulado.id]
    );

    const dataFim = motivo === 'tempo' ? new Date(simulado.data_limite) : new Date();
    const [atualizacao] = await conn.query(
        `UPDATE simulados
            SET status = 'finalizado', finalizado_por = ?, data_fim = ?,
                acertos = ?, erros = ?, em_branco = ?, percentual = ?, nota = ?
          WHERE id = ? AND status = 'em_andamento'`,
        [motivo, dataFim, resultado.acertos, resultado.erros, resultado.emBranco,
            resultado.percentual, resultado.nota, simulado.id]
    );
    if (atualizacao.affectedRows !== 1) throw new AppError(409, 'Este simulado já foi finalizado.');
    return resultado;
}

/**
 * RF017 — finaliza tentativas cujo prazo terminou. Executada periodicamente
 * pelo servidor e também antes das operações do usuário.
 */
async function finalizarExpirados(usuarioId = null) {
    const limite = new Date(Date.now() - TOLERANCIA_MS);
    const [pendentes] = await db.query(
        `SELECT id, usuario_id FROM simulados
          WHERE status = 'em_andamento' AND data_limite < ? ${usuarioId ? 'AND usuario_id = ?' : ''}`,
        usuarioId ? [limite, usuarioId] : [limite]
    );

    let finalizados = 0;
    for (const { id, usuario_id: dono } of pendentes) {
        await db.transacao(async (conn) => {
            const simulado = await buscarDoUsuario(conn, dono, id, { bloquear: true });
            if (simulado.status === 'em_andamento' && expirou(simulado)) {
                await finalizarNaTransacao(conn, simulado, 'tempo');
                finalizados++;
            }
        });
    }
    return finalizados;
}

async function buscarEmAndamento(usuarioId) {
    await finalizarExpirados(usuarioId);
    const [linhas] = await db.query(
        `SELECT id, nome, quantidade_questoes, tempo_minutos, data_inicio, data_limite
           FROM simulados WHERE usuario_id = ? AND status = 'em_andamento'`,
        [usuarioId]
    );
    return linhas[0] || null;
}

async function sortearQuestoes({ quantidade, cursoId, temaId, dificuldade }) {
    const where = ["status = 'aprovada'"];
    const params = [];
    if (cursoId) { where.push('curso_id = ?'); params.push(cursoId); }
    if (temaId) { where.push('tema_id = ?'); params.push(temaId); }
    if (dificuldade) { where.push('dificuldade = ?'); params.push(dificuldade); }

    const [[{ disponiveis }]] = await db.query(
        `SELECT COUNT(*) AS disponiveis FROM questoes WHERE ${where.join(' AND ')}`, params
    );
    if (disponiveis < quantidade) {
        throw new AppError(422,
            disponiveis === 0
                ? 'Não há questões disponíveis com esses filtros.'
                : `Há apenas ${disponiveis} questão(ões) disponível(is) com esses filtros. Reduza a quantidade.`,
            { quantidade: `Máximo disponível: ${disponiveis}`, disponiveis });
    }

    // RF013 — seleção aleatória entre as questões aprovadas
    const [linhas] = await db.query(
        `SELECT id FROM questoes WHERE ${where.join(' AND ')} ORDER BY RAND() LIMIT ?`,
        [...params, quantidade]
    );
    return linhas.map((l) => l.id);
}

async function questoesDoModelo(modeloId) {
    const [modelos] = await db.query('SELECT * FROM modelos_simulado WHERE id = ? AND ativo = 1', [modeloId]);
    const modelo = modelos[0];
    if (!modelo) throw new AppError(404, 'Simulado oficial não encontrado.');

    const [linhas] = await db.query(
        `SELECT msq.questao_id FROM modelo_simulado_questoes msq
           JOIN questoes q ON q.id = msq.questao_id
          WHERE msq.modelo_id = ? AND q.status = 'aprovada'
          ORDER BY msq.ordem`,
        [modeloId]
    );
    if (!linhas.length) throw new AppError(422, 'Este simulado oficial não possui questões publicadas.');
    return { modelo, ids: linhas.map((l) => l.questao_id) };
}

// RF013–RF015 — cria a tentativa com as questões sorteadas e o prazo final
async function criar(usuario, opcoes) {
    const atual = await buscarEmAndamento(usuario.id);
    if (atual) {
        throw new AppError(409, 'Você já possui um simulado em andamento. Conclua-o antes de iniciar outro.',
            { simulado_id: atual.id });
    }

    let ids;
    let nome;
    let tempoMinutos = opcoes.tempoMinutos;
    let cursoId = opcoes.cursoId;
    let modeloId = null;

    if (opcoes.modeloId) {
        const { modelo, ids: idsModelo } = await questoesDoModelo(opcoes.modeloId);
        ids = idsModelo;
        nome = modelo.nome;
        tempoMinutos = modelo.tempo_minutos;
        cursoId = modelo.curso_id;
        modeloId = modelo.id;
    } else {
        ids = await sortearQuestoes(opcoes);
        const [cursos] = cursoId ? await db.query('SELECT nome FROM cursos WHERE id = ?', [cursoId]) : [[]];
        nome = cursos[0] ? `Simulado — ${cursos[0].nome}` : 'Simulado geral';
    }

    const inicio = new Date();
    const limite = new Date(inicio.getTime() + tempoMinutos * 60 * 1000);

    try {
        return await db.transacao(async (conn) => {
            const [resultado] = await conn.query(
                `INSERT INTO simulados (usuario_id, nome, modelo_id, curso_id, quantidade_questoes,
                                        tempo_minutos, data_inicio, data_limite, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'em_andamento')`,
                [usuario.id, nome, modeloId, cursoId || null, ids.length, tempoMinutos, inicio, limite]
            );
            const simuladoId = resultado.insertId;
            const valores = ids.map((questaoId, i) => [simuladoId, questaoId, i + 1]);
            await conn.query('INSERT INTO simulado_questoes (simulado_id, questao_id, ordem) VALUES ?', [valores]);
            return { id: simuladoId, nome, quantidade_questoes: ids.length, tempo_minutos: tempoMinutos, data_limite: limite };
        });
    } catch (erro) {
        // Índice único uk_simulados_um_em_andamento: duas requisições simultâneas
        if (erro.code === 'ER_DUP_ENTRY') throw new AppError(409, 'Você já possui um simulado em andamento.');
        throw erro;
    }
}

/**
 * Dados para resolver o simulado. Nunca inclui a alternativa correta.
 * O tempo restante é calculado no servidor (RF016: não há pausa).
 */
async function obter(usuario, id) {
    let simulado = await buscarDoUsuario(db, usuario.id, id);
    if (simulado.status === 'em_andamento' && expirou(simulado)) {
        await finalizarExpirados(usuario.id);
        simulado = await buscarDoUsuario(db, usuario.id, id);
    }

    const base = {
        id: simulado.id,
        nome: simulado.nome,
        status: simulado.status,
        quantidade_questoes: simulado.quantidade_questoes,
        tempo_minutos: simulado.tempo_minutos,
        data_inicio: simulado.data_inicio,
        data_limite: simulado.data_limite
    };
    if (simulado.status === 'finalizado') return base;

    const [questoes] = await db.query(
        `SELECT sq.ordem, q.id, q.enunciado, q.ano, q.oficial_enade, q.fonte,
                c.nome AS curso, t.nome AS tema, r.alternativa_id AS resposta
           FROM simulado_questoes sq
           JOIN questoes q ON q.id = sq.questao_id
           JOIN cursos c ON c.id = q.curso_id
           LEFT JOIN temas t ON t.id = q.tema_id
           LEFT JOIN respostas r ON r.simulado_id = sq.simulado_id AND r.questao_id = sq.questao_id
          WHERE sq.simulado_id = ?
          ORDER BY sq.ordem`,
        [id]
    );
    const [alternativas] = await db.query(
        `SELECT a.id, a.questao_id, a.letra, a.texto
           FROM alternativas a
           JOIN simulado_questoes sq ON sq.questao_id = a.questao_id
          WHERE sq.simulado_id = ?
          ORDER BY a.letra`,
        [id]
    );

    const agora = Date.now();
    return {
        ...base,
        agora: new Date(agora),
        tempo_restante_segundos: Math.max(0, Math.floor((new Date(simulado.data_limite).getTime() - agora) / 1000)),
        questoes: questoes.map((q) => ({
            ordem: q.ordem,
            id: q.id,
            enunciado: q.enunciado,
            ano: q.ano,
            oficial_enade: Boolean(q.oficial_enade),
            fonte: q.fonte,
            curso: q.curso,
            tema: q.tema,
            resposta: q.resposta,
            alternativas: alternativas
                .filter((a) => a.questao_id === q.id)
                .map(({ id: altId, letra, texto }) => ({ id: altId, letra, texto }))
        }))
    };
}

// RF018 — salvamento automático (cada clique grava/atualiza a resposta)
async function salvarResposta(usuario, simuladoId, questaoId, alternativaId) {
    const situacao = await db.transacao(async (conn) => {
        const simulado = await buscarDoUsuario(conn, usuario.id, simuladoId, { bloquear: true });
        if (simulado.status !== 'em_andamento') return 'finalizado';
        if (expirou(simulado)) {
            await finalizarNaTransacao(conn, simulado, 'tempo');
            return 'expirado';
        }

        const [pertence] = await conn.query(
            'SELECT 1 FROM simulado_questoes WHERE simulado_id = ? AND questao_id = ?', [simuladoId, questaoId]
        );
        if (!pertence[0]) throw new AppError(400, 'Esta questão não faz parte do simulado.');

        if (alternativaId === null) {
            await conn.query('DELETE FROM respostas WHERE simulado_id = ? AND questao_id = ?', [simuladoId, questaoId]);
            return 'ok';
        }

        const [alternativa] = await conn.query(
            'SELECT 1 FROM alternativas WHERE id = ? AND questao_id = ?', [alternativaId, questaoId]
        );
        if (!alternativa[0]) throw new AppError(400, 'Alternativa inválida para esta questão.');

        await conn.query(
            `INSERT INTO respostas (simulado_id, questao_id, alternativa_id, respondida_em) VALUES (?, ?, ?, ?) AS nova
             ON DUPLICATE KEY UPDATE alternativa_id = nova.alternativa_id, respondida_em = nova.respondida_em`,
            [simuladoId, questaoId, alternativaId, new Date()]
        );
        return 'ok';
    });

    if (situacao === 'finalizado') {
        throw new AppError(409, 'Este simulado já foi finalizado. As respostas não podem ser alteradas.', { finalizado: true });
    }
    if (situacao === 'expirado') {
        throw new AppError(409, 'O tempo do simulado terminou. Ele foi finalizado automaticamente.', { finalizado: true });
    }
    return { questao_id: questaoId, alternativa_id: alternativaId };
}

/**
 * Finalização manual (ou disparada pelo cronômetro do navegador).
 * Idempotente: chamar de novo devolve o mesmo resultado, sem recalcular.
 */
async function finalizar(usuario, id) {
    return db.transacao(async (conn) => {
        const simulado = await buscarDoUsuario(conn, usuario.id, id, { bloquear: true });
        if (simulado.status === 'finalizado') {
            return { id, ja_finalizado: true, finalizado_por: simulado.finalizado_por };
        }
        const motivo = Date.now() >= new Date(simulado.data_limite).getTime() ? 'tempo' : 'usuario';
        await finalizarNaTransacao(conn, simulado, motivo);
        return { id, ja_finalizado: false, finalizado_por: motivo };
    });
}

// RF019 + RF023 — resultado, desempenho por tema e gabarito comentado
async function resultado(usuario, id) {
    let simulado = await buscarDoUsuario(db, usuario.id, id);
    if (simulado.status === 'em_andamento') {
        if (!expirou(simulado)) {
            throw new AppError(409, 'O gabarito fica disponível após a finalização do simulado.');
        }
        await finalizarExpirados(usuario.id);
        simulado = await buscarDoUsuario(db, usuario.id, id);
    }

    const [questoes] = await db.query(
        `SELECT sq.ordem, sq.acertou, q.id, q.enunciado, q.ano, q.dificuldade, q.oficial_enade, q.fonte,
                c.nome AS curso, t.nome AS tema, r.alternativa_id AS resposta
           FROM simulado_questoes sq
           JOIN questoes q ON q.id = sq.questao_id
           JOIN cursos c ON c.id = q.curso_id
           LEFT JOIN temas t ON t.id = q.tema_id
           LEFT JOIN respostas r ON r.simulado_id = sq.simulado_id AND r.questao_id = sq.questao_id
          WHERE sq.simulado_id = ?
          ORDER BY sq.ordem`,
        [id]
    );
    const [alternativas] = await db.query(
        `SELECT a.id, a.questao_id, a.letra, a.texto, a.correta
           FROM alternativas a
           JOIN simulado_questoes sq ON sq.questao_id = a.questao_id
          WHERE sq.simulado_id = ?
          ORDER BY a.letra`,
        [id]
    );

    // Desempenho por tema
    const temas = new Map();
    for (const q of questoes) {
        const nomeTema = q.tema || 'Sem tema';
        const item = temas.get(nomeTema) || { tema: nomeTema, total: 0, acertos: 0 };
        item.total++;
        if (q.acertou) item.acertos++;
        temas.set(nomeTema, item);
    }

    // Comparação: percentual de tentativas de outros alunos com resultado inferior
    const [[comparativo]] = await db.query(
        `SELECT COUNT(*) AS total, SUM(percentual < ?) AS abaixo
           FROM simulados WHERE status = 'finalizado' AND usuario_id <> ?`,
        [simulado.percentual, usuario.id]
    );

    const gabarito = [];
    for (const q of questoes) {
        gabarito.push({
            ordem: q.ordem,
            id: q.id,
            enunciado: q.enunciado,
            ano: q.ano,
            dificuldade: q.dificuldade,
            oficial_enade: Boolean(q.oficial_enade),
            fonte: q.fonte,
            curso: q.curso,
            tema: q.tema,
            resposta: q.resposta,
            acertou: q.acertou === null ? null : Boolean(q.acertou),
            alternativas: alternativas
                .filter((a) => a.questao_id === q.id)
                .map((a) => ({ id: a.id, letra: a.letra, texto: a.texto, correta: Boolean(a.correta) })),
            comentarios: await listarComentarios(q.id)
        });
    }

    const duracaoMs = new Date(simulado.data_fim).getTime() - new Date(simulado.data_inicio).getTime();
    return {
        id: simulado.id,
        nome: simulado.nome,
        status: simulado.status,
        data_inicio: simulado.data_inicio,
        data_fim: simulado.data_fim,
        finalizado_por: simulado.finalizado_por,
        tempo_minutos: simulado.tempo_minutos,
        duracao_segundos: Math.max(0, Math.round(duracaoMs / 1000)),
        total: simulado.quantidade_questoes,
        acertos: simulado.acertos,
        erros: simulado.erros,
        em_branco: simulado.em_branco,
        percentual: Number(simulado.percentual),
        nota: Number(simulado.nota),
        superior_a_percentual: comparativo.total > 0
            ? arredondar((Number(comparativo.abaixo) / comparativo.total) * 100)
            : null,
        por_tema: [...temas.values()].map((t) => ({ ...t, percentual: arredondar((t.acertos / t.total) * 100) })),
        gabarito
    };
}

// RF020 — histórico de simulados do usuário
async function historico(usuarioId) {
    await finalizarExpirados(usuarioId);
    const [linhas] = await db.query(
        `SELECT id, nome, status, quantidade_questoes, tempo_minutos, data_inicio, data_fim, finalizado_por,
                acertos, erros, em_branco, percentual, nota
           FROM simulados WHERE usuario_id = ?
          ORDER BY data_inicio DESC, id DESC`,
        [usuarioId]
    );
    return linhas.map((s) => ({
        ...s,
        percentual: s.percentual === null ? null : Number(s.percentual),
        nota: s.nota === null ? null : Number(s.nota)
    }));
}

// RF032 — simulados oficiais disponíveis para os alunos
async function listarModelos({ incluirInativos = false } = {}) {
    const [modelos] = await db.query(
        `SELECT m.id, m.nome, m.descricao, m.tempo_minutos, m.ativo, m.curso_id, c.nome AS curso,
                (SELECT COUNT(*) FROM modelo_simulado_questoes msq
                   JOIN questoes q ON q.id = msq.questao_id AND q.status = 'aprovada'
                  WHERE msq.modelo_id = m.id) AS quantidade_questoes
           FROM modelos_simulado m LEFT JOIN cursos c ON c.id = m.curso_id
          ${incluirInativos ? '' : 'WHERE m.ativo = 1'}
          ORDER BY m.criado_em DESC`
    );
    return modelos.map((m) => ({ ...m, ativo: Boolean(m.ativo) }));
}

async function criarModelo(usuario, { nome, descricao, cursoId, tempoMinutos, questaoIds }) {
    const unicos = [...new Set(questaoIds)];
    const [validas] = await db.query(
        "SELECT id FROM questoes WHERE id IN (?) AND status = 'aprovada'", [unicos]
    );
    if (validas.length !== unicos.length) {
        throw new AppError(400, 'Todas as questões precisam existir e estar aprovadas.', { questao_ids: 'Questões inválidas.' });
    }
    return db.transacao(async (conn) => {
        const [resultado] = await conn.query(
            `INSERT INTO modelos_simulado (nome, descricao, curso_id, tempo_minutos, criado_por)
             VALUES (?, ?, ?, ?, ?)`,
            [nome, descricao, cursoId, tempoMinutos, usuario.id]
        );
        const valores = unicos.map((questaoId, i) => [resultado.insertId, questaoId, i + 1]);
        await conn.query('INSERT INTO modelo_simulado_questoes (modelo_id, questao_id, ordem) VALUES ?', [valores]);
        return { id: resultado.insertId };
    });
}

async function alterarModelo(id, ativo) {
    const [resultado] = await db.query('UPDATE modelos_simulado SET ativo = ? WHERE id = ?', [ativo, id]);
    if (!resultado.affectedRows) throw new AppError(404, 'Simulado oficial não encontrado.');
    return { id, ativo };
}

module.exports = {
    criar, obter, salvarResposta, finalizar, resultado, historico,
    buscarEmAndamento, finalizarExpirados, listarModelos, criarModelo, alterarModelo
};
