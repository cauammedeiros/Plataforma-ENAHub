const config = require('../config');
const authService = require('../services/auth.service');
const { Validador } = require('../utils/validacao');

const MENSAGEM_RECUPERACAO = 'Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.';

async function cadastrar(req, res) {
    const v = new Validador(req.body);
    const dados = {
        nome: v.texto('nome', { min: 3, max: 100, rotulo: 'Nome completo' }),
        email: v.email(),
        senha: v.senha(),
        cursoId: v.inteiro('curso_id', { min: 1, rotulo: 'Curso' }),
        instituicao: v.texto('instituicao', { min: 2, max: 150, rotulo: 'Instituição' })
    };
    if (req.body.aceite_termos !== true) v.erro('aceite_termos', 'É necessário aceitar os termos de uso e a política de privacidade.');
    v.verificar();

    const resultado = await authService.cadastrar(dados);
    res.status(201).json({ mensagem: 'Conta criada com sucesso!', ...resultado });
}

async function login(req, res) {
    const v = new Validador(req.body);
    const email = v.email();
    v.texto('senha', { rotulo: 'Senha' });
    v.verificar();

    const resultado = await authService.login({ email, senha: req.body.senha });
    res.json({ mensagem: `Bem-vindo(a), ${resultado.usuario.nome.split(' ')[0]}!`, ...resultado });
}

async function logout(req, res) {
    await authService.logout(req.tokenHash);
    res.json({ mensagem: 'Sessão encerrada.' });
}

async function eu(req, res) {
    res.json({ usuario: await authService.buscarUsuarioPublico(req.usuario.id) });
}

async function esqueciSenha(req, res) {
    const v = new Validador(req.body);
    const email = v.email();
    v.verificar();

    const link = await authService.solicitarRecuperacao(email);
    const resposta = { mensagem: MENSAGEM_RECUPERACAO };
    // Sem servidor de e-mail: só devolve o link se habilitado explicitamente (ver config.js)
    if (link && config.linkRecuperacaoNaResposta) resposta.link_desenvolvimento = link;
    res.json(resposta);
}

async function redefinirSenha(req, res) {
    const v = new Validador(req.body);
    const token = v.texto('token', { max: 128, rotulo: 'Token' });
    const novaSenha = v.senha('nova_senha', { rotulo: 'Nova senha' });
    v.verificar();

    await authService.redefinirSenha({ token, novaSenha });
    res.json({ mensagem: 'Senha alterada com sucesso. Faça login com a nova senha.' });
}

module.exports = { cadastrar, login, logout, eu, esqueciSenha, redefinirSenha };
