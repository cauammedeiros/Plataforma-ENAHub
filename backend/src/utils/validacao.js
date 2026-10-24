const AppError = require('./AppError');

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validador simples: acumula os erros por campo e, ao final,
 * lança um único AppError 400 com todos eles.
 *
 * Exemplo:
 *   const v = new Validador(req.body);
 *   const nome = v.texto('nome', { min: 3, max: 100 });
 *   v.verificar();
 */
class Validador {
    constructor(dados) {
        this.dados = dados || {};
        this.erros = {};
    }

    erro(campo, mensagem) {
        if (!this.erros[campo]) this.erros[campo] = mensagem;
    }

    vazio(valor) {
        return valor === undefined || valor === null || String(valor).trim() === '';
    }

    texto(campo, { obrigatorio = true, min = 0, max = 65535, rotulo = campo } = {}) {
        const valor = this.dados[campo];
        if (this.vazio(valor)) {
            if (obrigatorio) this.erro(campo, `${rotulo} é obrigatório.`);
            return null;
        }
        if (typeof valor !== 'string') {
            this.erro(campo, `${rotulo} deve ser um texto.`);
            return null;
        }
        const texto = valor.trim();
        if (texto.length < min) this.erro(campo, `${rotulo} deve ter pelo menos ${min} caracteres.`);
        if (texto.length > max) this.erro(campo, `${rotulo} deve ter no máximo ${max} caracteres.`);
        return texto;
    }

    email(campo = 'email') {
        const valor = this.texto(campo, { max: 150, rotulo: 'E-mail' });
        if (valor && !REGEX_EMAIL.test(valor)) this.erro(campo, 'Informe um e-mail válido.');
        return valor ? valor.toLowerCase() : null;
    }

    senha(campo = 'senha', { obrigatorio = true, rotulo = 'Senha' } = {}) {
        const valor = this.dados[campo];
        if (this.vazio(valor)) {
            if (obrigatorio) this.erro(campo, `${rotulo} é obrigatória.`);
            return null;
        }
        if (typeof valor !== 'string' || valor.length < 8 || valor.length > 72) {
            this.erro(campo, `${rotulo} deve ter entre 8 e 72 caracteres.`);
            return null;
        }
        if (!/[A-Za-z]/.test(valor) || !/\d/.test(valor)) {
            this.erro(campo, `${rotulo} deve conter letras e números.`);
            return null;
        }
        return valor;
    }

    inteiro(campo, { obrigatorio = true, min = -Infinity, max = Infinity, rotulo = campo } = {}) {
        const valor = this.dados[campo];
        if (this.vazio(valor)) {
            if (obrigatorio) this.erro(campo, `${rotulo} é obrigatório.`);
            return null;
        }
        const numero = Number(valor);
        if (!Number.isInteger(numero)) {
            this.erro(campo, `${rotulo} deve ser um número inteiro.`);
            return null;
        }
        if (numero < min || numero > max) {
            this.erro(campo, `${rotulo} deve estar entre ${min} e ${max}.`);
            return null;
        }
        return numero;
    }

    opcao(campo, opcoes, { obrigatorio = true, rotulo = campo } = {}) {
        const valor = this.dados[campo];
        if (this.vazio(valor)) {
            if (obrigatorio) this.erro(campo, `${rotulo} é obrigatório.`);
            return null;
        }
        if (!opcoes.includes(valor)) {
            this.erro(campo, `${rotulo} inválido. Use: ${opcoes.join(', ')}.`);
            return null;
        }
        return valor;
    }

    url(campo, { rotulo = campo } = {}) {
        const valor = this.texto(campo, { obrigatorio: false, max: 255, rotulo });
        if (valor && !/^https?:\/\/\S+$/i.test(valor)) {
            this.erro(campo, `${rotulo} deve ser um endereço http(s) válido.`);
            return null;
        }
        return valor;
    }

    verificar() {
        if (Object.keys(this.erros).length > 0) {
            throw new AppError(400, 'Verifique os dados informados.', this.erros);
        }
    }
}

// Converte parâmetro de rota (:id) em inteiro positivo ou responde 404
function idParam(valor) {
    const id = Number(valor);
    if (!Number.isInteger(id) || id <= 0) throw new AppError(404, 'Registro não encontrado.');
    return id;
}

module.exports = { Validador, idParam, REGEX_EMAIL };
