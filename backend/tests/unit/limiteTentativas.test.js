const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const limiteTentativas = require('../../src/middlewares/limiteTentativas');

async function servidorCom(opcoes) {
    const limite = limiteTentativas(opcoes);
    limite.ativoEmTestes = true;
    const app = express();
    app.use(express.json());
    app.post('/login', limite, (req, res) => res.status(req.body.senha === 'certa' ? 200 : 401).json({}));
    const servidor = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
    const enviar = (corpo) => fetch(`http://127.0.0.1:${servidor.address().port}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo)
    }).then((r) => r.status);
    return { enviar, fechar: () => new Promise((r) => servidor.close(r)) };
}

test('logins bem-sucedidos não esgotam o limite (vários usuários no mesmo computador)', async () => {
    const { enviar, fechar } = await servidorCom({ maximo: 3, janelaMinutos: 1 });
    for (let i = 0; i < 10; i++) assert.equal(await enviar({ email: `u${i % 2}@x.com`, senha: 'certa' }), 200);
    await fechar();
});

test('bloqueia após N falhas para o mesmo e-mail, sem afetar outros e-mails', async () => {
    const { enviar, fechar } = await servidorCom({ maximo: 3, janelaMinutos: 1 });
    for (let i = 0; i < 3; i++) assert.equal(await enviar({ email: 'alvo@x.com', senha: 'errada' }), 401);
    assert.equal(await enviar({ email: 'alvo@x.com', senha: 'certa' }), 429);
    assert.equal(await enviar({ email: 'outro@x.com', senha: 'certa' }), 200);
    await fechar();
});

test('contarTodas limita também respostas de sucesso (pedido de recuperação)', async () => {
    const { enviar, fechar } = await servidorCom({ maximo: 2, janelaMinutos: 1, contarTodas: true });
    assert.equal(await enviar({ email: 'a@x.com', senha: 'certa' }), 200);
    assert.equal(await enviar({ email: 'a@x.com', senha: 'certa' }), 200);
    assert.equal(await enviar({ email: 'a@x.com', senha: 'certa' }), 429);
    await fechar();
});
