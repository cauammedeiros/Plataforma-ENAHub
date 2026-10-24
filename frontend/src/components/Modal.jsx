import { useEffect } from 'react'

// Modal Bootstrap controlado pelo React (sem depender do JavaScript do Bootstrap)
export default function Modal({ titulo, aberto, aoFechar, children, rodape }) {
  useEffect(() => {
    if (!aberto) return undefined
    const tecla = (e) => e.key === 'Escape' && aoFechar()
    document.addEventListener('keydown', tecla)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.classList.remove('modal-open')
    }
  }, [aberto, aoFechar])

  if (!aberto) return null
  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="modal-titulo" onClick={aoFechar}>
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h5" id="modal-titulo">{titulo}</h2>
              <button type="button" className="btn-close" aria-label="Fechar" onClick={aoFechar} />
            </div>
            <div className="modal-body">{children}</div>
            {rodape && <div className="modal-footer">{rodape}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  )
}
