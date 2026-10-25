/**
 * Regras de cálculo do resultado de um simulado (RF019).
 *
 * - acertos: questões respondidas com a alternativa correta
 * - erros: questões respondidas com alternativa incorreta
 * - emBranco: questões sem resposta
 * - percentual: acertos / total * 100 (duas casas decimais)
 * - nota: acertos / total * 10 (duas casas decimais)
 *
 * Exemplo: 30 acertos em 40 questões => 75% e nota 7,5.
 */
function arredondar(valor) {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function calcularResultado({ total, acertos, respondidas }) {
    if (!Number.isInteger(total) || total < 0) throw new Error('total inválido');
    if (!Number.isInteger(acertos) || acertos < 0) throw new Error('acertos inválido');
    if (!Number.isInteger(respondidas) || respondidas < acertos || respondidas > total) {
        throw new Error('respondidas inválido');
    }

    const erros = respondidas - acertos;
    const emBranco = total - respondidas;
    const percentual = total === 0 ? 0 : arredondar((acertos / total) * 100);
    const nota = total === 0 ? 0 : arredondar((acertos / total) * 10);

    return { total, acertos, erros, emBranco, percentual, nota };
}

/**
 * Recebe a lista de questões de uma tentativa com a alternativa escolhida
 * (ou null) e se ela é correta, e devolve o resultado consolidado.
 */
function corrigir(questoes) {
    let acertos = 0;
    let respondidas = 0;
    for (const q of questoes) {
        if (q.alternativaEscolhida == null) continue;
        respondidas++;
        if (q.escolhidaCorreta) acertos++;
    }
    return calcularResultado({ total: questoes.length, acertos, respondidas });
}

module.exports = { calcularResultado, corrigir, arredondar };
