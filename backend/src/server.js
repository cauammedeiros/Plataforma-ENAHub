const app = require('./app');
const config = require('./config');
const db = require('./database');
const { finalizarExpirados } = require('./services/simulados.service');

const PORT = config.porta;

// RF017 — encerra simulados com prazo vencido mesmo que o aluno feche o navegador
const INTERVALO_VERIFICACAO_MS = 30 * 1000;

async function iniciar() {
    try {
        await db.query('SELECT 1');
        console.log(`Conectado ao MySQL (banco "${config.db.database}").`);
    } catch (erro) {
        console.error('Não foi possível conectar ao MySQL. Verifique o arquivo backend/.env.');
        console.error(erro.message);
        process.exit(1);
    }

    setInterval(() => {
        finalizarExpirados()
            .then((total) => total && console.log(`${total} simulado(s) finalizado(s) por tempo esgotado.`))
            .catch((erro) => console.error('Erro ao finalizar simulados expirados:', erro.message));
    }, INTERVALO_VERIFICACAO_MS).unref();

    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}

iniciar();
