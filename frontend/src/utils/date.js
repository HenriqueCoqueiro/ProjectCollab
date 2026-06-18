const LOCALE = 'pt-BR'

export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })
}

export function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function fmtDayGroup(iso) {
  if (!iso) return 'Desconhecido'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Desconhecido'
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hoje'
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
  return d.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' })
}
