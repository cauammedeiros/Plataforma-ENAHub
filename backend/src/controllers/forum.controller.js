const forumService = require('../services/forum.service');
const { Validador, idParam } = require('../utils/validacao');

async function listar(req, res) {
    const v = new Validador(req.query);
    const filtros = {
        busca: v.texto('busca', { obrigatorio: false, max: 100 }),
        pagina: v.inteiro('pagina', { obrigatorio: false, min: 1 }) || 1
    };
    v.verificar();
    res.json(await forumService.listarTopicos(req.usuario, filtros));
}

async function detalhar(req, res) {
    res.json(await forumService.detalharTopico(req.usuario, idParam(req.params.id)));
}

async function criar(req, res) {
    const v = new Validador(req.body);
    const dados = {
        titulo: v.texto('titulo', { min: 5, max: 200, rotulo: 'Título' }),
        conteudo: v.texto('conteudo', { min: 10, max: 10000, rotulo: 'Conteúdo' })
    };
    v.verificar();
    const resultado = await forumService.criarTopico(req.usuario, dados);
    res.status(201).json({ mensagem: 'Tópico publicado.', ...resultado });
}

async function responder(req, res) {
    const v = new Validador(req.body);
    const conteudo = v.texto('conteudo', { min: 2, max: 10000, rotulo: 'Resposta' });
    v.verificar();
    const resultado = await forumService.responder(req.usuario, idParam(req.params.id), conteudo);
    res.status(201).json({ mensagem: 'Resposta publicada.', ...resultado });
}

async function excluirTopico(req, res) {
    await forumService.excluirTopico(req.usuario, idParam(req.params.id));
    res.json({ mensagem: 'Tópico excluído.' });
}

async function excluirResposta(req, res) {
    await forumService.excluirResposta(req.usuario, idParam(req.params.id));
    res.json({ mensagem: 'Resposta excluída.' });
}

async function curtirTopico(req, res) {
    res.json(await forumService.alternarCurtida(req.usuario, 'topico', idParam(req.params.id)));
}

async function curtirResposta(req, res) {
    res.json(await forumService.alternarCurtida(req.usuario, 'resposta', idParam(req.params.id)));
}

async function denunciar(req, res) {
    const v = new Validador(req.body);
    const dados = {
        tipo: v.opcao('tipo', Object.keys(forumService.ALVOS_DENUNCIA), { rotulo: 'Tipo' }),
        id: v.inteiro('id', { min: 1, rotulo: 'Conteúdo' }),
        motivo: v.texto('motivo', { min: 5, max: 1000, rotulo: 'Motivo' })
    };
    v.verificar();
    await forumService.denunciar(req.usuario, dados);
    res.status(201).json({ mensagem: 'Denúncia enviada para análise da administração.' });
}

module.exports = {
    listar, detalhar, criar, responder, excluirTopico, excluirResposta, curtirTopico, curtirResposta, denunciar
};
