export default function EstadoVazio({ titulo, children, acao }) {
  return (
    <div className="estado-vazio text-center py-5 px-3">
      <div className="estado-vazio-icone" aria-hidden="true">○</div>
      <h2 className="h6 fw-semibold mb-1">{titulo}</h2>
      {children && <p className="text-secondary small mb-3">{children}</p>}
      {acao}
    </div>
  )
}
