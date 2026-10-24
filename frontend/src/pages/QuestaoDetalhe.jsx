import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/cliente'
import Alerta from '../components/Alerta'
import Alternativas from '../components/Alternativas'
import BotaoFavorito from '../components/BotaoFavorito'
import Campo from '../components/Campo'
import Carregando from '../components/Carregando'
import Comentarios from '../components/Comentarios'
import InfoQuestao from '../components/InfoQuestao'
import Modal from '../components/Modal'
import { useAuth, useToast } from '../contexts/contextos'
import { useRequisicao } from '../hooks/useRequisicao'
import { STATUS_QUESTAO } from '../utils/formatar'

function NovoComentario({ questaoId, aoSalvar }) {
  const toast = useToast()
  const [form, setForm] = useState({ texto: '', imagem_url: '', video_url: '' })
  const [erros, setErros] = useState({})
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    try {
      const r = await api.post(`/questoes/${questaoId}/comentarios`, form)
      toast.sucesso(r.mensagem)
      setForm({ texto: '', imagem_url: '', video_url: '' })
      setErros({})
      aoSalvar()
    } catch (erro) {
      setErros(erro.erros || {})
      toast.erro(erro.message)
    } finally {
      setEnviando(false)
    }
  }

  const alterar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })
  return (
    <form onSubmit={enviar} className="mt-4 border-top pt-3" noValidate>
      <h3 className="h6 fw-semibold">Adicionar explicação</h3>
      <Campo rotulo="Comentário" como="textarea" rows={3} value={form.texto} onChange={alterar('texto')} erro={erros.texto} />
      <div className="row">
        <Campo className="col-md-6" rotulo="URL de imagem (opcional)" type="url" placeholder="https://..."
          value={form.imagem_url} onChange={alterar('imagem_url')} erro={erros.imagem_url} />
        <Campo className="col-md-6" rotulo="URL de vídeo (opcional)" type="url" placeholder="https://..."
          value={form.video_url} onChange={alterar('video_url')} erro={erros.video_url} />
      </div>
      <button type="submit" className="btn btn-dark btn-sm" disabled={enviando}>Publicar comentário</button>
    </form>
  )
}

export default function QuestaoDetalhe() {
  const { id } = useParams()
  const { usuario } = useAuth()
  const toast = useToast()
  const navegar = useNavigate()
  const { dados: q, carregando, erro, recarregar, atualizarDados } = useRequisicao(`/questoes/${id}`)
  const [selecionada, setSelecionada] = useState(null)
  const [correcao, setCorrecao] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)

  if (carregando) return <Carregando />
  if (erro) return <Alerta aoTentarNovamente={erro.status === 404 ? undefined : recarregar}>{erro.message}</Alerta>
  if (!q) return null

  async function responder() {
    setEnviando(true)
    try {
      setCorrecao(await api.post(`/questoes/${id}/responder`, { alternativa_id: selecionada }))
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  async function mudarStatus(status) {
    try {
      const r = await api.patch(`/questoes/${id}/status`, { status })
      toast.sucesso(r.mensagem)
      recarregar()
    } catch (e) {
      toast.erro(e.message)
    }
  }

  async function excluir() {
    try {
      const r = await api.delete(`/questoes/${id}`)
      toast.sucesso(r.mensagem)
      navegar('/admin')
    } catch (e) {
      toast.erro(e.message)
    }
  }

  async function excluirComentario(comentarioId) {
    try {
      await api.delete(`/questoes/${id}/comentarios/${comentarioId}`)
      toast.sucesso('Comentário removido.')
      recarregar()
    } catch (e) {
      toast.erro(e.message)
    }
  }

  const correta = q.pode_comentar ? q.alternativas.find((a) => a.correta)?.id : correcao?.alternativa_correta_id

  return (
    <div className="mx-auto" style={{ maxWidth: 900 }}>
      <Link to="/questoes" className="small">← Voltar ao banco de questões</Link>

      <div className="card mt-3">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
            <InfoQuestao questao={q} />
            {q.status === 'aprovada' && (
              <BotaoFavorito questaoId={q.id} favorita={q.favorita} aoAlterar={(f) => atualizarDados((d) => ({ ...d, favorita: f }))} />
            )}
          </div>
          {q.status !== 'aprovada' && (
            <div className="alert alert-secondary py-2 small">Status: <strong>{STATUS_QUESTAO[q.status]}</strong></div>
          )}

          <div className="rotulo-stat mb-1">Enunciado</div>
          <p className="enunciado texto-quebra">{q.enunciado}</p>

          <Alternativas
            nome={`questao-${q.id}`}
            alternativas={q.alternativas}
            selecionada={selecionada}
            aoSelecionar={setSelecionada}
            correta={q.pode_comentar || correcao ? correta : undefined}
            escolhida={correcao?.alternativa_escolhida_id}
          />

          {!q.pode_comentar && !correcao && (
            <button type="button" className="btn btn-dark mt-3" disabled={!selecionada || enviando} onClick={responder}>
              Responder
            </button>
          )}
          {correcao && (
            <div className={`alert mt-3 ${correcao.acertou ? 'alert-success' : 'alert-danger'}`} role="status">
              {correcao.acertou ? '✓ Resposta correta!' : `✗ Resposta incorreta. A alternativa correta é a ${correcao.letra_correta}.`}
              <button type="button" className="btn btn-link btn-sm" onClick={() => { setCorrecao(null); setSelecionada(null) }}>
                Tentar de novo
              </button>
            </div>
          )}

          {q.fonte && <p className="small text-secondary mt-3 mb-0">Fonte: {q.fonte}</p>}
        </div>
      </div>

      {(correcao || q.pode_comentar) && (
        <div className="card mt-3">
          <div className="card-body p-3 p-md-4">
            <h2 className="h6 fw-bold mb-3">Gabarito comentado</h2>
            <Comentarios comentarios={correcao ? correcao.comentarios : q.comentarios} aoExcluir={q.pode_comentar ? excluirComentario : undefined} />
            {q.pode_comentar && q.status !== 'arquivada' && <NovoComentario questaoId={q.id} aoSalvar={recarregar} />}
          </div>
        </div>
      )}

      {q.pode_editar && (
        <div className="d-flex flex-wrap gap-2 mt-3">
          {q.status !== 'arquivada' && <Link to={`/admin/questoes/${q.id}/editar`} className="btn btn-outline-dark">Editar questão</Link>}
          {usuario.perfil === 'admin' && q.status !== 'aprovada' && q.status !== 'arquivada' && (
            <button type="button" className="btn btn-success" onClick={() => mudarStatus('aprovada')}>Aprovar e publicar</button>
          )}
          {usuario.perfil === 'admin' && q.status === 'pendente' && (
            <button type="button" className="btn btn-outline-danger" onClick={() => mudarStatus('rejeitada')}>Rejeitar</button>
          )}
          {q.status !== 'arquivada' && (
            <button type="button" className="btn btn-outline-danger ms-auto" onClick={() => setConfirmarExclusao(true)}>Excluir</button>
          )}
        </div>
      )}

      <Modal
        titulo="Excluir questão"
        aberto={confirmarExclusao}
        aoFechar={() => setConfirmarExclusao(false)}
        rodape={(
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setConfirmarExclusao(false)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={excluir}>Excluir</button>
          </>
        )}
      >
        Tem certeza? Se a questão já foi usada em algum simulado, ela será arquivada para preservar o histórico dos alunos.
      </Modal>
    </div>
  )
}
