export default function Paginacao({ pagina, totalPaginas, aoMudar }) {
  if (totalPaginas <= 1) return null
  return (
    <nav aria-label="Paginação" className="d-flex align-items-center justify-content-center gap-3 mt-4">
      <button type="button" className="btn btn-outline-secondary btn-sm" disabled={pagina <= 1} onClick={() => aoMudar(pagina - 1)}>
        ‹ Anterior
      </button>
      <span className="small text-secondary">
        Página {pagina} de {totalPaginas}
      </span>
      <button type="button" className="btn btn-outline-secondary btn-sm" disabled={pagina >= totalPaginas} onClick={() => aoMudar(pagina + 1)}>
        Próxima ›
      </button>
    </nav>
  )
}
