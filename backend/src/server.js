const app = require('./app');
const config = require('./config');
const db = require('./database');
const { finalizarExpirados } = require('./services/simulados.service');
const { limparExpirados } = require('./services/auth.service');

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

    // Limpa sessões e links de recuperação vencidos a cada hora
    setInterval(() => {
        limparExpirados().catch((erro) => console.error('Erro ao limpar sessões expiradas:', erro.message));
    }, 60 * 60 * 1000).unref();

    app.listen(PORT, (erro) => {
        if (erro) {
            console.error(erro.code === 'EADDRINUSE'
                ? `A porta ${PORT} já está em uso por outro programa. Defina outra porta em backend/.env (PORT=3001).`
                : `Não foi possível iniciar o servidor: ${erro.message}`);
            process.exit(1);
        }
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}

iniciar();
