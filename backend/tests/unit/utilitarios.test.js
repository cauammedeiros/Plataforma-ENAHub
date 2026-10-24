const test = require('node:test');
const assert = require('node:assert/strict');
const senha = require('../../src/utils/senha');
const { Validador } = require('../../src/utils/validacao');
const { hashToken, gerarToken } = require('../../src/utils/token');
const { calcularDiasSeguidos, abreviarNome } = require('../../src/services/desempenho.service');

test('hash de senha com scrypt + salt: verifica a correta e rejeita a errada', async () => {
    const hash = await senha.gerarHash('Segredo123');
    assert.match(hash, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    assert.notEqual(hash, await senha.gerarHash('Segredo123'), 'salt deve ser aleatório');
    assert.equal(await senha.verificar('Segredo123', hash), true);
    assert.equal(await senha.verificar('segredo123', hash), false);
    assert.equal(await senha.verificar('Segredo123', 'texto-puro'), false);
});

test('token: aleatório e com hash SHA-256 determinístico', () => {
    const t = gerarToken();
    assert.equal(t.length, 64);
    assert.notEqual(t, gerarToken());
    assert.equal(hashToken(t), hashToken(t));
    assert.equal(hashToken(t).length, 64);
});

test('Validador acumula erros de vários campos', () => {
    const v = new Validador({ nome: 'A', email: 'invalido', senha: 'abc', curso_id: 'x' });
    v.texto('nome', { min: 3 });
    v.email();
    v.senha();
    v.inteiro('curso_id');
    assert.throws(() => v.verificar(), (erro) => {
        assert.equal(erro.status, 400);
        assert.deepEqual(Object.keys(erro.detalhes).sort(), ['curso_id', 'email', 'nome', 'senha']);
        return true;
    });
});

test('Validador normaliza e-mail e aceita dados válidos', () => {
    const v = new Validador({ email: '  Aluno@Unifor.BR ', senha: 'Senha1234', n: '7' });
    assert.equal(v.email(), 'aluno@unifor.br');
    assert.equal(v.senha(), 'Senha1234');
    assert.equal(v.inteiro('n', { min: 1, max: 10 }), 7);
    v.verificar();
});

test('dias seguidos de estudo', () => {
    const hoje = new Date(2026, 9, 24, 12);
    const d = (dia) => new Date(2026, 9, dia).toLocaleDateString('sv-SE');
    assert.equal(calcularDiasSeguidos([d(24), d(23), d(22), d(20)], hoje), 3);
    assert.equal(calcularDiasSeguidos([d(23), d(22)], hoje), 2, 'sequência até ontem ainda conta');
    assert.equal(calcularDiasSeguidos([d(21)], hoje), 0);
    assert.equal(calcularDiasSeguidos([], hoje), 0);
});

test('ranking exibe nome abreviado', () => {
    assert.equal(abreviarNome('Maria da Silva Costa'), 'Maria C.');
    assert.equal(abreviarNome('Ana'), 'Ana');
});
