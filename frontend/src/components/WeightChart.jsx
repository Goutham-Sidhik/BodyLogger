import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { formatDateShort, todayISO } from '../utils/helpers'
import { useState, useMemo } from 'react'

const FILTERS = [
  { label: '7D',  days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'All', days: null },
]

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1f2e] border border-card-border rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-muted text-xs mb-1">{label}</p>
      <p className="text-accent font-semibold">{payload[0].value} kg</p>
    </div>
  )
}

function CustomDot(props) {
  const { cx, cy, payload, selected, onClick } = props
  const isSelected = payload.date === selected
  return (
    <circle
      cx={cx} cy={cy}
      r={isSelected ? 6 : 4}
      fill={isSelected ? '#4ade80' : '#22c55e'}
      stroke={isSelected ? '#fff' : 'transparent'}
      strokeWidth={2}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick && onClick(payload)}
    />
  )
}

export default function WeightChart({ summary, onSelectDate }) {
  const [selected, setSelected] = useState(null)
  const [filter, setFilter]     = useState('7D')

  const raw = summary?.chart_data || []

  const data = useMemo(() => {
    const activeFilter = FILTERS.find(f => f.label === filter)
    let filtered = raw
    if (activeFilter?.days) {
      const cutoff = new Date(todayISO())
      cutoff.setDate(cutoff.getDate() - activeFilter.days + 1)
      const cutoffStr = cutoff.toISOString().split('T')[0]
      filtered = raw.filter(d => d.date >= cutoffStr)
    }
    return filtered.map(d => ({ ...d, label: formatDateShort(d.date) }))
  }, [raw, filter])

  const weights = data.map(d => d.weight).filter(Boolean)
  const minW = weights.length ? Math.floor(Math.min(...weights)) - 1 : 98
  const maxW = weights.length ? Math.ceil(Math.max(...weights)) + 1 : 106

  const sevenDayAvg = summary?.seven_day_avg

  function handleDot(payload) {
    setSelected(payload.date)
    onSelectDate?.(payload.date)
  }

  return (
    <div className="card p-5 flex flex-col h-full">
      {/* Title + filter buttons */}
      <div className="flex items-center justify-between flex-shrink-0 mb-3">
        <h2 className="text-white font-semibold text-sm">Weight Trend</h2>
        <div className="flex items-center gap-1">
          {FILTERS.map(f => (
            <button
              key={f.label}
              onClick={() => setFilter(f.label)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === f.label
                  ? 'bg-accent text-black'
                  : 'text-muted hover:text-white hover:bg-subtle'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2233" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[minW, maxW]}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <Tooltip content={<ChartTooltip />} />
            {sevenDayAvg && (
              <ReferenceLine y={sevenDayAvg} stroke="#4ade80" strokeDasharray="4 4" strokeOpacity={0.35} />
            )}
            <Area
              type="monotone"
              dataKey="weight"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#wGrad)"
              dot={<CustomDot selected={selected} onClick={handleDot} />}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="flex-shrink-0 text-muted text-xs text-center mt-2">
        Tap on a data point to see details
      </p>
    </div>
  )
}
