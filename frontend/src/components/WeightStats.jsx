import { signedNum } from '../utils/helpers'

export default function WeightStats({ summary }) {
  const sevenDayAvg   = summary?.seven_day_avg
  const prev7DayAvg   = summary?.prev_7_day_avg
  const totalProgress = summary?.total_progress
  const oldestDate    = summary?.oldest_entry_date
    ? new Date(summary.oldest_entry_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  const current  = summary?.latest_weight
  const goalW    = summary?.goal_weight
  const goalMin  = summary?.goal_weight_min
  const goalMax  = summary?.goal_weight_max
  const effectiveGoal = goalW ?? (goalMin != null && goalMax != null ? (goalMin + goalMax) / 2 : null)
  const remaining = (current != null && effectiveGoal != null)
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

  return (
    <div className="card p-5 flex flex-col">
      <h2 className="text-white font-semibold text-sm flex-shrink-0 mb-4">Weight Stats</h2>

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
  )
}
