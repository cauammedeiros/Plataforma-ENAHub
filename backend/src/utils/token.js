const crypto = require('crypto');

// Token aleatório entregue ao usuário. No banco guardamos apenas o hash.
function gerarToken() {
    return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = { gerarToken, hashToken };
