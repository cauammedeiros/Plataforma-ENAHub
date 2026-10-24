import { useState } from 'react'
import { data, numero } from '../utils/formatar'

const LARGURA = 640
const ALTURA = 220
const MARGEM = { topo: 16, direita: 16, base: 28, esquerda: 40 }

/**
 * Evolução do aproveitamento (%) ao longo dos simulados — série única, eixo 0–100%.
 * Passe o mouse/toque nos pontos para ver os detalhes; há uma tabela equivalente.
 */
export default function GraficoEvolucao({ pontos }) {
  const [ativo, setAtivo] = useState(null)
  const [tabela, setTabela] = useState(false)

  const largura = LARGURA - MARGEM.esquerda - MARGEM.direita
  const altura = ALTURA - MARGEM.topo - MARGEM.base
  const x = (i) => MARGEM.esquerda + (pontos.length === 1 ? largura / 2 : (i / (pontos.length - 1)) * largura)
  const y = (p) => MARGEM.topo + altura - (p / 100) * altura
  const caminho = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.percentual)}`).join(' ')
  const ponto = ativo !== null ? pontos[ativo] : null

  return (
    <div className="grafico">
      <div className="d-flex justify-content-end mb-2">
        <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setTabela((v) => !v)}>
          {tabela ? 'Ver gráfico' : 'Ver como tabela'}
        </button>
      </div>
      {tabela ? (
        <div className="table-responsive">
          <table className="table table-sm small">
            <thead><tr><th>#</th><th>Data</th><th className="text-end">Aproveitamento</th><th className="text-end">Nota</th></tr></thead>
            <tbody>
              {pontos.map((p, i) => (
                <tr key={p.id}><td>{i + 1}</td><td>{data(p.data)}</td><td className="text-end">{numero(p.percentual)}%</td><td className="text-end">{numero(p.nota, 2)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="position-relative">
          <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="w-100" role="img"
            aria-label={`Evolução do aproveitamento em ${pontos.length} simulados`} onMouseLeave={() => setAtivo(null)}>
            {[0, 50, 100].map((v) => (
              <g key={v}>
                <line x1={MARGEM.esquerda} x2={LARGURA - MARGEM.direita} y1={y(v)} y2={y(v)} className="grafico-grade" />
                <text x={MARGEM.esquerda - 8} y={y(v)} className="grafico-eixo" textAnchor="end" dominantBaseline="middle">{v}%</text>
              </g>
            ))}
            {ponto && <line x1={x(ativo)} x2={x(ativo)} y1={MARGEM.topo} y2={MARGEM.topo + altura} className="grafico-guia" />}
            <path d={caminho} className="grafico-linha" />
            {pontos.map((p, i) => (
              <g key={p.id}>
                <circle cx={x(i)} cy={y(p.percentual)} r={ativo === i ? 6 : 4} className="grafico-ponto" />
                {/* área de toque maior que o ponto */}
                <circle cx={x(i)} cy={y(p.percentual)} r={16} fill="transparent" tabIndex={0}
                  aria-label={`Simulado ${i + 1}: ${numero(p.percentual)}%`}
                  onMouseEnter={() => setAtivo(i)} onFocus={() => setAtivo(i)} onBlur={() => setAtivo(null)} onClick={() => setAtivo(i)} />
              </g>
            ))}
            <text x={MARGEM.esquerda} y={ALTURA - 6} className="grafico-eixo">1º</text>
            <text x={LARGURA - MARGEM.direita} y={ALTURA - 6} className="grafico-eixo" textAnchor="end">{pontos.length}º simulado</text>
          </svg>
          {ponto && (
            <div className="grafico-tooltip" style={{ left: `${(x(ativo) / LARGURA) * 100}%`, top: `${(y(ponto.percentual) / ALTURA) * 100}%` }}>
              <div className="fw-semibold">{numero(ponto.percentual)}%</div>
              <div>Nota {numero(ponto.nota, 2)} · {data(ponto.data)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
