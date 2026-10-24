export const DIFICULDADES = {
  facil: 'Fácil',
  media: 'Média',
  dificil: 'Difícil',
}

export const PERFIS = {
  aluno: 'Aluno',
  professor: 'Professor',
  admin: 'Administrador',
}

export const STATUS_QUESTAO = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
  arquivada: 'Arquivada',
}

export function dataHora(valor) {
  if (!valor) return '—'
  return new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function data(valor) {
  if (!valor) return '—'
  return new Date(valor).toLocaleDateString('pt-BR')
}

export function tempoRelativo(valor) {
  const segundos = Math.round((Date.now() - new Date(valor).getTime()) / 1000)
  if (segundos < 60) return 'agora mesmo'
  const minutos = Math.round(segundos / 60)
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`
  const dias = Math.round(horas / 24)
  if (dias < 30) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
  return data(valor)
}

// 5400 -> "01:30:00"
export function cronometro(totalSegundos) {
  const s = Math.max(0, Math.floor(totalSegundos))
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const seg = String(s % 60).padStart(2, '0')
  return `${h}:${m}:${seg}`
}

export function duracao(segundos) {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return m > 0 ? `${m} min ${s}s` : `${s}s`
}

export function numero(valor, casas = 1) {
  if (valor === null || valor === undefined) return '—'
  return Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: casas })
}

// plural(1, 'questão', 'questões') -> '1 questão'
export function plural(quantidade, singular, pluralTexto) {
  return `${quantidade} ${quantidade === 1 ? singular : pluralTexto}`
}

export function resumoTexto(texto, limite = 160) {
  if (!texto) return ''
  return texto.length > limite ? `${texto.slice(0, limite).trimEnd()}…` : texto
}
