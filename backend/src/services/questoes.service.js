const db = require('../database');
const AppError = require('../utils/AppError');
const catalogo = require('./catalogo.service');

const LETRAS = ['A', 'B', 'C', 'D', 'E'];
const PODE_GERENCIAR = ['professor', 'admin'];

function ehGestor(usuario) {
    return PODE_GERENCIAR.includes(usuario.perfil);
}

// Professor gerencia as próprias questões; administrador gerencia todas
function podeEditar(usuario, questao) {
    return usuario.perfil === 'admin' || (usuario.perfil === 'professor' && questao.criado_por === usuario.id);
}

/**
 * Monta o WHERE da listagem. Alunos enxergam apenas questões aprovadas;
 * professores enxergam as aprovadas e as próprias; admin enxerga todas.
 */
function montarFiltros(usuario, filtros) {
    const where = [];
    const params = [];

    if (usuario.perfil === 'admin') {
        if (filtros.status) { where.push('q.status = ?'); params.push(filtros.status); }
        else where.push("q.status <> 'arquivada'");
    } else if (usuario.perfil === 'professor') {
        if (filtros.status) {
            where.push('q.status = ?', "(q.status = 'aprovada' OR q.criado_por = ?)");
            params.push(filtros.status, usuario.id);
        } else {
            where.push("(q.status = 'aprovada' OR (q.criado_por = ? AND q.status <> 'arquivada'))");
            params.push(usuario.id);
        }
    } else {
        where.push("q.status = 'aprovada'");
    }

    if (filtros.busca) {
        where.push('(q.enunciado LIKE ? OR t.nome LIKE ?)');
        const termo = `%${filtros.busca}%`;
        params.push(termo, termo);
    }
    if (filtros.cursoId) { where.push('q.curso_id = ?'); params.push(filtros.cursoId); }
    if (filtros.ano) { where.push('q.ano = ?'); params.push(filtros.ano); }
    if (filtros.temaId) { where.push('q.tema_id = ?'); params.push(filtros.temaId); }
    if (filtros.dificuldade) { where.push('q.dificuldade = ?'); params.push(filtros.dificuldade); }
    if (filtros.favoritas) { where.push('f.id IS NOT NULL'); }
    if (filtros.minhas) { where.push('q.criado_por = ?'); params.push(usuario.id); }

    return { where: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

// RF011 — pesquisa e filtros por curso, ano, tema e dificuldade
async function listar(usuario, filtros) {
    const pagina = filtros.pagina || 1;
    const limite = filtros.limite || 10;
    const { where, params } = montarFiltros(usuario, filtros);
    const joins = `FROM questoes q
        JOIN cursos c ON c.id = q.curso_id
        LEFT JOIN temas t ON t.id = q.tema_id
        LEFT JOIN favoritos f ON f.questao_id = q.id AND f.usuario_id = ?`;

    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total ${joins} ${where}`, [usuario.id, ...params]);
    const [questoes] = await db.query(
        `SELECT q.id, q.enunciado, q.ano, q.dificuldade, q.status, q.oficial_enade, q.fonte,
                q.curso_id, c.nome AS curso, q.tema_id, t.nome AS tema, q.criado_por,
                f.id IS NOT NULL AS favorita
           ${joins} ${where}
          ORDER BY q.ano DESC, q.id DESC
          LIMIT ? OFFSET ?`,
        [usuario.id, ...params, limite, (pagina - 1) * limite]
    );

    return {
        questoes: questoes.map((q) => ({ ...q, favorita: Boolean(q.favorita), oficial_enade: Boolean(q.oficial_enade) })),
        pagina,
        limite,
        total,
        total_paginas: Math.max(1, Math.ceil(total / limite))
    };
}

async function buscarRegistro(id, conn = db) {
    const [linhas] = await conn.query('SELECT * FROM questoes WHERE id = ?', [id]);
    if (!linhas[0]) throw new AppError(404, 'Questão não encontrada.');
    return linhas[0];
}

function garantirVisivel(usuario, questao) {
    const visivel = questao.status === 'aprovada' || podeEditar(usuario, questao);
    if (!visivel) throw new AppError(404, 'Questão não encontrada.');
}

async function listarComentarios(questaoId) {
    const [comentarios] = await db.query(
        `SELECT cq.id, cq.texto, cq.imagem_url, cq.video_url, cq.criado_em, cq.usuario_id,
                u.nome AS autor, u.perfil AS autor_perfil
           FROM comentarios_questao cq
           LEFT JOIN usuarios u ON u.id = cq.usuario_id
          WHERE cq.questao_id = ?
          ORDER BY cq.criado_em`,
        [questaoId]
    );
    return comentarios;
}

/**
 * Consulta individual. A alternativa correta e os comentários (que revelam
 * a resposta) só são enviados a quem pode editar a questão.
 */
async function detalhar(usuario, id) {
    const questao = await buscarRegistro(id);
    garantirVisivel(usuario, questao);

    const [[info]] = await db.query(
        `SELECT c.nome AS curso, t.nome AS tema, u.nome AS autor,
                EXISTS(SELECT 1 FROM favoritos WHERE questao_id = ? AND usuario_id = ?) AS favorita
           FROM questoes q
           JOIN cursos c ON c.id = q.curso_id
           LEFT JOIN temas t ON t.id = q.tema_id
           LEFT JOIN usuarios u ON u.id = q.criado_por
          WHERE q.id = ?`,
        [id, usuario.id, id]
    );

    const completo = podeEditar(usuario, questao);
    const [alternativas] = await db.query(
        `SELECT id, letra, texto${completo ? ', correta' : ''} FROM alternativas WHERE questao_id = ? ORDER BY letra`,
        [id]
    );

    return {
        id: questao.id,
        enunciado: questao.enunciado,
        ano: questao.ano,
        dificuldade: questao.dificuldade,
        status: questao.status,
        oficial_enade: Boolean(questao.oficial_enade),
        fonte: questao.fonte,
        curso_id: questao.curso_id,
        curso: info.curso,
        tema_id: questao.tema_id,
        tema: info.tema,
        criado_por: questao.criado_por,
        autor: info.autor,
        favorita: Boolean(info.favorita),
        pode_editar: completo,
        alternativas: alternativas.map((a) => (completo ? { ...a, correta: Boolean(a.correta) } : a)),
        comentarios: completo ? await listarComentarios(id) : undefined
    };
}

/**
 * Modo prática: o aluno responde uma questão avulsa do banco e recebe a
 * correção com os comentários. Bloqueado para questões do simulado em andamento.
 */
async function responderPratica(usuario, id, alternativaId) {
    const questao = await buscarRegistro(id);
    garantirVisivel(usuario, questao);

    const [emSimulado] = await db.query(
        `SELECT 1 FROM simulados s
           JOIN simulado_questoes sq ON sq.simulado_id = s.id
          WHERE s.usuario_id = ? AND s.status = 'em_andamento' AND sq.questao_id = ?`,
        [usuario.id, id]
    );
    if (emSimulado[0]) {
        throw new AppError(409, 'Esta questão faz parte do seu simulado em andamento. Finalize-o para ver a correção.');
    }

    const [alternativas] = await db.query('SELECT id, letra, correta FROM alternativas WHERE questao_id = ?', [id]);
    const escolhida = alternativas.find((a) => a.id === alternativaId);
    if (!escolhida) throw new AppError(400, 'Alternativa inválida para esta questão.');
    const correta = alternativas.find((a) => a.correta);

    return {
        acertou: Boolean(escolhida.correta),
        alternativa_escolhida_id: escolhida.id,
        alternativa_correta_id: correta ? correta.id : null,
        letra_correta: correta ? correta.letra : null,
        comentarios: await listarComentarios(id)
    };
}

async function validarClassificacao(dados) {
    await catalogo.garantirCurso(dados.cursoId);
    if (dados.temaId) {
        const [temas] = await db.query('SELECT curso_id FROM temas WHERE id = ?', [dados.temaId]);
        const tema = temas[0];
        if (!tema || (tema.curso_id !== null && tema.curso_id !== dados.cursoId)) {
            throw new AppError(400, 'Tema inválido para o curso selecionado.', { tema_id: 'Tema não pertence ao curso.' });
        }
    }
}

async function salvarAlternativas(conn, questaoId, alternativas, letraCorreta) {
    // Atualiza no lugar (mesmo id) para não invalidar respostas já registradas
    for (const alt of alternativas) {
        await conn.query(
            `INSERT INTO alternativas (questao_id, letra, texto, correta) VALUES (?, ?, ?, ?) AS nova
             ON DUPLICATE KEY UPDATE texto = nova.texto, correta = nova.correta`,
            [questaoId, alt.letra, alt.texto, alt.letra === letraCorreta]
        );
    }
}

// RF006, RF007–RF010 — professores criam como "pendente"; admin publica direto
async function criar(usuario, dados) {
    await validarClassificacao(dados);
    const status = usuario.perfil === 'admin' ? 'aprovada' : 'pendente';

    const id = await db.transacao(async (conn) => {
        const [resultado] = await conn.query(
            `INSERT INTO questoes (enunciado, ano, dificuldade, curso_id, tema_id, oficial_enade, fonte,
                                   status, criado_por, aprovado_por, aprovado_em)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [dados.enunciado, dados.ano, dados.dificuldade, dados.cursoId, dados.temaId, dados.oficialEnade,
                dados.fonte, status, usuario.id,
                status === 'aprovada' ? usuario.id : null, status === 'aprovada' ? new Date() : null]
        );
        await salvarAlternativas(conn, resultado.insertId, dados.alternativas, dados.correta);
        return resultado.insertId;
    });
    return detalhar(usuario, id);
}

async function atualizar(usuario, id, dados) {
    const questao = await buscarRegistro(id);
    if (!podeEditar(usuario, questao)) throw new AppError(403, 'Você não pode editar esta questão.');
    if (questao.status === 'arquivada') throw new AppError(409, 'Questões arquivadas não podem ser editadas.');
    await validarClassificacao(dados);

    // Edição feita por professor volta para aprovação (RF031)
    const novoStatus = usuario.perfil === 'admin' ? questao.status : 'pendente';

    await db.transacao(async (conn) => {
        await conn.query(
            `UPDATE questoes SET enunciado = ?, ano = ?, dificuldade = ?, curso_id = ?, tema_id = ?,
                    oficial_enade = ?, fonte = ?, status = ?
              WHERE id = ?`,
            [dados.enunciado, dados.ano, dados.dificuldade, dados.cursoId, dados.temaId,
                dados.oficialEnade, dados.fonte, novoStatus, id]
        );
        await salvarAlternativas(conn, id, dados.alternativas, dados.correta);
    });
    return detalhar(usuario, id);
}

// RF031 — aprovação administrativa
async function alterarStatus(usuario, id, status) {
    const questao = await buscarRegistro(id);
    if (questao.status === 'arquivada') throw new AppError(409, 'Questão arquivada.');
    await db.query(
        'UPDATE questoes SET status = ?, aprovado_por = ?, aprovado_em = ? WHERE id = ?',
        [status, usuario.id, new Date(), id]
    );
    return { id, status };
}

/**
 * Exclusão respeitando a integridade referencial: se a questão já foi usada
 * em algum simulado, ela é arquivada (some do banco de questões, mas o
 * histórico e o gabarito dos alunos continuam íntegros).
 */
async function excluir(usuario, id) {
    const questao = await buscarRegistro(id);
    if (!podeEditar(usuario, questao)) throw new AppError(403, 'Você não pode excluir esta questão.');

    const [[uso]] = await db.query(
        `SELECT (SELECT COUNT(*) FROM simulado_questoes WHERE questao_id = ?)
              + (SELECT COUNT(*) FROM modelo_simulado_questoes WHERE questao_id = ?) AS total`,
        [id, id]
    );
    if (uso.total > 0) {
        await db.query("UPDATE questoes SET status = 'arquivada' WHERE id = ?", [id]);
        return { id, arquivada: true };
    }
    await db.query('DELETE FROM questoes WHERE id = ?', [id]);
    return { id, arquivada: false };
}

// RF024, RF025 — comentários/explicações com texto, imagem e vídeo
async function comentar(usuario, questaoId, { texto, imagemUrl, videoUrl }) {
    await buscarRegistro(questaoId);
    const [resultado] = await db.query(
        'INSERT INTO comentarios_questao (questao_id, usuario_id, texto, imagem_url, video_url) VALUES (?, ?, ?, ?, ?)',
        [questaoId, usuario.id, texto, imagemUrl, videoUrl]
    );
    return { id: resultado.insertId };
}

async function excluirComentario(usuario, comentarioId) {
    const [linhas] = await db.query('SELECT usuario_id FROM comentarios_questao WHERE id = ?', [comentarioId]);
    if (!linhas[0]) throw new AppError(404, 'Comentário não encontrado.');
    if (usuario.perfil !== 'admin' && linhas[0].usuario_id !== usuario.id) {
        throw new AppError(403, 'Você não pode excluir este comentário.');
    }
    await db.query('DELETE FROM comentarios_questao WHERE id = ?', [comentarioId]);
}

module.exports = {
    LETRAS, ehGestor, listar, detalhar, responderPratica, criar, atualizar,
    alterarStatus, excluir, comentar, excluirComentario, listarComentarios
};
