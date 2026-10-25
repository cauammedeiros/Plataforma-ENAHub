const db = require('../database');
const config = require('../config');
const AppError = require('../utils/AppError');
const senhaUtil = require('../utils/senha');
const { gerarToken, hashToken } = require('../utils/token');
const catalogo = require('./catalogo.service');

const CAMPOS_PUBLICOS = `u.id, u.nome, u.email, u.perfil, u.curso_id, c.nome AS curso,
    u.instituicao_id, i.nome AS instituicao, u.criado_em`;

async function buscarUsuarioPublico(id, conn = db) {
    const [linhas] = await conn.query(
        `SELECT ${CAMPOS_PUBLICOS}
           FROM usuarios u
           LEFT JOIN cursos c ON c.id = u.curso_id
           LEFT JOIN instituicoes i ON i.id = u.instituicao_id
          WHERE u.id = ?`,
        [id]
    );
    return linhas[0] || null;
}

async function criarSessao(usuarioId) {
    const token = gerarToken();
    const expiraEm = new Date(Date.now() + config.sessaoHoras * 3600 * 1000);
    await db.query('INSERT INTO sessoes (usuario_id, token_hash, expira_em) VALUES (?, ?, ?)',
        [usuarioId, hashToken(token), expiraEm]);
    await db.query('UPDATE usuarios SET ultimo_acesso = ? WHERE id = ?', [new Date(), usuarioId]);
    await db.query('INSERT INTO acessos (usuario_id) VALUES (?)', [usuarioId]);
    return { token, expiraEm };
}

// RF001 — cadastro sempre cria perfil "aluno"; professores/admins são promovidos pelo admin
async function cadastrar({ nome, email, senha, cursoId, instituicao }) {
    await catalogo.garantirCurso(cursoId);

    const [existente] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existente[0]) {
        throw new AppError(409, 'Já existe uma conta com este e-mail.', { email: 'E-mail já cadastrado.' });
    }

    const hash = await senhaUtil.gerarHash(senha);
    const id = await db.transacao(async (conn) => {
        const instituicaoId = await catalogo.obterOuCriarInstituicao(instituicao, conn);
        const [resultado] = await conn.query(
            `INSERT INTO usuarios (nome, email, senha, perfil, curso_id, instituicao_id, aceitou_termos_em)
             VALUES (?, ?, ?, 'aluno', ?, ?, ?)`,
            [nome, email, hash, cursoId, instituicaoId, new Date()]
        );
        return resultado.insertId;
    });

    const sessao = await criarSessao(id);
    return { usuario: await buscarUsuarioPublico(id), ...sessao };
}

// RF002
async function login({ email, senha }) {
    const [linhas] = await db.query('SELECT id, senha, bloqueado FROM usuarios WHERE email = ?', [email]);
    const usuario = linhas[0];
    // Mesma mensagem para e-mail inexistente e senha errada (não revela quais e-mails existem)
    if (!usuario || !(await senhaUtil.verificar(senha, usuario.senha))) {
        throw new AppError(401, 'E-mail ou senha incorretos.');
    }
    if (usuario.bloqueado) throw new AppError(403, 'Sua conta está bloqueada. Procure a administração.');

    const sessao = await criarSessao(usuario.id);
    return { usuario: await buscarUsuarioPublico(usuario.id), ...sessao };
}

async function logout(tokenHash) {
    await db.query('DELETE FROM sessoes WHERE token_hash = ?', [tokenHash]);
}

/**
 * RF003 — gera um link de redefinição de senha.
 * Não há servidor de e-mail configurado no projeto: o link é registrado no
 * console do servidor (e devolvido na resposta apenas em desenvolvimento).
 */
async function solicitarRecuperacao(email) {
    const [linhas] = await db.query('SELECT id, nome FROM usuarios WHERE email = ? AND bloqueado = 0', [email]);
    const usuario = linhas[0];
    if (!usuario) return null;

    const token = gerarToken();
    const expiraEm = new Date(Date.now() + config.recuperacaoMinutos * 60 * 1000);
    await db.transacao(async (conn) => {
        // Um novo pedido invalida os links anteriores ainda não usados
        await conn.query('UPDATE tokens_recuperacao SET usado_em = ? WHERE usuario_id = ? AND usado_em IS NULL',
            [new Date(), usuario.id]);
        await conn.query('INSERT INTO tokens_recuperacao (usuario_id, token_hash, expira_em) VALUES (?, ?, ?)',
            [usuario.id, hashToken(token), expiraEm]);
    });

    const link = `${config.frontendUrl}/redefinir-senha?token=${token}`;
    if (config.ambiente !== 'test') {
        console.log(`[recuperação de senha] Link para ${email}: ${link}`);
    }
    return link;
}

async function redefinirSenha({ token, novaSenha }) {
    const tokenHash = hashToken(token);
    const hash = await senhaUtil.gerarHash(novaSenha);

    await db.transacao(async (conn) => {
        const [linhas] = await conn.query(
            `SELECT id, usuario_id FROM tokens_recuperacao
              WHERE token_hash = ? AND usado_em IS NULL AND expira_em > ? FOR UPDATE`,
            [tokenHash, new Date()]
        );
        const registro = linhas[0];
        if (!registro) throw new AppError(400, 'Link inválido ou expirado. Solicite um novo.');

        await conn.query('UPDATE usuarios SET senha = ? WHERE id = ?', [hash, registro.usuario_id]);
        await conn.query('UPDATE tokens_recuperacao SET usado_em = ? WHERE id = ?', [new Date(), registro.id]);
        // Encerra todas as sessões abertas com a senha antiga
        await conn.query('DELETE FROM sessoes WHERE usuario_id = ?', [registro.usuario_id]);
    });
}

// Remove sessões e links de recuperação vencidos (executada periodicamente pelo servidor)
async function limparExpirados() {
    const agora = new Date();
    const [sessoes] = await db.query('DELETE FROM sessoes WHERE expira_em < ?', [agora]);
    const [tokens] = await db.query(
        'DELETE FROM tokens_recuperacao WHERE expira_em < ? OR usado_em < ?',
        [agora, new Date(Date.now() - 24 * 3600 * 1000)]
    );
    return sessoes.affectedRows + tokens.affectedRows;
}

module.exports = {
    limparExpirados,
    cadastrar, login, logout, solicitarRecuperacao, redefinirSenha, buscarUsuarioPublico
};
