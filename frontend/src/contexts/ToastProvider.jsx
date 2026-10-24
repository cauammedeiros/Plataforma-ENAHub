import { useCallback, useMemo, useRef, useState } from 'react'
import { ToastContext } from './contextos'

const ESTILOS = {
  sucesso: { classe: 'text-bg-success', icone: '✓' },
  erro: { classe: 'text-bg-danger', icone: '!' },
  info: { classe: 'text-bg-dark', icone: 'i' },
}

export function ToastProvider({ children }) {
  const [mensagens, setMensagens] = useState([])
  const proximoId = useRef(1)

  const remover = useCallback((id) => setMensagens((lista) => lista.filter((m) => m.id !== id)), [])

  const mostrar = useCallback(
    (tipo, texto) => {
      const id = proximoId.current++
      setMensagens((lista) => [...lista.slice(-3), { id, tipo, texto }])
      setTimeout(() => remover(id), tipo === 'erro' ? 6000 : 4000)
    },
    [remover],
  )

  const valor = useMemo(
    () => ({
      sucesso: (texto) => mostrar('sucesso', texto),
      erro: (texto) => mostrar('erro', texto),
      info: (texto) => mostrar('info', texto),
    }),
    [mostrar],
  )

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="toast-container position-fixed bottom-0 end-0 p-3" aria-live="polite" aria-atomic="true">
        {mensagens.map((m) => (
          <div key={m.id} className={`toast show align-items-center border-0 ${ESTILOS[m.tipo].classe}`} role="status">
            <div className="d-flex">
              <div className="toast-body">
                <span className="toast-icone" aria-hidden="true">{ESTILOS[m.tipo].icone}</span> {m.texto}
              </div>
              <button type="button" className="btn-close btn-close-white me-2 m-auto" aria-label="Fechar" onClick={() => remover(m.id)} />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
