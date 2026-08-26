import { useState, useMemo } from 'react'
import { todayISO } from '../utils/helpers'

const FIELDS = [
  { key: 'neck',        label: 'Neck' },
  { key: 'chest',       label: 'Chest' },
  { key: 'bicep',       fallback: 'bicep_right', label: 'Bicep' },
  { key: 'waist_belly', fallback: 'waist',       label: 'Waist' },
  { key: 'hip',         label: 'Hip' },
  { key: 'thigh',       fallback: 'thigh_right', label: 'Thigh' },
]

const CM_TO_IN = 0.3937

function resolve(m, key, fallback) {
  const v = m?.[key]
  if (v != null) return v
  return fallback ? (m?.[fallback] ?? null) : null
}

function convert(cmVal, unit) {
  if (cmVal == null) return null
  return unit === 'in' ? parseFloat((cmVal * CM_TO_IN).toFixed(1)) : cmVal
}

function weekAvg(logs, key, fallback, daysAgoStart, daysAgoEnd) {
  const base  = new Date(todayISO())
  const start = new Date(todayISO())
  const end   = new Date(todayISO())
  start.setDate(base.getDate() - daysAgoStart)
  end.setDate(base.getDate() - daysAgoEnd)
  const startStr = start.toISOString().split('T')[0]
  const endStr   = end.toISOString().split('T')[0]

  const vals = logs
    .filter(l => l.date >= startStr && l.date <= endStr)
    .map(l => resolve(l.measurements || {}, key, fallback))
    .filter(v => v != null)

  if (!vals.length) return null
  return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
}

function monthDelta(logs, key, fallback, currentValue) {
  if (currentValue == null) return null
  // Average of entries between 23 and 37 days ago (~1 month window)
  const today = new Date(todayISO())
  const end   = new Date(todayISO())
  const start = new Date(todayISO())
  end.setDate(today.getDate() - 23)
  start.setDate(today.getDate() - 37)
  const startStr = start.toISOString().split('T')[0]
  const endStr   = end.toISOString().split('T')[0]

  const vals = logs
    .filter(l => l.date >= startStr && l.date <= endStr)
    .map(l => resolve(l.measurements || {}, key, fallback))
    .filter(v => v != null)

  if (!vals.length) return null
  const avg = parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
  return parseFloat((currentValue - avg).toFixed(1))
}

function startDelta(logs, key, fallback, currentValue) {
  if (currentValue == null) return null
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
  const oldest = sorted.find(l => resolve(l.measurements || {}, key, fallback) != null)
  if (!oldest) return null
  const oldestVal = resolve(oldest.measurements || {}, key, fallback)
  return parseFloat((currentValue - oldestVal).toFixed(1))
}

function DeltaCell({ delta, unit }) {
  if (delta == null) return <span className="text-muted text-xs">—</span>
  const absCm = Math.abs(delta)
  if (absCm < 0.1) return <span className="text-muted text-xs">~0</span>
  const display = unit === 'in'
    ? parseFloat((absCm * CM_TO_IN).toFixed(1))
    : absCm
  if (delta < 0) return <span className="text-accent text-xs font-medium">↓ {display}</span>
  return <span className="text-orange-400 text-xs font-medium">↑ {display}</span>
}

function MeasRow({ label, value, weekDelta, monthDelta, sinceStartDelta, unit }) {
  const displayVal = convert(value, unit)
  return (
    <div className="grid grid-cols-5 items-center py-1.5 border-b border-card-border/40 last:border-0 gap-1">
      <span className="text-muted text-xs">{label}</span>
      <span className="text-white text-sm font-semibold">
        {displayVal != null
          ? <>{displayVal}<span className="text-muted text-xs font-normal ml-0.5">{unit}</span></>
          : <span className="text-muted">—</span>}
      </span>
      <div className="flex justify-end">
        <DeltaCell delta={weekDelta} unit={unit} />
      </div>
      <div className="flex justify-end">
        <DeltaCell delta={monthDelta} unit={unit} />
      </div>
      <div className="flex justify-end">
        <DeltaCell delta={sinceStartDelta} unit={unit} />
      </div>
    </div>
  )
}

export default function Measurements({ summary, logs }) {
  const [unit, setUnit] = useState('cm')
  const latest = summary?.latest_measurements || {}

  const entries = useMemo(() => FIELDS.map(({ key, fallback, label }) => {
    const value   = resolve(latest, key, fallback)
    const currAvg = weekAvg(logs || [], key, fallback, 6, 0)
    const prevAvg = weekAvg(logs || [], key, fallback, 13, 7)
    let wkDelta   = null
    if (currAvg != null && prevAvg != null) {
      wkDelta = parseFloat((currAvg - prevAvg).toFixed(1))
    }
    const moDelta    = monthDelta(logs || [], key, fallback, value)
    const startDelta_ = startDelta(logs || [], key, fallback, value)
    return { key, label, value, weekDelta: wkDelta, monthDelta: moDelta, sinceStartDelta: startDelta_ }
  }), [latest, logs])

  const visible = entries.filter(e => e.value != null)

  return (
    <div className="card p-5 flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 mb-3">
        <h2 className="text-white font-semibold text-sm">Measurements</h2>
        <div className="flex items-center bg-subtle border border-card-border rounded-md overflow-hidden text-xs">
          <button
            onClick={() => setUnit('cm')}
            className={`px-2 py-1 font-medium transition-colors ${unit === 'cm' ? 'bg-accent text-black' : 'text-muted hover:text-white'}`}
          >
            cm
          </button>
          <button
            onClick={() => setUnit('in')}
            className={`px-2 py-1 font-medium transition-colors ${unit === 'in' ? 'bg-accent text-black' : 'text-muted hover:text-white'}`}
          >
            in
          </button>
        </div>
      </div>

      {/* Column headers */}
      {visible.length > 0 && (
        <div className="grid grid-cols-5 items-center pb-1 mb-1 border-b border-card-border flex-shrink-0 gap-1">
          <span className="text-muted text-[10px] uppercase tracking-wider">Part</span>
          <span className="text-muted text-[10px] uppercase tracking-wider">Current</span>
          <span className="text-muted text-[10px] uppercase tracking-wider text-right">vs Wk</span>
          <span className="text-muted text-[10px] uppercase tracking-wider text-right">vs Month</span>
          <span className="text-muted text-[10px] uppercase tracking-wider text-right">vs Start</span>
        </div>
      )}

      <div>
        {visible.length === 0 ? (
          <div className="py-6 flex items-center justify-center">
            <p className="text-muted text-sm text-center">
              No measurements yet.<br />Use "Add Details for Today" to log.
            </p>
          </div>
        ) : (
          <div>
            {visible.map(e => (
              <MeasRow key={e.key} {...e} unit={unit} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
