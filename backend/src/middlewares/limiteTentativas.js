const config = require('../config');

/**
 * Limite de tentativas malsucedidas (em memória), usado no login, no cadastro e na
 * recuperação de senha para dificultar ataques de força bruta.
 *
 * Por padrão só as respostas de erro (status >= 400) contam (contarTodas = false). Assim, vários usuários
 * entrando pelo mesmo computador/rede (ex.: laboratório ou apresentação) não
 * são bloqueados por logins bem-sucedidos.
 * A chave combina IP, rota e e-mail informado.
 */
function limiteTentativas({ maximo, janelaMinutos, contarTodas = false }) {
    const registros = new Map();
    const janelaMs = janelaMinutos * 60 * 1000;

    function chaveDe(req) {
        const email = String(req.body?.email || '').trim().toLowerCase();
        return `${req.ip}:${req.path}:${email}`;
    }

    const middleware = (req, res, next) => {
        if (config.ambiente === 'test' && !middleware.ativoEmTestes) return next();

        const agora = Date.now();
        const chave = chaveDe(req);
        const registro = registros.get(chave);
        if (registro && agora <= registro.expira && registro.falhas >= maximo) {
            const minutos = Math.ceil((registro.expira - agora) / 60000);
            return res.status(429).json({
                mensagem: `Muitas tentativas. Tente novamente em ${minutos} minuto(s).`
            });
        }

        res.on('finish', () => {
            if (res.statusCode === 429 || (!contarTodas && res.statusCode < 400)) return;
            const atual = registros.get(chave);
            if (!atual || Date.now() > atual.expira) {
                registros.set(chave, { falhas: 1, expira: Date.now() + janelaMs });
            } else {
                atual.falhas++;
            }
        });
        next();
    };

    // Limpeza periódica para não acumular chaves antigas na memória
    setInterval(() => {
        const agora = Date.now();
        for (const [chave, registro] of registros) if (agora > registro.expira) registros.delete(chave);
    }, janelaMs).unref();

    middleware.ativoEmTestes = false;
    return middleware;
}

module.exports = limiteTentativas;
