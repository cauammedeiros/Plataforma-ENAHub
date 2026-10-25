const db = require('../database');
const AppError = require('../utils/AppError');

async function listarCursos() {
    const [cursos] = await db.query('SELECT id, nome FROM cursos ORDER BY nome');
    return cursos;
}

async function listarInstituicoes() {
    const [instituicoes] = await db.query('SELECT id, nome FROM instituicoes ORDER BY nome');
    return instituicoes;
}

async function listarTemas(cursoId) {
    const filtro = cursoId ? 'WHERE t.curso_id = ? OR t.curso_id IS NULL' : '';
    const [temas] = await db.query(
        `SELECT t.id, t.nome, t.curso_id, c.nome AS curso
           FROM temas t LEFT JOIN cursos c ON c.id = t.curso_id
           ${filtro}
          ORDER BY c.nome IS NULL, c.nome, t.nome`,
        cursoId ? [cursoId] : []
    );
    return temas;
}

async function listarAnos() {
    const [linhas] = await db.query(
        `SELECT DISTINCT ano FROM questoes WHERE status = 'aprovada' AND ano IS NOT NULL ORDER BY ano DESC`
    );
    return linhas.map((l) => l.ano);
}

async function garantirCurso(cursoId, conn = db) {
    const [linhas] = await conn.query('SELECT id FROM cursos WHERE id = ?', [cursoId]);
    if (!linhas[0]) throw new AppError(400, 'Curso inválido.', { curso_id: 'Selecione um curso da lista.' });
}

// Usa a instituição existente com o mesmo nome ou cadastra uma nova
async function obterOuCriarInstituicao(nome, conn = db) {
    const [existente] = await conn.query('SELECT id FROM instituicoes WHERE nome = ?', [nome]);
    if (existente[0]) return existente[0].id;
    const [resultado] = await conn.query('INSERT INTO instituicoes (nome) VALUES (?)', [nome]);
    return resultado.insertId;
}

// A comparação de nomes segue a collation do banco (ignora maiúsculas e acentos)
async function criarCurso(nome) {
    const [existe] = await db.query('SELECT id FROM cursos WHERE nome = ?', [nome]);
    if (existe[0]) throw new AppError(409, 'Já existe um curso com esse nome.', { nome: 'Curso já cadastrado.' });
    const [resultado] = await db.query('INSERT INTO cursos (nome) VALUES (?)', [nome]);
    return { id: resultado.insertId, nome };
}

async function criarTema(nome, cursoId) {
    if (cursoId) await garantirCurso(cursoId);
    const [existe] = await db.query('SELECT id FROM temas WHERE nome = ? AND curso_id <=> ?', [nome, cursoId]);
    if (existe[0]) throw new AppError(409, 'Esse tema já existe para o curso.', { nome: 'Tema já cadastrado.' });
    const [resultado] = await db.query('INSERT INTO temas (nome, curso_id) VALUES (?, ?)', [nome, cursoId]);
    return { id: resultado.insertId, nome, curso_id: cursoId };
}

module.exports = {
    listarCursos, listarInstituicoes, listarTemas, listarAnos,
    garantirCurso, obterOuCriarInstituicao, criarCurso, criarTema
};
