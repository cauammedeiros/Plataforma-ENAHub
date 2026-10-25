import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Alerta from '../components/Alerta'
import Alternativas from '../components/Alternativas'
import BarraPercentual from '../components/BarraPercentual'
import Carregando from '../components/Carregando'
import Comentarios from '../components/Comentarios'
import InfoQuestao from '../components/InfoQuestao'
import { useRequisicao } from '../hooks/useRequisicao'
import { dataHora, duracao, numero, plural } from '../utils/formatar'

const FILTROS = {
  todas: { rotulo: 'Todas', teste: () => true },
  erradas: { rotulo: 'Erradas', teste: (q) => q.acertou === false },
  branco: { rotulo: 'Em branco', teste: (q) => q.acertou === null },
  certas: { rotulo: 'Certas', teste: (q) => q.acertou === true },
}

function situacao(q) {
  if (q.acertou === true) return <span className="badge text-bg-success">✓ Acertou</span>
  if (q.acertou === false) return <span className="badge text-bg-danger">✗ Errou</span>
  return <span className="badge text-bg-secondary">— Em branco</span>
}

// Resultado (wireframe 10.6) + gabarito comentado (RF019, RF023–RF025)
export default function Resultado() {
  const { id } = useParams()
  const { dados: r, carregando, erro, recarregar } = useRequisicao(`/simulados/${id}/resultado`)
  const [mostrarGabarito, setMostrarGabarito] = useState(false)
  const [filtro, setFiltro] = useState('todas')

  if (carregando) return <Carregando texto="Calculando resultado..." />
  if (erro) {
    return (
      <>
        <Alerta aoTentarNovamente={erro.status >= 500 || erro.status === 0 ? recarregar : undefined}>{erro.message}</Alerta>
        {erro.status === 409 && <Link to={`/simulados/${id}`} className="btn btn-dark">Voltar ao simulado</Link>}
      </>
    )
  }
  if (!r) return null

  const gabarito = r.gabarito.filter(FILTROS[filtro].teste)

  return (
    <>
      <h1 className="h3 fw-bold mb-1">Resultado do Simulado</h1>
      <p className="text-secondary">
        Confira seu desempenho detalhado em <strong>{r.nome}</strong> · finalizado em {dataHora(r.data_fim)}
        {r.finalizado_por === 'tempo' ? ' (tempo esgotado)' : ''} · duração {duracao(r.duracao_segundos)}.
      </p>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card h-100"><div className="card-body">
            <div className="rotulo-stat">Nota do simulado</div>
            <div className="valor-hero">{numero(r.nota, 2)} <span className="fs-5 text-secondary">/ 10</span></div>
            <div className="small text-secondary">Nota proporcional aos acertos (0 a 10)</div>
          </div></div>
        </div>
        <div className="col-md-4">
          <div className="card h-100"><div className="card-body">
            <div className="rotulo-stat">Questões corretas</div>
            <div className="valor-hero">{r.acertos} <span className="fs-5 text-secondary">/ {r.total}</span></div>
            <div className="small text-secondary">{plural(r.erros, 'incorreta', 'incorretas')} · {r.em_branco} em branco</div>
          </div></div>
        </div>
        <div className="col-md-4">
          <div className="card h-100"><div className="card-body">
            <div className="rotulo-stat">Aproveitamento geral</div>
            <div className="valor-hero">{numero(r.percentual, 2)}%</div>
            <div className="small text-secondary">
              {r.superior_a_percentual === null
                ? 'Ainda não há outros resultados para comparar'
                : `Superior a ${numero(r.superior_a_percentual, 0)}% dos simulados de outros estudantes`}
            </div>
          </div></div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body p-3 p-md-4">
          <h2 className="h6 fw-bold mb-3">Desempenho por Tema</h2>
          {r.por_tema.map((t) => (
            <BarraPercentual key={t.tema} rotulo={t.tema} percentual={t.percentual} detalhe={`${t.acertos} de ${t.total} corretas`} />
          ))}
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-4">
        <button type="button" className="btn btn-outline-dark" aria-expanded={mostrarGabarito} onClick={() => setMostrarGabarito((v) => !v)}>
          {mostrarGabarito ? 'Ocultar gabarito' : 'Ver Gabarito Comentado'}
        </button>
        <Link to="/" className="btn btn-dark">Voltar para Início</Link>
        <Link to="/simulados" className="btn btn-outline-secondary">Novo simulado</Link>
      </div>

      {mostrarGabarito && (
        <section aria-labelledby="titulo-gabarito">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h2 id="titulo-gabarito" className="h5 fw-bold mb-0">Gabarito comentado</h2>
            <div className="btn-group btn-group-sm" role="group" aria-label="Filtrar gabarito">
              {Object.entries(FILTROS).map(([chave, f]) => (
                <button key={chave} type="button" className={`btn ${filtro === chave ? 'btn-dark' : 'btn-outline-dark'}`}
                  aria-pressed={filtro === chave} onClick={() => setFiltro(chave)}>
                  {f.rotulo} ({r.gabarito.filter(f.teste).length})
                </button>
              ))}
            </div>
          </div>
          {gabarito.length === 0 && <p className="text-secondary">Nenhuma questão nesta categoria.</p>}
          {gabarito.map((q) => (
            <article key={q.id} className="card mb-3">
              <div className="card-body p-3 p-md-4">
                <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
                  <InfoQuestao questao={q} numero={q.ordem} />
                  {situacao(q)}
                </div>
                <p className="enunciado texto-quebra">{q.enunciado}</p>
                <Alternativas
                  nome={`gab-${q.id}`}
                  alternativas={q.alternativas}
                  correta={q.alternativas.find((a) => a.correta)?.id}
                  escolhida={q.resposta}
                />
                <div className="mt-3 pt-3 border-top">
                  <div className="rotulo-stat mb-2">Explicação</div>
                  <Comentarios comentarios={q.comentarios} />
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  )
}
