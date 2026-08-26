export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function signedNum(n) {
  if (n == null) return '—'
  return n >= 0 ? `+${n}` : `${n}`
}

export function pct(value, total) {
  if (!value || !total) return 0
  return Math.round((value / total) * 100)
}

// US Navy body fat formula (male). Requires waist, neck (cm) and height (cm).
export function calcBodyFat(measurements, heightCm) {
  const waist = measurements?.waist_belly ?? measurements?.waist
  const neck  = measurements?.neck
  if (!waist || !neck || !heightCm) return null
  const diff = waist - neck
  if (diff <= 0) return null
  const bf = 495 / (1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(heightCm)) - 450
  return parseFloat(Math.max(3, Math.min(60, bf)).toFixed(1))
}
