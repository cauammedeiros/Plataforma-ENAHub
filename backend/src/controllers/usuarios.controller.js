const usuariosService = require('../services/usuarios.service');
const { Validador } = require('../utils/validacao');

async function atualizarPerfil(req, res) {
    const v = new Validador(req.body);
    const dados = {
        nome: v.texto('nome', { obrigatorio: false, min: 3, max: 100, rotulo: 'Nome completo' }),
        cursoId: v.inteiro('curso_id', { obrigatorio: false, min: 1, rotulo: 'Curso' }),
        instituicao: v.texto('instituicao', { obrigatorio: false, min: 2, max: 150, rotulo: 'Instituição' }),
        novaSenha: v.senha('nova_senha', { obrigatorio: false, rotulo: 'Nova senha' }),
        senhaAtual: req.body.senha_atual
    };
    v.verificar();

    const usuario = await usuariosService.atualizarPerfil(req.usuario.id, dados, req.tokenHash);
    res.json({ mensagem: 'Perfil atualizado com sucesso.', usuario });
}

async function excluirConta(req, res) {
    const v = new Validador(req.body);
    v.texto('senha', { rotulo: 'Senha' });
    if (req.body.confirmacao !== 'EXCLUIR') v.erro('confirmacao', 'Digite EXCLUIR para confirmar.');
    v.verificar();

    await usuariosService.excluirConta(req.usuario.id, req.body.senha);
    res.json({ mensagem: 'Sua conta e seus dados foram excluídos.' });
}

module.exports = { atualizarPerfil, excluirConta };
