export default function Carregando({ texto = 'Carregando...', tela = false }) {
  return (
    <div className={`d-flex align-items-center justify-content-center gap-2 text-secondary ${tela ? 'min-vh-100' : 'py-5'}`} role="status">
      <span className="spinner-border spinner-border-sm" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  )
}
