const mysql = require('mysql2/promise');
const config = require('./config');

const connection = mysql.createPool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    port: config.db.port,
    ssl: config.db.ssl,
    timezone: config.db.timezone,
    waitForConnections: true,
    connectionLimit: config.db.limiteConexoes,
    // Na hospedagem as conexões ociosas são fechadas rápido para não esgotar o limite do banco
    ...(config.serverless ? { maxIdle: 0, idleTimeout: 5000 } : {})
});

if (config.serverless) {
    // Se a instância for congelada com uma conexão aberta, o MySQL a encerra sozinho
    connection.pool.on('connection', (conn) => conn.query('SET SESSION wait_timeout = 120'));
    // Mantém a função ativa até o pool fechar as conexões ociosas (Fluid compute da Vercel)
    connection.pool.config.connectionConfig.idleTimeout = 5000;
    require('@vercel/functions').attachDatabasePool(connection.pool);
}

/**
 * Executa `fn` dentro de uma transação. Faz commit se tudo der certo
 * e rollback se alguma exceção for lançada.
 */
async function transacao(fn) {
    const conn = await connection.getConnection();
    try {
        await conn.beginTransaction();
        const resultado = await fn(conn);
        await conn.commit();
        return resultado;
    } catch (erro) {
        await conn.rollback();
        throw erro;
    } finally {
        conn.release();
    }
}

module.exports = connection;
module.exports.transacao = transacao;
