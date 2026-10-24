export default function Alerta({ tipo = 'danger', children, aoTentarNovamente }) {
  if (!children) return null
  return (
    <div className={`alert alert-${tipo} d-flex flex-wrap align-items-center justify-content-between gap-2`} role="alert">
      <span>{children}</span>
      {aoTentarNovamente && (
        <button type="button" className="btn btn-sm btn-outline-dark" onClick={aoTentarNovamente}>
          Tentar novamente
        </button>
      )}
    </div>
  )
}
