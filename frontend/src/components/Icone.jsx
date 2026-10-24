// Ícones em SVG (traço simples, herdam a cor do texto). Evita emojis, que mudam de aparência entre navegadores.
const CAMINHOS = {
  cronometro: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9.5 2h5M12 2v3" /></>,
  lista: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>,
  grafico: <><path d="M4 20V4M4 20h16" /><path d="M7 15l4-4 3 3 5-6" /></>,
  estrela: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
  balao: <><path d="M4 5h16v10H9l-5 4z" /><path d="M8 9h8M8 12h5" /></>,
}

export default function Icone({ nome, tamanho = 24 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {CAMINHOS[nome]}
    </svg>
  )
}
