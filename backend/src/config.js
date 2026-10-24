const path = require('path');

// Carrega backend/.env independentemente da pasta de onde o comando foi executado
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const config = {
    porta: Number(process.env.PORT) || 3000,
    ambiente: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'enahub'
    },
    // Duração da sessão de login
    sessaoHoras: Number(process.env.SESSAO_HORAS) || 24 * 7,
    // Validade do link de recuperação de senha
    recuperacaoMinutos: 30,
    // Tolerância para respostas enviadas no último segundo (latência de rede)
    toleranciaSimuladoSegundos: 3
};

module.exports = config;
