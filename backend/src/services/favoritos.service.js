const db = require('../database');
const AppError = require('../utils/AppError');

// RF012
async function listar(usuarioId) {
    const [linhas] = await db.query(
        `SELECT q.id, q.enunciado, q.ano, q.dificuldade, q.oficial_enade, q.fonte,
                c.nome AS curso, t.nome AS tema, f.criado_em AS favoritada_em
           FROM favoritos f
           JOIN questoes q ON q.id = f.questao_id AND q.status = 'aprovada'
           JOIN cursos c ON c.id = q.curso_id
           LEFT JOIN temas t ON t.id = q.tema_id
          WHERE f.usuario_id = ?
          ORDER BY f.criado_em DESC`,
        [usuarioId]
    );
    return linhas.map((q) => ({ ...q, oficial_enade: Boolean(q.oficial_enade), favorita: true }));
}

async function adicionar(usuarioId, questaoId) {
    const [questoes] = await db.query("SELECT id FROM questoes WHERE id = ? AND status = 'aprovada'", [questaoId]);
    if (!questoes[0]) throw new AppError(404, 'Questão não encontrada.');
    await db.query('INSERT IGNORE INTO favoritos (usuario_id, questao_id) VALUES (?, ?)', [usuarioId, questaoId]);
    return { questao_id: questaoId, favorita: true };
}

async function remover(usuarioId, questaoId) {
    await db.query('DELETE FROM favoritos WHERE usuario_id = ? AND questao_id = ?', [usuarioId, questaoId]);
    return { questao_id: questaoId, favorita: false };
}

module.exports = { listar, adicionar, remover };
