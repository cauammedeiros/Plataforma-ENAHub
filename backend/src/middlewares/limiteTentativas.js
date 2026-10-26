const crypto = require('crypto');
const config = require('../config');

/**
 * Limite de tentativas malsucedidas, usado no login, no cadastro e na
 * recuperação de senha para dificultar ataques de força bruta.
 *
 * Por padrão só as respostas de erro (status >= 400) contam (contarTodas = false). Assim, vários usuários
 * entrando pelo mesmo computador/rede (ex.: laboratório ou apresentação) não
 * são bloqueados por logins bem-sucedidos.
 * A chave combina IP, rota e e-mail informado.
 *
 * Localmente o contador fica em memória. Na hospedagem serverless cada instância tem
 * a própria memória, então o contador fica na tabela limites_tentativas (banco = true).
 */
function memoria() {
    const registros = new Map();
    return {
        async ler(chave) {
            const registro = registros.get(chave);
            return registro && Date.now() <= registro.expira ? registro : null;
        },
        async contarFalha(chave, janelaMs) {
            const atual = registros.get(chave);
            if (!atual || Date.now() > atual.expira) {
                registros.set(chave, { falhas: 1, expira: Date.now() + janelaMs });
            } else {
                atual.falhas++;
            }
        },
        limpar() {
            const agora = Date.now();
            for (const [chave, registro] of registros) if (agora > registro.expira) registros.delete(chave);
        }
    };
}

function bancoDeDados() {
    const db = require('../database');
    const hash = (chave) => crypto.createHash('sha256').update(chave).digest('hex');
    return {
        async ler(chave) {
            const [linhas] = await db.query(
                'SELECT falhas, expira_em FROM limites_tentativas WHERE chave = ? AND expira_em >= ?',
                [hash(chave), new Date()]
            );
            return linhas[0] ? { falhas: linhas[0].falhas, expira: new Date(linhas[0].expira_em).getTime() } : null;
        },
        async contarFalha(chave, janelaMs) {
            const agora = new Date();
            // Janela vencida recomeça a contagem; senão soma uma falha (as atribuições usam os valores antigos)
            await db.query(
                `INSERT INTO limites_tentativas (chave, falhas, expira_em) VALUES (?, 1, ?) AS novo
                 ON DUPLICATE KEY UPDATE
                    falhas = IF(limites_tentativas.expira_em < ?, 1, limites_tentativas.falhas + 1),
                    expira_em = IF(limites_tentativas.expira_em < ?, novo.expira_em, limites_tentativas.expira_em)`,
                [hash(chave), new Date(agora.getTime() + janelaMs), agora, agora]
            );
            // Remove de vez em quando os registros vencidos
            if (Math.random() < 0.05) await db.query('DELETE FROM limites_tentativas WHERE expira_em < ?', [agora]);
        }
    };
}

function limiteTentativas({ maximo, janelaMinutos, contarTodas = false, banco = config.serverless }) {
    const janelaMs = janelaMinutos * 60 * 1000;
    const contador = banco ? bancoDeDados() : memoria();

    function chaveDe(req) {
        const email = String(req.body?.email || '').trim().toLowerCase();
        return `${req.ip}:${req.path}:${email}`;
    }

    const middleware = async (req, res, next) => {
        if (config.ambiente === 'test' && !middleware.ativoEmTestes) return next();

        const chave = chaveDe(req);
        const registro = await contador.ler(chave);
        if (registro && registro.falhas >= maximo) {
            const minutos = Math.ceil((registro.expira - Date.now()) / 60000);
            return res.status(429).json({
                mensagem: `Muitas tentativas. Tente novamente em ${minutos} minuto(s).`
            });
        }

        // A falha é gravada antes de a resposta sair: na hospedagem a função pode ser
        // suspensa logo depois do envio
        const enviarOriginal = res.json.bind(res);
        res.json = (corpo) => {
            if (res.statusCode === 429 || (!contarTodas && res.statusCode < 400)) return enviarOriginal(corpo);
            contador.contarFalha(chave, janelaMs)
                .catch((erro) => console.error('Erro ao registrar tentativa:', erro.message))
                .finally(() => enviarOriginal(corpo));
            return res;
        };
        next();
    };

    // Limpeza periódica para não acumular chaves antigas na memória
    if (contador.limpar) setInterval(contador.limpar, janelaMs).unref();

    middleware.ativoEmTestes = false;
    return middleware;
}

module.exports = limiteTentativas;
