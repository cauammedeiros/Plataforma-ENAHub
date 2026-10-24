const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const TAMANHO_CHAVE = 64;

// Formato armazenado: scrypt$<salt em hex>$<hash em hex>
async function gerarHash(senha) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await scrypt(senha, salt, TAMANHO_CHAVE);
    return `scrypt$${salt}$${hash.toString('hex')}`;
}

async function verificar(senha, armazenado) {
    const partes = String(armazenado || '').split('$');
    if (partes.length !== 3 || partes[0] !== 'scrypt') return false;

    const [, salt, hashHex] = partes;
    const esperado = Buffer.from(hashHex, 'hex');
    const calculado = await scrypt(senha, salt, esperado.length);
    return esperado.length === calculado.length && crypto.timingSafeEqual(esperado, calculado);
}

module.exports = { gerarHash, verificar };
