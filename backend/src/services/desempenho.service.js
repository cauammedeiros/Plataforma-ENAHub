const db = require('../database');
const { arredondar } = require('../utils/pontuacao');
const { finalizarExpirados } = require('./simulados.service');

function dataLocal(data) {
    // YYYY-MM-DD no fuso horário do servidor
    return data.toLocaleDateString('sv-SE');
}

// Quantidade de dias consecutivos com atividade, terminando hoje ou ontem
function calcularDiasSeguidos(diasComAtividade, hoje = new Date()) {
    const dias = new Set(diasComAtividade);
    const cursor = new Date(hoje);
    if (!dias.has(dataLocal(cursor))) cursor.setDate(cursor.getDate() - 1);

    let sequencia = 0;
    while (dias.has(dataLocal(cursor))) {
        sequencia++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return sequencia;
}

// Exibe apenas o primeiro nome e a inicial do sobrenome (privacidade no ranking)
function abreviarNome(nome) {
    const partes = String(nome).trim().split(/\s+/);
    return partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1][0]}.` : partes[0];
}

// RF021 — evolução, média e desempenho por tema
async function resumo(usuarioId) {
    await finalizarExpirados(usuarioId);

    const [[geral]] = await db.query(
        `SELECT COUNT(*) AS total_simulados, AVG(percentual) AS media_percentual, AVG(nota) AS media_nota,
                MAX(percentual) AS melhor_percentual, SUM(acertos) AS total_acertos,
                SUM(acertos + erros + em_branco) AS total_questoes_simulados
           FROM simulados WHERE usuario_id = ? AND status = 'finalizado'`,
        [usuarioId]
    );
    const [ultimos] = await db.query(
        `SELECT id, nome, percentual, nota, acertos, quantidade_questoes, data_fim
           FROM simulados WHERE usuario_id = ? AND status = 'finalizado'
          ORDER BY data_fim DESC, id DESC LIMIT 20`,
        [usuarioId]
    );
    const [[respondidas]] = await db.query(
        `SELECT COUNT(DISTINCT r.questao_id) AS total
           FROM respostas r JOIN simulados s ON s.id = r.simulado_id
          WHERE s.usuario_id = ?`,
        [usuarioId]
    );
    const [[banco]] = await db.query("SELECT COUNT(*) AS total FROM questoes WHERE status = 'aprovada'");
    const [porTema] = await db.query(
        `SELECT COALESCE(t.nome, 'Sem tema') AS tema, COUNT(*) AS total, SUM(sq.acertou = 1) AS acertos
           FROM simulado_questoes sq
           JOIN simulados s ON s.id = sq.simulado_id
           JOIN questoes q ON q.id = sq.questao_id
           LEFT JOIN temas t ON t.id = q.tema_id
          WHERE s.usuario_id = ? AND s.status = 'finalizado'
          GROUP BY COALESCE(t.nome, 'Sem tema')
          ORDER BY tema`,
        [usuarioId]
    );
    const [dias] = await db.query(
        `SELECT DISTINCT DATE_FORMAT(respondida_em, '%Y-%m-%d') AS dia
           FROM respostas r JOIN simulados s ON s.id = r.simulado_id
          WHERE s.usuario_id = ?
         UNION
         SELECT DISTINCT DATE_FORMAT(data_inicio, '%Y-%m-%d') FROM simulados WHERE usuario_id = ?`,
        [usuarioId, usuarioId]
    );
    const [emAndamento] = await db.query(
        "SELECT id FROM simulados WHERE usuario_id = ? AND status = 'em_andamento'", [usuarioId]
    );

    const numero = (v) => (v === null ? null : arredondar(Number(v)));
    return {
        total_simulados: geral.total_simulados,
        media_percentual: numero(geral.media_percentual),
        media_nota: numero(geral.media_nota),
        melhor_percentual: numero(geral.melhor_percentual),
        ultimo_simulado: ultimos[0]
            ? { ...ultimos[0], percentual: Number(ultimos[0].percentual), nota: Number(ultimos[0].nota) }
            : null,
        questoes_respondidas: respondidas.total,
        questoes_disponiveis: banco.total,
        dias_seguidos: calcularDiasSeguidos(dias.map((d) => d.dia)),
        simulado_em_andamento_id: emAndamento[0] ? emAndamento[0].id : null,
        evolucao: ultimos.reverse().map((s) => ({
            id: s.id, data: s.data_fim, percentual: Number(s.percentual), nota: Number(s.nota)
        })),
        por_tema: porTema.map((t) => ({
            tema: t.tema,
            total: t.total,
            acertos: Number(t.acertos),
            percentual: arredondar((Number(t.acertos) / t.total) * 100)
        }))
    };
}

// RF022 — ranking geral pela média de aproveitamento dos simulados finalizados
async function ranking(usuarioId, cursoId) {
    const [linhas] = await db.query(
        `SELECT u.id, u.nome, c.nome AS curso, COUNT(s.id) AS simulados,
                AVG(s.percentual) AS media_percentual,
                RANK() OVER (ORDER BY AVG(s.percentual) DESC) AS posicao
           FROM simulados s
           JOIN usuarios u ON u.id = s.usuario_id
           LEFT JOIN cursos c ON c.id = u.curso_id
          WHERE s.status = 'finalizado' AND u.perfil = 'aluno' AND u.bloqueado = 0
                ${cursoId ? 'AND u.curso_id = ?' : ''}
          GROUP BY u.id, u.nome, c.nome
          ORDER BY posicao, simulados DESC, u.id`,
        cursoId ? [cursoId] : []
    );

    const formatar = (l) => ({
        posicao: l.posicao,
        usuario_id: l.id,
        nome: abreviarNome(l.nome),
        curso: l.curso,
        simulados: l.simulados,
        media_percentual: arredondar(Number(l.media_percentual)),
        eu: l.id === usuarioId
    });
    const minha = linhas.find((l) => l.id === usuarioId);
    return {
        ranking: linhas.slice(0, 20).map(formatar),
        minha_posicao: minha ? formatar(minha) : null,
        participantes: linhas.length
    };
}

module.exports = { resumo, ranking, calcularDiasSeguidos, abreviarNome };
