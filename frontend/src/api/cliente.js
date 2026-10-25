// Cliente HTTP da API do ENAHub. Todas as chamadas passam por aqui.
const BASE = import.meta.env.VITE_API_URL || '/api'
const CHAVE_TOKEN = 'enahub_token'

export class ErroApi extends Error {
  constructor(status, mensagem, erros) {
    super(mensagem)
    this.status = status
    this.erros = erros || {}
  }
}

export function lerToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN)
  } catch {
    return null
  }
}

export function salvarToken(token) {
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token)
    else localStorage.removeItem(CHAVE_TOKEN)
  } catch {
    // navegação privada sem localStorage: a sessão dura até fechar a aba
  }
}

// Avisado quando a API responde 401 (sessão expirada) para deslogar o usuário
let aoExpirarSessao = () => {}
export function definirAoExpirarSessao(fn) {
  aoExpirarSessao = fn
}

async function requisicao(metodo, caminho, corpo) {
  const token = lerToken()
  let resposta
  try {
    resposta = await fetch(BASE + caminho, {
      method: metodo,
      headers: {
        ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    })
  } catch {
    throw new ErroApi(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.')
  }

  const texto = await resposta.text()
  let dados
  try {
    dados = texto ? JSON.parse(texto) : null
  } catch {
    dados = null
  }

  if (!resposta.ok) {
    if (resposta.status === 401 && token) aoExpirarSessao()
    throw new ErroApi(resposta.status, dados?.mensagem || 'Erro inesperado. Tente novamente.', dados?.erros)
  }
  return dados
}

export const api = {
  get: (caminho) => requisicao('GET', caminho),
  post: (caminho, corpo = {}) => requisicao('POST', caminho, corpo),
  put: (caminho, corpo = {}) => requisicao('PUT', caminho, corpo),
  patch: (caminho, corpo = {}) => requisicao('PATCH', caminho, corpo),
  delete: (caminho, corpo) => requisicao('DELETE', caminho, corpo),
}

// Monta a query string ignorando filtros vazios
export function query(params) {
  const busca = new URLSearchParams()
  Object.entries(params).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') busca.set(chave, valor)
  })
  const texto = busca.toString()
  return texto ? `?${texto}` : ''
}
