import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/cliente'
import Alerta from '../components/Alerta'
import BotaoCurtir from '../components/BotaoCurtir'
import BotaoDenunciar from '../components/BotaoDenunciar'
import Carregando from '../components/Carregando'
import Modal from '../components/Modal'
import { useAuth, useToast } from '../contexts/contextos'
import { useRequisicao } from '../hooks/useRequisicao'
import { PERFIS, tempoRelativo } from '../utils/formatar'

export default function Topico() {
  const { id } = useParams()
  const { usuario } = useAuth()
  const toast = useToast()
  const navegar = useNavigate()
  const { dados: t, carregando, erro, recarregar, atualizarDados } = useRequisicao(`/forum/topicos/${id}`)
  const [resposta, setResposta] = useState('')
  const [erroResposta, setErroResposta] = useState('')
  const [enviando, setEnviando] = useState(false)
  // { tipo: 'topico' } ou { tipo: 'resposta', id } aguardando confirmação
  const [exclusao, setExclusao] = useState(null)

  if (carregando) return <Carregando />
  if (erro) return <Alerta aoTentarNovamente={erro.status === 404 ? undefined : recarregar}>{erro.message}</Alerta>
  if (!t) return null

  const podeExcluir = (autorId) => usuario.perfil === 'admin' || autorId === usuario.id

  async function responder(e) {
    e.preventDefault()
    if (resposta.trim().length < 2) {
      setErroResposta('Escreva sua resposta.')
      return
    }
    setEnviando(true)
    try {
      const r = await api.post(`/forum/topicos/${id}/respostas`, { conteudo: resposta.trim() })
      toast.sucesso(r.mensagem)
      setResposta('')
      setErroResposta('')
      recarregar()
    } catch (er) {
      toast.erro(er.message)
    } finally {
      setEnviando(false)
    }
  }

  async function excluirTopico() {
    try {
      await api.delete(`/forum/topicos/${id}`)
      toast.sucesso('Tópico excluído.')
      navegar('/forum')
    } catch (er) {
      toast.erro(er.message)
    }
  }

  async function excluirResposta(respostaId) {
    try {
      await api.delete(`/forum/respostas/${respostaId}`)
      toast.sucesso('Resposta excluída.')
      recarregar()
    } catch (er) {
      toast.erro(er.message)
    }
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 860 }}>
      <Link to="/forum" className="small">← Voltar ao fórum</Link>
      <article className="card mt-3">
        <div className="card-body p-3 p-md-4">
          {t.oculto && <div className="alert alert-warning py-2 small">Tópico oculto pela moderação.</div>}
          <h1 className="h4 fw-bold">{t.titulo}</h1>
          <div className="small text-secondary mb-3">Postado por <strong>{t.autor}</strong> • {tempoRelativo(t.criado_em)}</div>
          <p className="texto-quebra">{t.conteudo}</p>
          <div className="d-flex align-items-center gap-3">
            <BotaoCurtir caminho={`/forum/topicos/${t.id}/curtir`} curtido={t.curtido} curtidas={t.curtidas}
              aoAlterar={(r) => atualizarDados((d) => ({ ...d, ...r }))} />
            <BotaoDenunciar tipo="topico" id={t.id} />
            {podeExcluir(t.usuario_id) && (
              <button type="button" className="btn btn-link btn-sm text-danger p-0 ms-auto" onClick={() => setExclusao({ tipo: 'topico' })}>Excluir tópico</button>
            )}
          </div>
        </div>
      </article>

      <h2 className="h6 fw-bold mt-4 mb-3">{t.respostas.length} {t.respostas.length === 1 ? 'resposta' : 'respostas'}</h2>
      <div className="d-flex flex-column gap-2">
        {t.respostas.map((r) => (
          <div key={r.id} className="card"><div className="card-body py-3">
            <div className="small text-secondary mb-1">
              <strong className="text-body">{r.autor}</strong>
              {r.autor_perfil !== 'aluno' && <span className="badge text-bg-light border ms-1">{PERFIS[r.autor_perfil]}</span>} • {tempoRelativo(r.criado_em)}
            </div>
            <p className="mb-2 texto-quebra">{r.conteudo}</p>
            <div className="d-flex align-items-center gap-3">
              <BotaoCurtir caminho={`/forum/respostas/${r.id}/curtir`} curtido={r.curtido} curtidas={r.curtidas}
                aoAlterar={(novo) => atualizarDados((d) => ({ ...d, respostas: d.respostas.map((x) => (x.id === r.id ? { ...x, ...novo } : x)) }))} />
              <BotaoDenunciar tipo="resposta" id={r.id} />
              {podeExcluir(r.usuario_id) && (
                <button type="button" className="btn btn-link btn-sm text-danger p-0 ms-auto" onClick={() => setExclusao({ tipo: 'resposta', id: r.id })}>Excluir</button>
              )}
            </div>
          </div></div>
        ))}
      </div>

      <form className="card mt-4" onSubmit={responder} noValidate>
        <div className="card-body">
          <label htmlFor="nova-resposta" className="form-label fw-semibold">Sua resposta</label>
          <textarea id="nova-resposta" className={`form-control ${erroResposta ? 'is-invalid' : ''}`} rows={3} maxLength={10000}
            value={resposta} onChange={(e) => setResposta(e.target.value)} />
          {erroResposta && <div className="invalid-feedback">{erroResposta}</div>}
          <button type="submit" className="btn btn-dark mt-2" disabled={enviando}>Responder</button>
        </div>
      </form>

      <Modal
        titulo={exclusao?.tipo === 'topico' ? 'Excluir tópico' : 'Excluir resposta'}
        aberto={Boolean(exclusao)}
        aoFechar={() => setExclusao(null)}
        rodape={(
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setExclusao(null)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={() => {
              const alvo = exclusao
              setExclusao(null)
              if (alvo.tipo === 'topico') excluirTopico()
              else excluirResposta(alvo.id)
            }}>Excluir</button>
          </>
        )}
      >
        {exclusao?.tipo === 'topico' ? 'O tópico e todas as respostas serão excluídos.' : 'A resposta será excluída.'}
      </Modal>
    </div>
  )
}
