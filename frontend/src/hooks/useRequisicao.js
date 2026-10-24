import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/cliente'

/**
 * Carrega dados de um endpoint GET e controla carregamento e erro.
 * Passe `null` como caminho para não carregar nada.
 *
 *   const { dados, carregando, erro, recarregar } = useRequisicao('/questoes')
 */
export function useRequisicao(caminho) {
  const [estado, setEstado] = useState({ caminho: null, dados: null, erro: null })
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    if (!caminho) return undefined
    let ativo = true
    api.get(caminho).then(
      (dados) => {
        if (ativo) setEstado({ caminho, dados, erro: null })
      },
      (erro) => {
        if (ativo) setEstado({ caminho, dados: null, erro })
      },
    )
    return () => {
      ativo = false
    }
  }, [caminho, versao])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  const atualizarDados = useCallback((fn) => setEstado((e) => ({ ...e, dados: fn(e.dados) })), [])

  return {
    dados: estado.caminho === caminho ? estado.dados : null,
    erro: estado.caminho === caminho ? estado.erro : null,
    carregando: Boolean(caminho) && estado.caminho !== caminho,
    recarregar,
    atualizarDados,
  }
}
