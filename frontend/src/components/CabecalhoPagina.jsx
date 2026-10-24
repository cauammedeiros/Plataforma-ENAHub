export default function CabecalhoPagina({ titulo, subtitulo, children }) {
  return (
    <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
      <div>
        <h1 className="h3 fw-bold mb-1">{titulo}</h1>
        {subtitulo && <p className="text-secondary mb-0">{subtitulo}</p>}
      </div>
      {children && <div className="d-flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}
