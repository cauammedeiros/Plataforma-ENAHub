import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/cliente'
import Alerta from '../components/Alerta'
import Alternativas from '../components/Alternativas'
import Carregando from '../components/Carregando'
import Modal from '../components/Modal'
import { useToast } from '../contexts/contextos'
import { cronometro } from '../utils/formatar'

/**
 * Tela do simulado em andamento (wireframe 10.5).
 * - O prazo vem do servidor: atualizar a página não reinicia nem pausa o tempo (RF016).
 * - Cada alternativa marcada é salva imediatamente no MySQL (RF018).
 * - Quando o tempo acaba, o simulado é finalizado (RF017); o servidor também
 *   finaliza sozinho caso o navegador esteja fechado.
 */
export default function SimuladoExecucao() {
  const { id } = useParams()
  const navegar = useNavigate()
  const toast = useToast()
  const [simulado, setSimulado] = useState(null)
  const [erro, setErro] = useState(null)
  const [respostas, setRespostas] = useState({})
  const [salvamento, setSalvamento] = useState({})
  const [indice, setIndice] = useState(0)
  const [prazoLocal, setPrazoLocal] = useState(null)
  const [agora, setAgora] = useState(() => Date.now())
  const [confirmar, setConfirmar] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const finalizadoRef = useRef(false)

  const irParaResultado = useCallback(() => navegar(`/simulados/${id}/resultado`, { replace: true }), [navegar, id])

  const carregar = useCallback(() => {
    api.get(`/simulados/${id}`).then(
      (dados) => {
        if (dados.status === 'finalizado') {
          irParaResultado()
          return
        }
        setSimulado(dados)
        setErro(null)
        setRespostas(Object.fromEntries(dados.questoes.map((q) => [q.id, q.resposta])))
        // Converte o tempo restante informado pelo servidor para o relógio deste dispositivo
        const instante = Date.now()
        setAgora(instante)
        setPrazoLocal(instante + dados.tempo_restante_ms)
      },
      (e) => setErro(e),
    )
  }, [id, irParaResultado])

  useEffect(() => {
    carregar()
  }, [carregar])

  const finalizar = useCallback(
    async (motivo) => {
      if (finalizadoRef.current) return
      finalizadoRef.current = true
      setFinalizando(true)
      try {
        await api.post(`/simulados/${id}/finalizar`)
        if (motivo === 'tempo') toast.info('Tempo esgotado! Seu simulado foi finalizado automaticamente.')
        else toast.sucesso('Simulado finalizado!')
        irParaResultado()
      } catch (e) {
        finalizadoRef.current = false
        setFinalizando(false)
        toast.erro(e.message)
      }
    },
    [id, irParaResultado, toast],
  )

  // Cronômetro: a cada segundo atualiza o relógio e, ao zerar, finaliza (RF017)
  useEffect(() => {
    if (!prazoLocal) return undefined
    const intervalo = setInterval(() => {
      const instante = Date.now()
      setAgora(instante)
      // 1 s de margem: garante que o servidor também já considere o prazo vencido
      if (instante >= prazoLocal + 1000) finalizar('tempo')
    }, 1000)
    return () => clearInterval(intervalo)
  }, [prazoLocal, finalizar])

  const restante = prazoLocal ? Math.max(0, Math.ceil((prazoLocal - agora) / 1000)) : null

  async function responder(questaoId, alternativaId) {
    const anterior = respostas[questaoId]
    setRespostas((r) => ({ ...r, [questaoId]: alternativaId }))
    setSalvamento((s) => ({ ...s, [questaoId]: 'salvando' }))
    try {
      await api.put(`/simulados/${id}/respostas/${questaoId}`, { alternativa_id: alternativaId })
      setSalvamento((s) => ({ ...s, [questaoId]: 'salvo' }))
    } catch (e) {
      if (e.erros?.finalizado) {
        toast.info(e.message)
        irParaResultado()
        return
      }
      setRespostas((r) => ({ ...r, [questaoId]: anterior }))
      setSalvamento((s) => ({ ...s, [questaoId]: 'erro' }))
      toast.erro(`Resposta não salva: ${e.message}`)
    }
  }

  if (erro) return <Alerta aoTentarNovamente={erro.status === 404 ? undefined : carregar}>{erro.message}</Alerta>
  if (!simulado) return <Carregando texto="Carregando simulado..." />

  const questao = simulado.questoes[indice]
  const total = simulado.questoes.length
  const respondidas = Object.values(respostas).filter((v) => v !== null && v !== undefined).length
  const estadoSalvo = salvamento[questao.id]
  const alerta = restante !== null && restante <= 60

  return (
    <>
      <div className="barra-simulado d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div className="fw-semibold">
          <span className="ponto-ativo" aria-hidden="true" /> Simulado: {simulado.nome}
        </div>
        <div className={`cronometro ${alerta ? 'alerta' : ''}`} role="timer" aria-live={alerta ? 'assertive' : 'off'}
          aria-label={`Tempo restante ${cronometro(restante ?? 0)}`}>
          ⏱ {cronometro(restante ?? 0)}
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-9">
          <div className="d-flex flex-wrap align-items-baseline gap-2 mb-3">
            <h1 className="h5 fw-bold mb-0">Questão {indice + 1} de {total}</h1>
            <span className="small text-secondary">• {questao.curso}{questao.tema ? ` · ${questao.tema}` : ''}</span>
            {!questao.oficial_enade && <span className="badge badge-demo">Demonstrativa</span>}
          </div>
          <div className="card">
            <div className="card-body p-3 p-md-4">
              <div className="rotulo-stat mb-1">Enunciado</div>
              <p className="enunciado texto-quebra">{questao.enunciado}</p>
              <Alternativas
                nome={`q-${questao.id}`}
                alternativas={questao.alternativas}
                selecionada={respostas[questao.id]}
                aoSelecionar={(alt) => responder(questao.id, alt)}
                desabilitado={finalizando}
              />
              <div className="d-flex justify-content-between align-items-center mt-3 small">
                <span className={`estado-salvo ${estadoSalvo || ''}`} aria-live="polite">
                  {estadoSalvo === 'salvando' && 'Salvando...'}
                  {estadoSalvo === 'salvo' && '✓ Resposta salva'}
                  {estadoSalvo === 'erro' && (
                    <>Erro ao salvar. <button type="button" className="btn btn-link btn-sm p-0" onClick={() => responder(questao.id, respostas[questao.id] ?? null)}>Tentar novamente</button></>
                  )}
                </span>
                {respostas[questao.id] && (
                  <button type="button" className="btn btn-link btn-sm text-secondary p-0" disabled={finalizando}
                    onClick={() => responder(questao.id, null)}>
                    Limpar resposta
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-between mt-3 gap-2">
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-outline-dark" disabled={indice === 0} onClick={() => setIndice(indice - 1)}>
                Anterior
              </button>
              <button type="button" className="btn btn-outline-dark" disabled={indice === total - 1} onClick={() => setIndice(indice + 1)}>
                Próxima Questão
              </button>
            </div>
            <button type="button" className="btn btn-dark" disabled={finalizando} onClick={() => setConfirmar(true)}>
              Finalizar Simulado
            </button>
          </div>
        </div>

        <div className="col-lg-3">
          <div className="card">
            <div className="card-body">
              <div className="small fw-semibold mb-2">Respondidas: {respondidas} de {total}</div>
              <div className="progress mb-3" role="progressbar" aria-label="Progresso" aria-valuenow={respondidas} aria-valuemin={0} aria-valuemax={total}>
                <div className="progress-bar bg-dark" style={{ width: `${(respondidas / total) * 100}%` }} />
              </div>
              <div className="grade-questoes" role="navigation" aria-label="Ir para a questão">
                {simulado.questoes.map((q, i) => (
                  <button key={q.id} type="button"
                    className={`btn btn-sm ${i === indice ? 'btn-dark' : respostas[q.id] ? 'btn-secondary' : 'btn-outline-secondary'}`}
                    aria-current={i === indice ? 'step' : undefined}
                    aria-label={`Questão ${i + 1}${respostas[q.id] ? ', respondida' : ', sem resposta'}`}
                    onClick={() => setIndice(i)}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        titulo="Finalizar simulado?"
        aberto={confirmar}
        aoFechar={() => setConfirmar(false)}
        rodape={(
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setConfirmar(false)}>Continuar respondendo</button>
            <button type="button" className="btn btn-dark" disabled={finalizando} onClick={() => { setConfirmar(false); finalizar('usuario') }}>
              Finalizar
            </button>
          </>
        )}
      >
        <p className="mb-0">
          Você respondeu <strong>{respondidas} de {total}</strong> questões.
          {respondidas < total && ` ${total - respondidas} ficarão em branco e contarão como não respondidas.`}{' '}
          Depois de finalizar, não será possível alterar as respostas.
        </p>
      </Modal>
    </>
  )
}
