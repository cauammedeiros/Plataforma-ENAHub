// Barra horizontal de aproveitamento (0–100%), com o valor sempre em texto ao lado
export default function BarraPercentual({ rotulo, percentual, detalhe }) {
  return (
    <div className="barra-linha">
      <div className="barra-rotulo">{rotulo}</div>
      <div
        className="barra-trilho"
        role="img"
        aria-label={`${rotulo}: ${percentual}%${detalhe ? ` (${detalhe})` : ''}`}
        title={`${rotulo}: ${percentual}%${detalhe ? ` — ${detalhe}` : ''}`}
      >
        <div className="barra-preenchida" style={{ width: `${Math.max(0, Math.min(100, percentual))}%` }} />
      </div>
      <div className="barra-valor">{Math.round(percentual)}%</div>
    </div>
  )
}
