import { useState } from 'react'
import { api } from '../api/cliente'
import { useToast } from '../contexts/contextos'

// RF028 — curtir/descurtir tópico ou resposta
export default function BotaoCurtir({ caminho, curtido, curtidas, aoAlterar }) {
  const toast = useToast()
  const [enviando, setEnviando] = useState(false)

  async function alternar() {
    setEnviando(true)
    try {
      aoAlterar(await api.post(caminho))
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <button type="button" className={`btn btn-sm ${curtido ? 'btn-dark' : 'btn-light border'}`} aria-pressed={curtido}
      disabled={enviando} onClick={alternar}>
      {curtido ? 'Curtido' : 'Curtir'} · {curtidas}
    </button>
  )
}
