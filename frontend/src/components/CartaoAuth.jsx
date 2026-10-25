export default function CartaoAuth({ titulo, subtitulo, children }) {
  return (
    <main className="auth-fundo d-flex align-items-center justify-content-center px-3 py-5">
      <div className="card auth-cartao w-100">
        <div className="card-body p-4 p-sm-5">
          <div className="text-center mb-4">
            <h1 className="h4 fw-bold mb-1">{titulo}</h1>
            <p className="text-secondary small mb-0">{subtitulo}</p>
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}
