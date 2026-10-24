const adminService = require('../services/admin.service');
const simuladosService = require('../services/simulados.service');
const { LIMITES } = require('./simulados.controller');
const { Validador, idParam } = require('../utils/validacao');

const PERFIS = ['aluno', 'professor', 'admin'];

async function usuarios(req, res) {
    const v = new Validador(req.query);
    const filtros = {
        busca: v.texto('busca', { obrigatorio: false, max: 100 }),
        perfil: v.opcao('perfil', PERFIS, { obrigatorio: false })
    };
    v.verificar();
    res.json(await adminService.listarUsuarios(filtros));
}

async function atualizarUsuario(req, res) {
    const v = new Validador(req.body);
    const perfil = v.opcao('perfil', PERFIS, { obrigatorio: false, rotulo: 'Perfil' });
    const bloqueado = req.body.bloqueado;
    if (bloqueado !== undefined && typeof bloqueado !== 'boolean') v.erro('bloqueado', 'Valor inválido.');
    v.verificar();
    const resultado = await adminService.atualizarUsuario(req.usuario, idParam(req.params.id), { perfil, bloqueado });
    res.json({ mensagem: 'Usuário atualizado.', ...resultado });
}

async function denuncias(req, res) {
    const v = new Validador(req.query);
    const status = v.opcao('status', ['pendente', 'procedente', 'improcedente'], { obrigatorio: false });
    v.verificar();
    res.json(await adminService.listarDenuncias(status || 'pendente'));
}

async function analisarDenuncia(req, res) {
    const v = new Validador(req.body);
    const status = v.opcao('status', ['procedente', 'improcedente'], { rotulo: 'Decisão' });
    v.verificar();
    const resultado = await adminService.analisarDenuncia(req.usuario, idParam(req.params.id), status);
    res.json({
        mensagem: status === 'procedente' ? 'Denúncia procedente: conteúdo removido do fórum.' : 'Denúncia arquivada.',
        ...resultado
    });
}

async function relatorios(req, res) {
    res.json(await adminService.relatorios());
}

async function modelos(req, res) {
    res.json(await simuladosService.listarModelos({ incluirInativos: true }));
}

async function criarModelo(req, res) {
    const v = new Validador(req.body);
    const dados = {
        nome: v.texto('nome', { min: 3, max: 100, rotulo: 'Nome' }),
        descricao: v.texto('descricao', { obrigatorio: false, max: 255, rotulo: 'Descrição' }),
        cursoId: v.inteiro('curso_id', { obrigatorio: false, min: 1 }),
        tempoMinutos: v.inteiro('tempo_minutos', { min: LIMITES.tempoMin, max: LIMITES.tempoMax, rotulo: 'Tempo' }),
        questaoIds: req.body.questao_ids
    };
    const ids = dados.questaoIds;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > LIMITES.questoesMax
        || !ids.every((id) => Number.isInteger(id) && id > 0)) {
        v.erro('questao_ids', `Selecione entre 1 e ${LIMITES.questoesMax} questões.`);
    }
    v.verificar();
    const resultado = await simuladosService.criarModelo(req.usuario, dados);
    res.status(201).json({ mensagem: 'Simulado oficial criado.', ...resultado });
}

async function alterarModelo(req, res) {
    if (typeof req.body.ativo !== 'boolean') {
        const v = new Validador({});
        v.erro('ativo', 'Valor inválido.');
        v.verificar();
    }
    const resultado = await simuladosService.alterarModelo(idParam(req.params.id), req.body.ativo);
    res.json({ mensagem: req.body.ativo ? 'Simulado oficial ativado.' : 'Simulado oficial desativado.', ...resultado });
}

module.exports = {
    usuarios, atualizarUsuario, denuncias, analisarDenuncia, relatorios, modelos, criarModelo, alterarModelo
};
