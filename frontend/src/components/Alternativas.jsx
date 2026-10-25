/**
 * Lista de alternativas no estilo do wireframe 10.5.
 * - modo resposta: `selecionada` + `aoSelecionar`
 * - modo correção: `correta` (id) e `escolhida` (id) colorem as alternativas
 */
export default function Alternativas({ alternativas, selecionada, aoSelecionar, correta, escolhida, desabilitado, nome }) {
  const corrigindo = correta !== undefined
  return (
    <div className="d-flex flex-column gap-2" role="radiogroup" aria-label="Alternativas">
      {alternativas.map((a) => {
        let estado = ''
        if (corrigindo) {
          if (a.id === correta) estado = 'correta'
          else if (a.id === escolhida) estado = 'incorreta'
        } else if (a.id === selecionada) {
          estado = 'selecionada'
        }
        return (
          <label key={a.id} className={`alternativa ${estado} ${desabilitado || corrigindo ? 'travada' : ''}`}>
            <input
              type="radio"
              className="visually-hidden"
              name={nome}
              checked={corrigindo ? a.id === escolhida : a.id === selecionada}
              disabled={desabilitado || corrigindo}
              onChange={() => aoSelecionar?.(a.id)}
            />
            <span className="letra" aria-hidden="true">{a.letra}</span>
            <span className="texto-quebra">
              <span className="visually-hidden">Alternativa {a.letra}: </span>
              {a.texto}
            </span>
            {estado === 'correta' && <span className="ms-auto small fw-semibold text-success">Correta</span>}
            {estado === 'incorreta' && <span className="ms-auto small fw-semibold text-danger">Sua resposta</span>}
          </label>
        )
      })}
    </div>
  )
}
