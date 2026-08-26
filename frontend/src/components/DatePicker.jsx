import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { todayISO } from '../utils/helpers'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DOW = ['Su','Mo','Tu','We','Th','Fr','Sa']

function parseISO(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return { year: y, month: m, day: d }
}

function toISO(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

export default function DatePicker({
  value,
  onChange,
  max,
  min,
  placeholder = 'Select date',
  clearable = false,
  className = '',
}) {
  const todayStr = todayISO()
  const today    = parseISO(todayStr)
  const selected = parseISO(value)

  const initial = selected ?? today
  const [open, setOpen]           = useState(false)
  const [viewYear, setViewYear]   = useState(initial.year)
  const [viewMonth, setViewMonth] = useState(initial.month)
  const ref = useRef(null)

  // Sync view when value changes externally
  useEffect(() => {
    const p = parseISO(value)
    if (p) { setViewYear(p.year); setViewMonth(p.month) }
  }, [value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function daysInMonth(y, m)    { return new Date(y, m, 0).getDate() }
  function firstDow(y, m)       { return new Date(y, m - 1, 1).getDay() }

  function isDisabled(day) {
    const iso = toISO(viewYear, viewMonth, day)
    if (max && iso > max) return true
    if (min && iso < min) return true
    return false
  }

  function handleSelect(day) {
    if (isDisabled(day)) return
    onChange(toISO(viewYear, viewMonth, day))
    setOpen(false)
  }

  const displayValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : null

  const total    = daysInMonth(viewYear, viewMonth)
  const startDow = firstDow(viewYear, viewMonth)

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="input-field flex items-center justify-between gap-2 text-left"
      >
        <span className={displayValue ? 'text-white' : 'text-muted text-sm'}>
          {displayValue ?? placeholder}
        </span>
        <CalendarDays size={14} className="text-muted flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-[60] mt-1.5 left-0 bg-[#0e1119] border border-card-border rounded-xl shadow-2xl p-3 w-[232px]">

          {/* Month / year nav */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded text-muted hover:text-white hover:bg-subtle transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="text-white text-xs font-semibold tracking-wide">
              {MONTHS[viewMonth - 1]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded text-muted hover:text-white hover:bg-subtle transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DOW.map(d => (
              <div key={d} className="text-muted text-[10px] text-center font-medium py-0.5">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: startDow }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}

            {Array.from({ length: total }, (_, i) => i + 1).map(day => {
              const iso  = toISO(viewYear, viewMonth, day)
              const sel  = selected?.year === viewYear && selected?.month === viewMonth && selected?.day === day
              const tod  = iso === todayStr
              const dis  = isDisabled(day)

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelect(day)}
                  disabled={dis}
                  className={[
                    'w-7 h-7 mx-auto flex items-center justify-center rounded-lg text-[11px] font-medium transition-colors',
                    sel                    ? 'bg-accent text-black'                          : '',
                    !sel && tod            ? 'text-accent border border-accent/40'           : '',
                    !sel && !tod && !dis   ? 'text-white hover:bg-subtle'                   : '',
                    dis                    ? 'text-muted/25 cursor-not-allowed'              : 'cursor-pointer',
                  ].filter(Boolean).join(' ')}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Clear */}
          {clearable && value && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="mt-2.5 w-full pt-2 border-t border-card-border text-[11px] text-muted hover:text-white text-center transition-colors"
            >
              Clear date
            </button>
          )}
        </div>
      )}
    </div>
  )
}
