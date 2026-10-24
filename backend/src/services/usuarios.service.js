const db = require('../database');
const AppError = require('../utils/AppError');
const senhaUtil = require('../utils/senha');
const catalogo = require('./catalogo.service');
const { buscarUsuarioPublico } = require('./auth.service');

// RF004 — nome, curso, instituição e (opcionalmente) senha
async function atualizarPerfil(usuarioId, { nome, cursoId, instituicao, senhaAtual, novaSenha }, tokenHashAtual) {
    if (cursoId) await catalogo.garantirCurso(cursoId);

    if (novaSenha) {
        const [linhas] = await db.query('SELECT senha FROM usuarios WHERE id = ?', [usuarioId]);
        if (!senhaAtual || !(await senhaUtil.verificar(senhaAtual, linhas[0].senha))) {
            throw new AppError(400, 'Senha atual incorreta.', { senha_atual: 'Senha atual incorreta.' });
        }
    }

    const hash = novaSenha ? await senhaUtil.gerarHash(novaSenha) : null;
    await db.transacao(async (conn) => {
        const campos = [];
        const valores = [];
        if (nome) { campos.push('nome = ?'); valores.push(nome); }
        if (cursoId) { campos.push('curso_id = ?'); valores.push(cursoId); }
        if (instituicao) {
            campos.push('instituicao_id = ?');
            valores.push(await catalogo.obterOuCriarInstituicao(instituicao, conn));
        }
        if (hash) { campos.push('senha = ?'); valores.push(hash); }

        if (campos.length) {
            await conn.query(`UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`, [...valores, usuarioId]);
        }
        if (hash) {
            // Mantém apenas a sessão atual após trocar a senha
            await conn.query('DELETE FROM sessoes WHERE usuario_id = ? AND token_hash <> ?', [usuarioId, tokenHashAtual]);
        }
    });

    return buscarUsuarioPublico(usuarioId);
}

// RF005 / RNF003.1 — exclusão da conta e dos dados pessoais (ON DELETE CASCADE)
async function excluirConta(usuarioId, senha) {
    const [linhas] = await db.query('SELECT senha, perfil FROM usuarios WHERE id = ?', [usuarioId]);
    const usuario = linhas[0];
    if (!usuario || !(await senhaUtil.verificar(senha, usuario.senha))) {
        throw new AppError(400, 'Senha incorreta.', { senha: 'Senha incorreta.' });
    }
    if (usuario.perfil === 'admin') {
        const [[{ total }]] = await db.query(
            "SELECT COUNT(*) AS total FROM usuarios WHERE perfil = 'admin' AND bloqueado = 0"
        );
        if (total <= 1) throw new AppError(409, 'Não é possível excluir o único administrador ativo.');
    }
    await db.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
}

module.exports = { atualizarPerfil, excluirConta };
