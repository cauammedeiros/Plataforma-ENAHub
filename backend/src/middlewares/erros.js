const AppError = require('../utils/AppError');

function rotaNaoEncontrada(req, res) {
    res.status(404).json({ mensagem: 'Rota não encontrada.' });
}

// Express 5 encaminha para cá também os erros lançados em funções async
// eslint-disable-next-line no-unused-vars
function tratarErros(erro, req, res, next) {
    if (erro instanceof AppError) {
        return res.status(erro.status).json({ mensagem: erro.message, erros: erro.detalhes });
    }
    if (erro.type === 'entity.parse.failed') {
        return res.status(400).json({ mensagem: 'JSON inválido no corpo da requisição.' });
    }
    if (erro.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ mensagem: 'Registro duplicado.' });
    }
    if (erro.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({ mensagem: 'Registro em uso por outros dados e não pode ser removido.' });
    }

    console.error(erro);
    res.status(500).json({ mensagem: 'Erro interno no servidor.' });
}

module.exports = { rotaNaoEncontrada, tratarErros };
