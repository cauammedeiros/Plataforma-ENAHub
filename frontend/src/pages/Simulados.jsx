import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/cliente'
import Alerta from '../components/Alerta'
import CabecalhoPagina from '../components/CabecalhoPagina'
import Campo from '../components/Campo'
import Carregando from '../components/Carregando'
import FiltrosQuestoes from '../components/FiltrosQuestoes'
import { useAuth, useToast } from '../contexts/contextos'
import { useRequisicao } from '../hooks/useRequisicao'
import { dataHora, numero } from '../utils/formatar'

const PRESETS = [
  { rotulo: 'Rápido', quantidade: 5, tempo: 10 },
  { rotulo: 'Padrão', quantidade: 10, tempo: 30 },
  { rotulo: 'Completo', quantidade: 30, tempo: 90 },
]

export default function Simulados() {
  const { usuario } = useAuth()
  const toast = useToast()
  const navegar = useNavigate()
  const emAndamento = useRequisicao('/simulados/em-andamento')
  const oficiais = useRequisicao('/simulados/oficiais')
  const historico = useRequisicao('/simulados')
  const [config, setConfig] = useState({
    quantidade: 10, tempo_minutos: 30, curso_id: usuario.curso_id ? String(usuario.curso_id) : '', tema_id: '', dificuldade: '',
  })
  const [erros, setErros] = useState({})
  const [mensagem, setMensagem] = useState('')
  const [iniciando, setIniciando] = useState(false)

  async function iniciar(corpo) {
    setIniciando(true)
    setMensagem('')
    try {
      const r = await api.post('/simulados', corpo)
      toast.sucesso(r.mensagem)
      navegar(`/simulados/${r.simulado.id}`)
    } catch (erro) {
      setErros(erro.erros || {})
      setMensagem(erro.message)
      if (erro.status === 409) emAndamento.recarregar()
      setIniciando(false)
    }
  }

  function enviar(e) {
    e.preventDefault()
    const novos = {}
    const qtd = Number(config.quantidade)
    const tempo = Number(config.tempo_minutos)
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > 80) novos.quantidade = 'Escolha entre 1 e 80 questões.'
    if (!Number.isInteger(tempo) || tempo < 5 || tempo > 300) novos.tempo_minutos = 'Escolha entre 5 e 300 minutos.'
    setErros(novos)
    if (Object.keys(novos).length) return
    iniciar({
      quantidade: qtd,
      tempo_minutos: tempo,
      curso_id: config.curso_id ? Number(config.curso_id) : undefined,
      tema_id: config.tema_id ? Number(config.tema_id) : undefined,
      dificuldade: config.dificuldade || undefined,
    })
  }

  const atual = emAndamento.dados?.simulado
  const finalizados = historico.dados?.filter((s) => s.status === 'finalizado').slice(0, 5)

  return (
    <>
      <CabecalhoPagina titulo="Simulados" subtitulo="Monte um simulado personalizado ou faça um simulado oficial." />

      {atual && (
        <div className="alert alert-warning d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span>
            <strong>{atual.nome}</strong> em andamento · termina às {new Date(atual.data_limite).toLocaleTimeString('pt-BR')}.
            Conclua-o antes de iniciar outro.
          </span>
          <Link to={`/simulados/${atual.id}`} className="btn btn-dark btn-sm">Continuar</Link>
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-body p-3 p-md-4">
              <h2 className="h5 fw-bold mb-1">Simulado personalizado</h2>
              <p className="small text-secondary">
                As questões são sorteadas automaticamente do banco. O cronômetro não pode ser pausado e o simulado é
                finalizado automaticamente quando o tempo acabar. Suas respostas são salvas a cada clique.
              </p>
              <Alerta>{mensagem}</Alerta>
              <form onSubmit={enviar} noValidate>
                <div className="d-flex flex-wrap gap-2 mb-3" role="group" aria-label="Sugestões">
                  {PRESETS.map((p) => (
                    <button key={p.rotulo} type="button" className="btn btn-sm btn-outline-secondary"
                      onClick={() => setConfig({ ...config, quantidade: p.quantidade, tempo_minutos: p.tempo })}>
                      {p.rotulo}: {p.quantidade} questões · {p.tempo} min
                    </button>
                  ))}
                </div>
                <div className="row">
                  <Campo className="col-6" rotulo="Quantidade de questões" type="number" min={1} max={80}
                    value={config.quantidade} onChange={(e) => setConfig({ ...config, quantidade: e.target.value })}
                    erro={erros.quantidade} />
                  <Campo className="col-6" rotulo="Tempo (minutos)" type="number" min={5} max={300}
                    value={config.tempo_minutos} onChange={(e) => setConfig({ ...config, tempo_minutos: e.target.value })}
                    erro={erros.tempo_minutos} />
                </div>
                <div className="form-label">Filtrar questões (opcional)</div>
                <FiltrosQuestoes mostrarAno={false} valores={config} aoMudar={(v) => setConfig({ ...config, ...v })} />
                <button type="submit" className="btn btn-dark mt-4 px-4" disabled={iniciando || Boolean(atual)}>
                  {iniciando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
                  Iniciar simulado
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-5 d-flex flex-column gap-4">
          <div className="card">
            <div className="card-body p-3 p-md-4">
              <h2 className="h5 fw-bold mb-3">Simulados oficiais</h2>
              {oficiais.carregando && <Carregando />}
              <Alerta aoTentarNovamente={oficiais.recarregar}>{oficiais.erro?.message}</Alerta>
              {oficiais.dados?.length === 0 && <p className="small text-secondary mb-0">Nenhum simulado oficial disponível no momento.</p>}
              <div className="d-flex flex-column gap-2">
                {oficiais.dados?.map((m) => (
                  <div key={m.id} className="border rounded p-3">
                    <div className="fw-semibold">{m.nome}</div>
                    {m.descricao && <div className="small text-secondary">{m.descricao}</div>}
                    <div className="d-flex align-items-center justify-content-between mt-2">
                      <span className="small text-secondary">{m.quantidade_questoes} questões · {m.tempo_minutos} min</span>
                      <button type="button" className="btn btn-sm btn-outline-dark"
                        disabled={iniciando || Boolean(atual) || !m.quantidade_questoes}
                        onClick={() => iniciar({ modelo_id: m.id })}>
                        Iniciar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body p-3 p-md-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 fw-bold mb-0">Últimos resultados</h2>
                <Link to="/desempenho" className="small">Ver histórico</Link>
              </div>
              {historico.carregando && <Carregando />}
              {finalizados?.length === 0 && <p className="small text-secondary mb-0">Você ainda não concluiu nenhum simulado.</p>}
              <ul className="list-unstyled mb-0">
                {finalizados?.map((s) => (
                  <li key={s.id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                      <div className="small fw-semibold">{s.nome}</div>
                      <div className="small text-secondary">{dataHora(s.data_fim)}</div>
                    </div>
                    <Link to={`/simulados/${s.id}/resultado`} className="small text-nowrap">
                      Nota {numero(s.nota, 1)} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
