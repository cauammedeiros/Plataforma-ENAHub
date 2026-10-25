const mysql = require('mysql2/promise');
const config = require('./config');

const connection = mysql.createPool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    port: config.db.port,
    waitForConnections: true,
    connectionLimit: 10
});

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
