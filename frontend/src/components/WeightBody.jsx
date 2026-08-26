import { PieChart, Pie, Cell } from 'recharts'
import { signedNum, calcBodyFat, formatDateShort } from '../utils/helpers'

const COLORS = {
  fat:  '#2dd4bf',
  lean: '#22c55e',
}

export default function WeightBody({ summary, logs }) {
  // ── Weight Stats ────────────────────────────────────────────
  const sevenDayAvg   = summary?.seven_day_avg
  const prev7DayAvg   = summary?.prev_7_day_avg
  const totalProgress = summary?.total_progress
  const oldestDate    = summary?.oldest_entry_date
    ? new Date(summary.oldest_entry_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  const current       = summary?.latest_weight
  const goalW         = summary?.goal_weight
  const goalMin       = summary?.goal_weight_min
  const goalMax       = summary?.goal_weight_max
  const effectiveGoal = goalW ?? (goalMin != null && goalMax != null ? (goalMin + goalMax) / 2 : null)
  const remaining     = (current != null && effectiveGoal != null)
    ? parseFloat((current - effectiveGoal).toFixed(1))
    : null

  let trendText  = 'not enough data'
  let trendColor = 'text-muted'
  if (sevenDayAvg != null && prev7DayAvg != null) {
    const diff = parseFloat((sevenDayAvg - prev7DayAvg).toFixed(1))
    if (Math.abs(diff) < 0.2) {
      trendText  = 'stable vs prev 7d'
      trendColor = 'text-muted'
    } else if (diff > 0) {
      trendText  = `↑ +${diff} kg vs prev 7d`
      trendColor = 'text-orange-400'
    } else {
      trendText  = `↓ ${diff} kg vs prev 7d`
      trendColor = 'text-accent'
    }
  }

  // ── Body Composition ────────────────────────────────────────
  const heightCm   = summary?.height_cm ?? null
  const storedComp = summary?.latest_body_composition || {}
  const measLatest = summary?.latest_measurements || {}

  let fatPct = storedComp.body_fat_pct ?? null
  let source = 'scale'
  if (fatPct == null) {
    fatPct = calcBodyFat(measLatest, heightCm)
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
    <div className="card p-5 flex flex-col gap-4 h-full">

      {/* ── Weight Stats ─────────────────────────────────────── */}
      <div className="flex-shrink-0">
        <h2 className="text-white font-semibold text-sm mb-3">Weight Stats</h2>
        <div className="flex flex-row gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-muted text-xs mb-0.5">7-Day Average</p>
            <p className="text-white text-xl font-bold leading-none">
              {sevenDayAvg != null ? sevenDayAvg : '—'}
              <span className="text-muted text-sm font-normal ml-1">kg</span>
            </p>
            <p className={`text-[11px] mt-1 ${trendColor}`}>{trendText}</p>
          </div>

          <div className="w-px bg-card-border/40 flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <p className="text-muted text-xs mb-0.5">Total Progress</p>
            <p className={`text-xl font-bold leading-none ${
              totalProgress != null && totalProgress <= 0 ? 'text-accent' : 'text-orange-400'
            }`}>
              {totalProgress != null ? signedNum(totalProgress) : '—'}
              <span className="text-muted text-sm font-normal ml-1">kg</span>
            </p>
            <p className="text-muted text-[11px] mt-1">since {oldestDate}</p>
          </div>

          <div className="w-px bg-card-border/40 flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <p className="text-muted text-xs mb-0.5">Remaining to Goal</p>
            <p className={`text-xl font-bold leading-none ${
              remaining != null && remaining <= 0 ? 'text-accent' : 'text-white'
            }`}>
              {remaining != null ? Math.abs(remaining) : '—'}
              <span className="text-muted text-sm font-normal ml-1">kg</span>
            </p>
            <p className="text-muted text-[11px] mt-1">
              {remaining == null
                ? 'set a goal weight'
                : remaining > 0
                  ? 'left to lose'
                  : remaining < 0
                    ? 'past goal'
                    : 'goal reached!'}
            </p>
          </div>
        </div>
      </div>

      <div className="h-px bg-card-border/40 flex-shrink-0" />

      {/* ── Body Composition ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-3 flex-shrink-0">
          <h2 className="text-white font-semibold text-sm">Body Composition</h2>
          <span className="text-muted text-xs">(Est.)</span>
        </div>

        {fatPct == null ? (
          <p className="text-muted text-sm">
            Enter neck + waist measurements to auto-calculate body fat.
          </p>
        ) : (
          <div className="flex-1 flex flex-col justify-between">
            {/* 3-col layout matching Weight Stats columns above */}
            <div className="flex flex-row gap-4 items-center">

              {/* Col 1 — Body Fat (under 7-Day Average) */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS.fat }} />
                  <span className="text-muted text-xs">Body Fat</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xl font-bold leading-none">{fatPct}%</span>
                  {fatDelta != null && (
                    <span className={`text-[11px] font-medium ${fatDelta < 0 ? 'text-accent' : 'text-orange-400'}`}>
                      {fatDelta > 0 ? '+' : ''}{fatDelta}%
                    </span>
                  )}
                </div>
              </div>

              <div className="w-px bg-card-border/40 flex-shrink-0 self-stretch" />

              {/* Col 2 — Lean Mass (under Total Progress) */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS.lean }} />
                  <span className="text-muted text-xs">Lean Mass</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xl font-bold leading-none">{leanPct}%</span>
                  {fatDelta != null && (
                    <span className={`text-[11px] font-medium ${fatDelta < 0 ? 'text-accent' : 'text-orange-400'}`}>
                      {fatDelta > 0 ? '' : '+'}{(-fatDelta).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="w-px bg-card-border/40 flex-shrink-0 self-stretch" />

              {/* Col 3 — Donut chart (under Remaining to Goal) */}
              <div className="flex-1 min-w-0 flex items-center justify-center">
                <div className="relative">
                  <PieChart width={90} height={90}>
                    <Pie
                      data={donut}
                      cx="50%" cy="50%"
                      innerRadius={27} outerRadius={42}
                      startAngle={90} endAngle={-270}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      <Cell fill={COLORS.fat} />
                      <Cell fill={COLORS.lean} />
                    </Pie>
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-white text-sm font-bold leading-none">{fatPct}%</span>
                    <span className="text-muted text-[9px] mt-0.5">fat</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
