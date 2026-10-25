import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, definirAoExpirarSessao, lerToken, salvarToken } from '../api/cliente'
import { AuthContext } from './contextos'

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  // Se há token salvo, precisamos confirmar a sessão com o servidor antes de liberar as rotas
  const [carregando, setCarregando] = useState(() => Boolean(lerToken()))

  const encerrarLocal = useCallback(() => {
    salvarToken(null)
    setUsuario(null)
  }, [])

  useEffect(() => {
    definirAoExpirarSessao(encerrarLocal)
    if (!lerToken()) return
    api
      .get('/auth/me')
      .then((r) => setUsuario(r.usuario))
      .catch(() => encerrarLocal())
      .finally(() => setCarregando(false))
  }, [encerrarLocal])

  const entrar = useCallback(async (email, senha) => {
    const r = await api.post('/auth/login', { email, senha })
    salvarToken(r.token)
    setUsuario(r.usuario)
    return r
  }, [])

  const cadastrar = useCallback(async (dados) => {
    const r = await api.post('/auth/cadastro', dados)
    salvarToken(r.token)
    setUsuario(r.usuario)
    return r
  }, [])

  const sair = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // mesmo sem resposta do servidor, a sessão local é encerrada
    }
    encerrarLocal()
  }, [encerrarLocal])

  const valor = useMemo(
    () => ({ usuario, carregando, entrar, cadastrar, sair, setUsuario, encerrarLocal }),
    [usuario, carregando, entrar, cadastrar, sair, encerrarLocal],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
