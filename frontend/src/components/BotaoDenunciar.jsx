import { useState } from 'react'
import { api } from '../api/cliente'
import { useToast } from '../contexts/contextos'
import Campo from './Campo'
import Modal from './Modal'

// RF029 — envia o conteúdo para análise do administrador
export default function BotaoDenunciar({ tipo, id }) {
  const toast = useToast()
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    if (motivo.trim().length < 5) {
      setErro('Descreva o motivo (mínimo de 5 caracteres).')
      return
    }
    setEnviando(true)
    try {
      const r = await api.post('/forum/denuncias', { tipo, id, motivo: motivo.trim() })
      toast.sucesso(r.mensagem)
      setAberto(false)
      setMotivo('')
      setErro('')
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <button type="button" className="btn btn-link btn-sm text-secondary p-0" onClick={() => setAberto(true)}>Denunciar</button>
      <Modal
        titulo="Denunciar conteúdo"
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        rodape={(
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setAberto(false)}>Cancelar</button>
            <button type="button" className="btn btn-danger" disabled={enviando} onClick={enviar}>Enviar denúncia</button>
          </>
        )}
      >
        <Campo rotulo="Por que este conteúdo é inadequado?" como="textarea" rows={3} maxLength={1000}
          value={motivo} onChange={(e) => setMotivo(e.target.value)} erro={erro} />
      </Modal>
    </>
  )
}
