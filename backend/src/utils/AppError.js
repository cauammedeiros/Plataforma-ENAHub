/**
 * Erro "esperado" da aplicação: carrega o status HTTP e uma mensagem
 * que pode ser exibida ao usuário.
 */
class AppError extends Error {
    constructor(status, mensagem, detalhes) {
        super(mensagem);
        this.status = status;
        this.detalhes = detalhes;
    }
}

module.exports = AppError;
