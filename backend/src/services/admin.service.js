const db = require('../database');
const AppError = require('../utils/AppError');
const { arredondar } = require('../utils/pontuacao');

// RF030 — gerenciamento de usuários
async function listarUsuarios({ busca, perfil }) {
    const where = [];
    const params = [];
    if (busca) { where.push('(u.nome LIKE ? OR u.email LIKE ?)'); params.push(`%${busca}%`, `%${busca}%`); }
    if (perfil) { where.push('u.perfil = ?'); params.push(perfil); }
    const [usuarios] = await db.query(
        `SELECT u.id, u.nome, u.email, u.perfil, u.bloqueado, u.criado_em, u.ultimo_acesso,
                c.nome AS curso, i.nome AS instituicao,
                (SELECT COUNT(*) FROM simulados s WHERE s.usuario_id = u.id AND s.status = 'finalizado') AS simulados
           FROM usuarios u
           LEFT JOIN cursos c ON c.id = u.curso_id
           LEFT JOIN instituicoes i ON i.id = u.instituicao_id
          ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
          ORDER BY u.criado_em DESC, u.id DESC
          LIMIT 200`,
        params
    );
    return usuarios.map((u) => ({ ...u, bloqueado: Boolean(u.bloqueado) }));
}

async function atualizarUsuario(admin, id, { bloqueado, perfil }) {
    if (id === admin.id) throw new AppError(400, 'Você não pode alterar o próprio perfil ou bloqueio.');
    const [linhas] = await db.query('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (!linhas[0]) throw new AppError(404, 'Usuário não encontrado.');

    await db.transacao(async (conn) => {
        if (perfil) await conn.query('UPDATE usuarios SET perfil = ? WHERE id = ?', [perfil, id]);
        if (bloqueado !== undefined) {
            await conn.query('UPDATE usuarios SET bloqueado = ? WHERE id = ?', [bloqueado, id]);
            // Bloqueio encerra imediatamente as sessões abertas
            if (bloqueado) await conn.query('DELETE FROM sessoes WHERE usuario_id = ?', [id]);
        }
    });
    return { id, bloqueado, perfil };
}

// RF029 — fila de moderação
async function listarDenuncias(status = 'pendente') {
    const [denuncias] = await db.query(
        `SELECT d.id, d.motivo, d.status, d.criado_em, d.analisado_em, u.nome AS denunciante,
                d.topico_id, d.resposta_forum_id, d.comentario_id,
                COALESCE(tp.titulo, LEFT(rf.conteudo, 150), LEFT(cq.texto, 150)) AS conteudo,
                COALESCE(tp.usuario_id, rf.usuario_id, cq.usuario_id) AS autor_id,
                COALESCE(rf.topico_id, tp.id) AS topico_referencia,
                CASE WHEN d.topico_id IS NOT NULL THEN 'topico'
                     WHEN d.resposta_forum_id IS NOT NULL THEN 'resposta'
                     ELSE 'comentario' END AS tipo
           FROM denuncias d
           JOIN usuarios u ON u.id = d.usuario_id
           LEFT JOIN topicos tp ON tp.id = d.topico_id
           LEFT JOIN respostas_forum rf ON rf.id = d.resposta_forum_id
           LEFT JOIN comentarios_questao cq ON cq.id = d.comentario_id
          WHERE d.status = ?
          ORDER BY d.criado_em DESC`,
        [status]
    );
    return denuncias;
}

/**
 * Procedente: o conteúdo denunciado é ocultado (tópico/resposta) ou removido
 * (comentário). Improcedente: apenas encerra a denúncia.
 */
async function analisarDenuncia(admin, id, status) {
    return db.transacao(async (conn) => {
        const [linhas] = await conn.query('SELECT * FROM denuncias WHERE id = ? FOR UPDATE', [id]);
        const denuncia = linhas[0];
        if (!denuncia) throw new AppError(404, 'Denúncia não encontrada.');
        if (denuncia.status !== 'pendente') throw new AppError(409, 'Denúncia já analisada.');

        await conn.query('UPDATE denuncias SET status = ?, analisado_por = ?, analisado_em = ? WHERE id = ?',
            [status, admin.id, new Date(), id]);

        if (status === 'procedente') {
            if (denuncia.topico_id) await conn.query('UPDATE topicos SET oculto = 1 WHERE id = ?', [denuncia.topico_id]);
            if (denuncia.resposta_forum_id) {
                await conn.query('UPDATE respostas_forum SET oculto = 1 WHERE id = ?', [denuncia.resposta_forum_id]);
            }
            // Encerra as demais denúncias pendentes sobre o mesmo conteúdo
            await conn.query(
                `UPDATE denuncias SET status = 'procedente', analisado_por = ?, analisado_em = ?
                  WHERE status = 'pendente' AND id <> ?
                    AND (topico_id <=> ? AND resposta_forum_id <=> ? AND comentario_id <=> ?)`,
                [admin.id, new Date(), id, denuncia.topico_id, denuncia.resposta_forum_id, denuncia.comentario_id]
            );
            if (denuncia.comentario_id) {
                await conn.query('DELETE FROM comentarios_questao WHERE id = ?', [denuncia.comentario_id]);
            }
        }
        return { id, status };
    });
}

// RF033 — relatórios gerais (uso, desempenho médio e acessos)
async function relatorios() {
    const [[usuarios]] = await db.query(
        `SELECT COUNT(*) AS total, SUM(perfil = 'aluno') AS alunos, SUM(perfil = 'professor') AS professores,
                SUM(perfil = 'admin') AS admins, SUM(bloqueado = 1) AS bloqueados,
                SUM(criado_em >= ?) AS novos_30_dias
           FROM usuarios`,
        [new Date(Date.now() - 30 * 86400000)]
    );
    const [[questoes]] = await db.query(
        `SELECT COUNT(*) AS total, SUM(status = 'aprovada') AS aprovadas, SUM(status = 'pendente') AS pendentes,
                SUM(status = 'rejeitada') AS rejeitadas, SUM(status = 'arquivada') AS arquivadas
           FROM questoes`
    );
    const [[simulados]] = await db.query(
        `SELECT COUNT(*) AS total, SUM(status = 'finalizado') AS finalizados,
                SUM(status = 'em_andamento') AS em_andamento, AVG(percentual) AS media_percentual,
                AVG(nota) AS media_nota, SUM(finalizado_por = 'tempo') AS encerrados_por_tempo
           FROM simulados`
    );
    const [porCurso] = await db.query(
        `SELECT c.nome AS curso, COUNT(s.id) AS simulados, AVG(s.percentual) AS media_percentual
           FROM simulados s
           JOIN usuarios u ON u.id = s.usuario_id
           JOIN cursos c ON c.id = u.curso_id
          WHERE s.status = 'finalizado'
          GROUP BY c.id, c.nome
          ORDER BY c.nome`
    );
    const [acessos] = await db.query(
        `SELECT DATE_FORMAT(data_acesso, '%Y-%m-%d') AS dia, COUNT(*) AS acessos,
                COUNT(DISTINCT usuario_id) AS usuarios
           FROM acessos WHERE data_acesso >= ?
          GROUP BY dia ORDER BY dia`,
        [new Date(Date.now() - 14 * 86400000)]
    );
    const [[forum]] = await db.query(
        `SELECT (SELECT COUNT(*) FROM topicos) AS topicos, (SELECT COUNT(*) FROM respostas_forum) AS respostas,
                (SELECT COUNT(*) FROM denuncias WHERE status = 'pendente') AS denuncias_pendentes`
    );

    const num = (v) => Number(v || 0);
    const media = (v) => (v === null ? null : arredondar(Number(v)));
    return {
        usuarios: Object.fromEntries(Object.entries(usuarios).map(([k, v]) => [k, num(v)])),
        questoes: Object.fromEntries(Object.entries(questoes).map(([k, v]) => [k, num(v)])),
        simulados: {
            total: num(simulados.total),
            finalizados: num(simulados.finalizados),
            em_andamento: num(simulados.em_andamento),
            encerrados_por_tempo: num(simulados.encerrados_por_tempo),
            media_percentual: media(simulados.media_percentual),
            media_nota: media(simulados.media_nota)
        },
        desempenho_por_curso: porCurso.map((c) => ({ ...c, media_percentual: media(c.media_percentual) })),
        acessos_14_dias: acessos,
        forum: Object.fromEntries(Object.entries(forum).map(([k, v]) => [k, num(v)]))
    };
}

module.exports = { listarUsuarios, atualizarUsuario, listarDenuncias, analisarDenuncia, relatorios };
