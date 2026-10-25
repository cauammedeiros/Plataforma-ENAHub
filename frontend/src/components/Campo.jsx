import { useId } from 'react'

/**
 * Campo de formulário Bootstrap com rótulo e mensagem de erro.
 * Para <select> e <textarea>, use a prop `como`.
 */
export default function Campo({ rotulo, erro, ajuda, como = 'input', children, className = '', ...props }) {
  const id = useId()
  const Componente = como
  const classeBase = como === 'select' ? 'form-select' : 'form-control'
  return (
    <div className={`mb-3 ${className}`}>
      <label htmlFor={id} className="form-label">{rotulo}</label>
      <Componente
        id={id}
        className={`${classeBase} ${erro ? 'is-invalid' : ''}`}
        aria-invalid={Boolean(erro)}
        aria-describedby={erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined}
        {...props}
      >
        {children}
      </Componente>
      {erro && <div id={`${id}-erro`} className="invalid-feedback">{erro}</div>}
      {ajuda && !erro && <div id={`${id}-ajuda`} className="form-text">{ajuda}</div>}
    </div>
  )
}
