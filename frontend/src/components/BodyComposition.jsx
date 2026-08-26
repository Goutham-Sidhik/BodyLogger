import { PieChart, Pie, Cell } from 'recharts'
import { calcBodyFat, formatDateShort } from '../utils/helpers'

const COLORS = {
  fat:  '#2dd4bf',
  lean: '#22c55e',
}

export default function BodyComposition({ summary, heightCm, logs }) {
  const storedComp   = summary?.latest_body_composition || {}
  const measurements = summary?.latest_measurements || {}

  let fatPct = storedComp.body_fat_pct ?? null
  let source = 'scale'
  if (fatPct == null) {
    fatPct = calcBodyFat(measurements, heightCm)
    source = 'navy'
  }
  const leanPct = fatPct != null ? parseFloat((100 - fatPct).toFixed(1)) : null

  const prevEntry = logs?.slice(1).find(l => {
    const bc = l.body_composition || {}
    if (bc.body_fat_pct != null) return true
    return calcBodyFat(l.measurements || {}, heightCm) != null
  })

  let prevFatPct = null
  if (prevEntry) {
    const bc = prevEntry.body_composition || {}
    prevFatPct = bc.body_fat_pct ?? calcBodyFat(prevEntry.measurements || {}, heightCm)
  }

  const fatDelta = (fatPct != null && prevFatPct != null)
    ? parseFloat((fatPct - prevFatPct).toFixed(1))
    : null

  const donut = fatPct != null ? [
    { name: 'Body Fat',  value: fatPct },
    { name: 'Lean Mass', value: leanPct ?? 0 },
  ] : []

  return (
    <div className="card p-5 flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0 mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-white font-semibold text-sm">Body Composition</h2>
          <span className="text-muted text-xs">(Est.)</span>
        </div>
      </div>

      {fatPct == null ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted text-sm text-center">
            Enter neck + waist measurements<br />to auto-calculate body fat.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Chart left + legend right */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 relative">
              <PieChart width={120} height={120}>
                <Pie
                  data={donut}
                  cx="50%" cy="50%"
                  innerRadius={37} outerRadius={54}
                  startAngle={90} endAngle={-270}
                  dataKey="value"
                  strokeWidth={0}
                >
                  <Cell fill={COLORS.fat} />
                  <Cell fill={COLORS.lean} />
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-white text-lg font-bold leading-none">{fatPct}%</span>
                <span className="text-muted text-[10px] mt-0.5">Body Fat</span>
              </div>
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS.fat }} />
                  <span className="text-muted text-xs">Body Fat</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-white text-sm font-semibold">{fatPct}%</span>
                  {fatDelta != null && (
                    <span className={`text-[10px] font-medium ${fatDelta < 0 ? 'text-accent' : 'text-orange-400'}`}>
                      {fatDelta > 0 ? '+' : ''}{fatDelta}%
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS.lean }} />
                  <span className="text-muted text-xs">Lean Mass</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-white text-sm font-semibold">{leanPct}%</span>
                  {fatDelta != null && (
                    <span className={`text-[10px] font-medium ${fatDelta < 0 ? 'text-accent' : 'text-orange-400'}`}>
                      {fatDelta > 0 ? '' : '+'}{(-fatDelta).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* vs comparison — centered in remaining space */}
          {prevEntry && prevFatPct != null && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted text-xs text-center">
                vs {formatDateShort(prevEntry.date)}: {prevFatPct}% fat
              </p>
            </div>
          )}

          {/* Navy note — pinned to bottom */}
          {source === 'navy' && (
            <p className="text-muted text-[10px] text-center mt-auto pt-2">
              Estimated based on US Navy method
            </p>
          )}
        </div>
      )}
    </div>
  )
}
