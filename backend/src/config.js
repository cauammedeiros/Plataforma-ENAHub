const fs = require('fs');
const path = require('path');

// Carrega backend/.env independentemente da pasta de onde o comando foi executado.
// ENAHUB_ENV_FILE permite apontar para outro arquivo (ex.: o banco da hospedagem, fora do repositório).
require('dotenv').config({
    path: process.env.ENAHUB_ENV_FILE || path.join(__dirname, '..', '.env'),
    quiet: true
});

// Hospedagem (Vercel Functions): sem processo permanente, várias instâncias em paralelo
const serverless = Boolean(process.env.VERCEL);

// Certificado CA do MySQL hospedado (Aiven): DB_SSL_CA (conteúdo PEM) ou DB_SSL_CA_FILE (caminho).
// Com o CA definido, a conexão usa TLS e o certificado do servidor é validado.
function lerCertificadoCA() {
    if (process.env.DB_SSL_CA) return process.env.DB_SSL_CA.replace(/\\n/g, '\n');
    if (process.env.DB_SSL_CA_FILE) return fs.readFileSync(process.env.DB_SSL_CA_FILE, 'utf8');
    return null;
}
const certificadoCA = lerCertificadoCA();

const config = {
    porta: Number(process.env.PORT) || 3000,
    ambiente: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'enahub',
        ssl: certificadoCA ? { ca: certificadoCA, rejectUnauthorized: true } : undefined,
        // 'local' preserva o comportamento do MySQL local; na hospedagem usa-se 'Z' (UTC)
        timezone: process.env.DB_TIMEZONE || 'local',
        // Conexões por instância. Na Vercel, cada instância abre poucas (limite do plano gratuito do banco)
        limiteConexoes: Number(process.env.DB_POOL_LIMITE) || (serverless ? 3 : 10)
    },
    serverless,
    // Se definido, o cadastro exige este código (hospedagem: só convidados criam conta)
    codigoConvite: process.env.CODIGO_CONVITE || '',
    // Duração da sessão de login
    sessaoHoras: Number(process.env.SESSAO_HORAS) || 24 * 7,
    // Validade do link de recuperação de senha
    recuperacaoMinutos: 30,
    // Sem servidor de e-mail, o link de recuperação aparece no terminal do back-end.
    // Para demonstrações locais, pode também ser devolvido na resposta da API.
    // NUNCA habilite em um servidor acessível por outras pessoas: qualquer um
    // conseguiria redefinir a senha de qualquer conta.
    linkRecuperacaoNaResposta: process.env.RECUPERACAO_LINK_NA_RESPOSTA === 'true'
        && (process.env.NODE_ENV || 'development') === 'development'
        && !serverless,
    // Tolerância para respostas enviadas no último segundo (latência de rede)
    toleranciaSimuladoSegundos: 3
};

module.exports = config;
