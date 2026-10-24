const db = require('../database');
const AppError = require('../utils/AppError');
const { hashToken } = require('../utils/token');

function extrairToken(req) {
    const cabecalho = req.headers.authorization || '';
    const [tipo, token] = cabecalho.split(' ');
    return tipo === 'Bearer' && token ? token : null;
}

/**
 * Exige um token de sessão válido. Carrega o usuário em req.usuario
 * e o hash do token em req.tokenHash (usado no logout).
 */
async function autenticar(req, res, next) {
    const token = extrairToken(req);
    if (!token) throw new AppError(401, 'Faça login para continuar.');

    const tokenHash = hashToken(token);
    const [linhas] = await db.query(
        `SELECT u.id, u.nome, u.email, u.perfil, u.bloqueado, u.curso_id, u.instituicao_id
           FROM sessoes s
           JOIN usuarios u ON u.id = s.usuario_id
          WHERE s.token_hash = ? AND s.expira_em > ?`,
        [tokenHash, new Date()]
    );

    const usuario = linhas[0];
    if (!usuario) throw new AppError(401, 'Sessão expirada. Faça login novamente.');
    if (usuario.bloqueado) throw new AppError(403, 'Sua conta está bloqueada. Procure a administração.');

    req.usuario = usuario;
    req.tokenHash = tokenHash;
    next();
}

// Permite o acesso apenas aos perfis informados. Ex.: autorizar('admin', 'professor')
function autorizar(...perfis) {
    return (req, res, next) => {
        if (!req.usuario || !perfis.includes(req.usuario.perfil)) {
            throw new AppError(403, 'Você não tem permissão para esta ação.');
        }
        next();
    };
}

module.exports = { autenticar, autorizar };
