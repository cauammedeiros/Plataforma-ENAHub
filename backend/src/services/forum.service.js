const db = require('../database');
const AppError = require('../utils/AppError');
const { abreviarNome } = require('./desempenho.service');

// RF026 — lista de tópicos com contagem de respostas e curtidas
async function listarTopicos(usuario, { busca, pagina = 1, limite = 20 }) {
    const where = ['tp.oculto = 0'];
    const params = [];
    if (busca) {
        where.push('(tp.titulo LIKE ? OR tp.conteudo LIKE ?)');
        params.push(`%${busca}%`, `%${busca}%`);
    }
    const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total FROM topicos tp WHERE ${where.join(' AND ')}`, params
    );
    const [topicos] = await db.query(
        `SELECT tp.id, tp.titulo, LEFT(tp.conteudo, 200) AS resumo, tp.criado_em, tp.usuario_id, u.nome AS autor,
                (SELECT COUNT(*) FROM respostas_forum rf WHERE rf.topico_id = tp.id AND rf.oculto = 0) AS respostas,
                (SELECT COUNT(*) FROM curtidas_topicos ct WHERE ct.topico_id = tp.id) AS curtidas,
                EXISTS(SELECT 1 FROM curtidas_topicos ct WHERE ct.topico_id = tp.id AND ct.usuario_id = ?) AS curtido
           FROM topicos tp JOIN usuarios u ON u.id = tp.usuario_id
          WHERE ${where.join(' AND ')}
          ORDER BY tp.criado_em DESC, tp.id DESC
          LIMIT ? OFFSET ?`,
        [usuario.id, ...params, limite, (pagina - 1) * limite]
    );
    return {
        topicos: topicos.map((t) => ({ ...t, autor: abreviarNome(t.autor), curtido: Boolean(t.curtido) })),
        total,
        pagina,
        total_paginas: Math.max(1, Math.ceil(total / limite))
    };
}

async function buscarTopico(id) {
    const [linhas] = await db.query('SELECT * FROM topicos WHERE id = ?', [id]);
    if (!linhas[0]) throw new AppError(404, 'Tópico não encontrado.');
    return linhas[0];
}

async function detalharTopico(usuario, id) {
    const topico = await buscarTopico(id);
    if (topico.oculto && usuario.perfil !== 'admin') throw new AppError(404, 'Tópico não encontrado.');

    const [[info]] = await db.query(
        `SELECT u.nome AS autor,
                (SELECT COUNT(*) FROM curtidas_topicos WHERE topico_id = ?) AS curtidas,
                EXISTS(SELECT 1 FROM curtidas_topicos WHERE topico_id = ? AND usuario_id = ?) AS curtido
           FROM usuarios u WHERE u.id = ?`,
        [id, id, usuario.id, topico.usuario_id]
    );
    const [respostas] = await db.query(
        `SELECT rf.id, rf.conteudo, rf.criado_em, rf.usuario_id, u.nome AS autor, u.perfil AS autor_perfil,
                (SELECT COUNT(*) FROM curtidas c WHERE c.resposta_forum_id = rf.id) AS curtidas,
                EXISTS(SELECT 1 FROM curtidas c WHERE c.resposta_forum_id = rf.id AND c.usuario_id = ?) AS curtido
           FROM respostas_forum rf JOIN usuarios u ON u.id = rf.usuario_id
          WHERE rf.topico_id = ? AND rf.oculto = 0
          ORDER BY rf.criado_em, rf.id`,
        [usuario.id, id]
    );
    return {
        id: topico.id,
        titulo: topico.titulo,
        conteudo: topico.conteudo,
        criado_em: topico.criado_em,
        usuario_id: topico.usuario_id,
        autor: abreviarNome(info.autor),
        curtidas: info.curtidas,
        curtido: Boolean(info.curtido),
        oculto: Boolean(topico.oculto),
        respostas: respostas.map((r) => ({ ...r, autor: abreviarNome(r.autor), curtido: Boolean(r.curtido) }))
    };
}

async function criarTopico(usuario, { titulo, conteudo }) {
    const [resultado] = await db.query(
        'INSERT INTO topicos (titulo, conteudo, usuario_id) VALUES (?, ?, ?)', [titulo, conteudo, usuario.id]
    );
    return { id: resultado.insertId };
}

// RF027 — respostas sem limite
async function responder(usuario, topicoId, conteudo) {
    const topico = await buscarTopico(topicoId);
    if (topico.oculto) throw new AppError(404, 'Tópico não encontrado.');
    const [resultado] = await db.query(
        'INSERT INTO respostas_forum (topico_id, usuario_id, conteudo) VALUES (?, ?, ?)',
        [topicoId, usuario.id, conteudo]
    );
    return { id: resultado.insertId };
}

async function excluirTopico(usuario, id) {
    const topico = await buscarTopico(id);
    if (usuario.perfil !== 'admin' && topico.usuario_id !== usuario.id) {
        throw new AppError(403, 'Você só pode excluir os próprios tópicos.');
    }
    await db.query('DELETE FROM topicos WHERE id = ?', [id]);
}

async function excluirResposta(usuario, id) {
    const [linhas] = await db.query('SELECT usuario_id FROM respostas_forum WHERE id = ?', [id]);
    if (!linhas[0]) throw new AppError(404, 'Resposta não encontrada.');
    if (usuario.perfil !== 'admin' && linhas[0].usuario_id !== usuario.id) {
        throw new AppError(403, 'Você só pode excluir as próprias respostas.');
    }
    await db.query('DELETE FROM respostas_forum WHERE id = ?', [id]);
}

// RF028 — curtir/descurtir (alterna)
async function alternarCurtida(usuario, tipo, id) {
    const tabela = tipo === 'topico' ? 'curtidas_topicos' : 'curtidas';
    const coluna = tipo === 'topico' ? 'topico_id' : 'resposta_forum_id';
    const alvo = tipo === 'topico' ? 'topicos' : 'respostas_forum';

    const [existe] = await db.query(`SELECT id FROM ${alvo} WHERE id = ? AND oculto = 0`, [id]);
    if (!existe[0]) throw new AppError(404, 'Conteúdo não encontrado.');

    const [removida] = await db.query(`DELETE FROM ${tabela} WHERE usuario_id = ? AND ${coluna} = ?`, [usuario.id, id]);
    if (!removida.affectedRows) {
        await db.query(`INSERT IGNORE INTO ${tabela} (usuario_id, ${coluna}) VALUES (?, ?)`, [usuario.id, id]);
    }
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM ${tabela} WHERE ${coluna} = ?`, [id]);
    return { curtido: !removida.affectedRows, curtidas: total };
}

const ALVOS_DENUNCIA = {
    topico: { coluna: 'topico_id', tabela: 'topicos' },
    resposta: { coluna: 'resposta_forum_id', tabela: 'respostas_forum' },
    comentario: { coluna: 'comentario_id', tabela: 'comentarios_questao' }
};

// RF029 — denúncia encaminhada para análise do administrador
async function denunciar(usuario, { tipo, id, motivo }) {
    const alvo = ALVOS_DENUNCIA[tipo];
    const [existe] = await db.query(`SELECT id FROM ${alvo.tabela} WHERE id = ?`, [id]);
    if (!existe[0]) throw new AppError(404, 'Conteúdo não encontrado.');

    const [repetida] = await db.query(
        `SELECT id FROM denuncias WHERE usuario_id = ? AND ${alvo.coluna} = ? AND status = 'pendente'`, [usuario.id, id]
    );
    if (repetida[0]) throw new AppError(409, 'Você já denunciou este conteúdo. A denúncia está em análise.');

    const [resultado] = await db.query(
        `INSERT INTO denuncias (usuario_id, ${alvo.coluna}, motivo) VALUES (?, ?, ?)`, [usuario.id, id, motivo]
    );
    return { id: resultado.insertId };
}

module.exports = {
    listarTopicos, detalharTopico, criarTopico, responder, excluirTopico, excluirResposta,
    alternarCurtida, denunciar, ALVOS_DENUNCIA
};
