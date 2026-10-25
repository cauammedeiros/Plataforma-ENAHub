const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularResultado, corrigir } = require('../../src/utils/pontuacao');

test('exemplo do enunciado: 30 acertos em 40 questões = 75% e nota 7,5', () => {
    const r = calcularResultado({ total: 40, acertos: 30, respondidas: 40 });
    assert.deepEqual(r, { total: 40, acertos: 30, erros: 10, emBranco: 0, percentual: 75, nota: 7.5 });
});

test('separa erros de questões em branco', () => {
    const r = calcularResultado({ total: 40, acertos: 30, respondidas: 35 });
    assert.equal(r.erros, 5);
    assert.equal(r.emBranco, 5);
    assert.equal(r.percentual, 75);
    assert.equal(r.nota, 7.5);
});

test('simulado sem nenhuma resposta: tudo em branco, nota 0', () => {
    const r = calcularResultado({ total: 10, acertos: 0, respondidas: 0 });
    assert.deepEqual(r, { total: 10, acertos: 0, erros: 0, emBranco: 10, percentual: 0, nota: 0 });
});

test('todas corretas: 100% e nota 10', () => {
    const r = calcularResultado({ total: 7, acertos: 7, respondidas: 7 });
    assert.equal(r.percentual, 100);
    assert.equal(r.nota, 10);
});

test('arredonda para duas casas decimais (1 de 3 = 33,33% e nota 3,33)', () => {
    const r = calcularResultado({ total: 3, acertos: 1, respondidas: 3 });
    assert.equal(r.percentual, 33.33);
    assert.equal(r.nota, 3.33);
    const r2 = calcularResultado({ total: 3, acertos: 2, respondidas: 2 });
    assert.equal(r2.percentual, 66.67);
    assert.equal(r2.nota, 6.67);
});

test('total zero não divide por zero', () => {
    const r = calcularResultado({ total: 0, acertos: 0, respondidas: 0 });
    assert.equal(r.percentual, 0);
    assert.equal(r.nota, 0);
});

test('rejeita combinações impossíveis', () => {
    assert.throws(() => calcularResultado({ total: 5, acertos: 6, respondidas: 6 }));
    assert.throws(() => calcularResultado({ total: 5, acertos: 3, respondidas: 2 }));
    assert.throws(() => calcularResultado({ total: -1, acertos: 0, respondidas: 0 }));
    assert.throws(() => calcularResultado({ total: 5, acertos: 1.5, respondidas: 2 }));
});

test('corrigir() conta acertos, erros e em branco a partir das respostas', () => {
    const r = corrigir([
        { alternativaEscolhida: 10, escolhidaCorreta: true },
        { alternativaEscolhida: 11, escolhidaCorreta: false },
        { alternativaEscolhida: null, escolhidaCorreta: false },
        { alternativaEscolhida: 12, escolhidaCorreta: true }
    ]);
    assert.deepEqual(r, { total: 4, acertos: 2, erros: 1, emBranco: 1, percentual: 50, nota: 5 });
});
