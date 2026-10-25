import { useState } from 'react'
import { api } from '../api/cliente'
import { useToast } from '../contexts/contextos'

export default function BotaoFavorito({ questaoId, favorita, aoAlterar }) {
  const toast = useToast()
  const [salvando, setSalvando] = useState(false)

  async function alternar() {
    setSalvando(true)
    try {
      const r = favorita
        ? await api.delete(`/questoes/${questaoId}/favorito`)
        : await api.post(`/questoes/${questaoId}/favorito`)
      aoAlterar?.(r.favorita)
      toast.sucesso(r.favorita ? 'Questão adicionada aos favoritos.' : 'Questão removida dos favoritos.')
    } catch (erro) {
      toast.erro(erro.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <button
      type="button"
      className={`btn btn-favorito ${favorita ? 'ativo' : ''}`}
      onClick={alternar}
      disabled={salvando}
      aria-pressed={favorita}
      title={favorita ? 'Remover dos favoritos' : 'Favoritar questão'}
    >
      <span aria-hidden="true">{favorita ? '★' : '☆'}</span>
      <span className="visually-hidden">{favorita ? 'Remover dos favoritos' : 'Favoritar questão'}</span>
    </button>
  )
}
