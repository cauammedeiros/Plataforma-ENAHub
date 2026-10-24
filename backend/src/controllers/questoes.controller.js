const questoesService = require('../services/questoes.service');
const favoritosService = require('../services/favoritos.service');
const { Validador, idParam } = require('../utils/validacao');

const DIFICULDADES = ['facil', 'media', 'dificil'];
const ANO_ATUAL = new Date().getFullYear();

async function listar(req, res) {
    const v = new Validador(req.query);
    const filtros = {
        busca: v.texto('busca', { obrigatorio: false, max: 100 }),
        cursoId: v.inteiro('curso_id', { obrigatorio: false, min: 1 }),
        ano: v.inteiro('ano', { obrigatorio: false, min: 2004, max: ANO_ATUAL }),
        temaId: v.inteiro('tema_id', { obrigatorio: false, min: 1 }),
        dificuldade: v.opcao('dificuldade', DIFICULDADES, { obrigatorio: false }),
        status: v.opcao('status', ['pendente', 'aprovada', 'rejeitada', 'arquivada'], { obrigatorio: false }),
        favoritas: req.query.favoritas === 'true',
        minhas: req.query.minhas === 'true',
        pagina: v.inteiro('pagina', { obrigatorio: false, min: 1 }) || 1,
        limite: v.inteiro('limite', { obrigatorio: false, min: 1, max: 50 }) || 10
    };
    v.verificar();
    res.json(await questoesService.listar(req.usuario, filtros));
}

async function detalhar(req, res) {
    res.json(await questoesService.detalhar(req.usuario, idParam(req.params.id)));
}

async function responder(req, res) {
    const v = new Validador(req.body);
    const alternativaId = v.inteiro('alternativa_id', { min: 1, rotulo: 'Alternativa' });
    v.verificar();
    res.json(await questoesService.responderPratica(req.usuario, idParam(req.params.id), alternativaId));
}

// Valida o corpo usado no cadastro e na edição (RF006–RF010)
function lerQuestao(corpo) {
    const v = new Validador(corpo);
    const dados = {
        enunciado: v.texto('enunciado', { min: 10, max: 10000, rotulo: 'Enunciado' }),
        ano: v.inteiro('ano', { obrigatorio: false, min: 2010, max: ANO_ATUAL, rotulo: 'Ano' }),
        dificuldade: v.opcao('dificuldade', DIFICULDADES, { rotulo: 'Dificuldade' }),
        cursoId: v.inteiro('curso_id', { min: 1, rotulo: 'Curso' }),
        temaId: v.inteiro('tema_id', { obrigatorio: false, min: 1, rotulo: 'Tema' }),
        fonte: v.texto('fonte', { obrigatorio: false, max: 255, rotulo: 'Fonte' }),
        oficialEnade: corpo.oficial_enade === true,
        correta: v.opcao('correta', questoesService.LETRAS, { rotulo: 'Alternativa correta' }),
        alternativas: []
    };

    if (!Array.isArray(corpo.alternativas) || corpo.alternativas.length !== 5) {
        v.erro('alternativas', 'Informe as 5 alternativas (A a E).');
    } else {
        questoesService.LETRAS.forEach((letra, i) => {
            const alt = corpo.alternativas[i] || {};
            const texto = typeof alt.texto === 'string' ? alt.texto.trim() : '';
            if (!texto) v.erro(`alternativa_${letra}`, `Preencha a alternativa ${letra}.`);
            else if (texto.length > 2000) v.erro(`alternativa_${letra}`, `Alternativa ${letra} muito longa.`);
            dados.alternativas.push({ letra, texto });
        });
    }
    if (dados.oficialEnade && !dados.ano) v.erro('ano', 'Questões oficiais do ENADE precisam do ano da prova.');
    v.verificar();
    return dados;
}

async function criar(req, res) {
    const questao = await questoesService.criar(req.usuario, lerQuestao(req.body));
    const mensagem = questao.status === 'aprovada'
        ? 'Questão cadastrada e publicada.'
        : 'Questão cadastrada e enviada para aprovação do administrador.';
    res.status(201).json({ mensagem, questao });
}

async function atualizar(req, res) {
    const questao = await questoesService.atualizar(req.usuario, idParam(req.params.id), lerQuestao(req.body));
    res.json({ mensagem: 'Questão atualizada.', questao });
}

async function alterarStatus(req, res) {
    const v = new Validador(req.body);
    const status = v.opcao('status', ['aprovada', 'rejeitada'], { rotulo: 'Status' });
    v.verificar();
    const resultado = await questoesService.alterarStatus(req.usuario, idParam(req.params.id), status);
    res.json({ mensagem: status === 'aprovada' ? 'Questão aprovada e publicada.' : 'Questão rejeitada.', ...resultado });
}

async function excluir(req, res) {
    const resultado = await questoesService.excluir(req.usuario, idParam(req.params.id));
    res.json({
        mensagem: resultado.arquivada
            ? 'A questão já foi usada em simulados e foi arquivada para preservar o histórico.'
            : 'Questão excluída.',
        ...resultado
    });
}

async function comentarios(req, res) {
    res.json(await questoesService.listarComentarios(idParam(req.params.id)));
}

async function comentar(req, res) {
    const v = new Validador(req.body);
    const dados = {
        texto: v.texto('texto', { min: 3, max: 10000, rotulo: 'Comentário' }),
        imagemUrl: v.url('imagem_url', { rotulo: 'URL da imagem' }),
        videoUrl: v.url('video_url', { rotulo: 'URL do vídeo' })
    };
    v.verificar();
    const resultado = await questoesService.comentar(req.usuario, idParam(req.params.id), dados);
    res.status(201).json({ mensagem: 'Comentário adicionado.', ...resultado });
}

async function excluirComentario(req, res) {
    await questoesService.excluirComentario(req.usuario, idParam(req.params.comentarioId));
    res.json({ mensagem: 'Comentário removido.' });
}

async function favoritar(req, res) {
    res.json(await favoritosService.adicionar(req.usuario.id, idParam(req.params.id)));
}

async function desfavoritar(req, res) {
    res.json(await favoritosService.remover(req.usuario.id, idParam(req.params.id)));
}

async function favoritas(req, res) {
    res.json(await favoritosService.listar(req.usuario.id));
}

module.exports = {
    listar, detalhar, responder, criar, atualizar, alterarStatus, excluir,
    comentarios, comentar, excluirComentario, favoritar, desfavoritar, favoritas
};
