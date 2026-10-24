const config = require('../config');

/**
 * Limite simples de requisições por IP (em memória), usado no login e na
 * recuperação de senha para dificultar ataques de força bruta.
 */
function limiteTentativas({ maximo, janelaMinutos }) {
    const registros = new Map();
    const janelaMs = janelaMinutos * 60 * 1000;

    return (req, res, next) => {
        if (config.ambiente === 'test') return next();

        const agora = Date.now();
        const chave = `${req.ip}:${req.path}`;
        const registro = registros.get(chave);
        if (!registro || agora > registro.expira) {
            registros.set(chave, { total: 1, expira: agora + janelaMs });
            return next();
        }
        registro.total++;
        if (registro.total > maximo) {
            return res.status(429).json({ mensagem: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
        }
        next();
    };
}

module.exports = limiteTentativas;
