import { useState, useEffect } from 'react'
import { Pencil, X, Save } from 'lucide-react'
import { formatDate } from '../utils/helpers'
import DatePicker from './DatePicker'

function GoalEditModal({ summary, user, onSave, onClose, setup }) {
  const existingGoal = summary?.goal_weight
    ?? (summary?.goal_weight_min != null && summary?.goal_weight_max != null
        ? parseFloat(((summary.goal_weight_min + summary.goal_weight_max) / 2).toFixed(1))
        : '')

  const [nameVal,    setNameVal]    = useState(user?.name ?? '')
  const [goalWeight, setGoalWeight] = useState(existingGoal?.toString() ?? '')
  const [startDate,  setStartDate]  = useState(summary?.start_date  ?? '')
  const [targetDate, setTargetDate] = useState(summary?.target_date ?? '')
  const [saving,     setSaving]     = useState(false)

  const canSave = !setup || nameVal.trim().length > 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    try {
      const gw = goalWeight ? parseFloat(goalWeight) : null
      await onSave({
        name:            nameVal.trim() || undefined,
        goal_weight:     gw,
        goal_weight_min: gw != null ? parseFloat((gw - 2).toFixed(1)) : null,
        goal_weight_max: gw != null ? parseFloat((gw + 2).toFixed(1)) : null,
        start_date:  startDate  || null,
        target_date: targetDate || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={setup ? undefined : onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
        <div
          className="pointer-events-auto bg-[#0e1119] border border-card-border rounded-2xl shadow-2xl w-full max-w-sm p-6"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold">
              {setup ? 'Set Up Your Profile' : 'Edit Goal Settings'}
            </h3>
            {!setup && (
              <button onClick={onClose} className="text-muted hover:text-white transition-colors p-1">
                <X size={16} />
              </button>
            )}
          </div>

          {setup && (
            <p className="text-muted text-xs mb-4 leading-relaxed">
              Enter your name to get started. Goals can be set anytime.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Name {setup && <span className="text-red-400">*</span>}</label>
              <input
                type="text"
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                className="input-field"
                placeholder="Your name"
                autoFocus={setup}
              />
            </div>
            <div>
              <label className="label">Goal Weight (kg)</label>
              <input
                type="number" step="0.1"
                value={goalWeight}
                onChange={e => setGoalWeight(e.target.value)}
                className="input-field"
                placeholder="80"
              />
              {goalWeight && (
                <p className="text-muted text-xs mt-1">
                  Target range: {parseFloat(goalWeight) - 2} – {parseFloat(goalWeight) + 2} kg (±2 kg)
                </p>
              )}
            </div>
            <div>
              <label className="label">Start Date</label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Pick a start date"
                clearable
              />
            </div>
            <div>
              <label className="label">Target Date</label>
              <DatePicker
                value={targetDate}
                onChange={setTargetDate}
                placeholder="Pick a target date"
                clearable
              />
            </div>
            <button
              type="submit"
              disabled={saving || !canSave}
              className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Save size={14} />
              {saving ? 'Saving…' : setup ? 'Get Started' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

export default function ProgressGoal({ summary, user, onUpdateUser, forceOpen, onSetupClose }) {
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (forceOpen) setEditing(true)
  }, [forceOpen])

  const pct      = summary?.progress_pct ?? 0
  const current  = summary?.latest_weight
  const goalW    = summary?.goal_weight
  const goalMin  = summary?.goal_weight_min
  const goalMax  = summary?.goal_weight_max
  const start    = summary?.start_weight
  const startDt  = summary?.start_date
  const targetDt = summary?.target_date

  const gMin = goalMin ?? (goalW != null ? goalW - 2 : null)
  const gMax = goalMax ?? (goalW != null ? goalW + 2 : null)
  const goalDisplay = gMin != null && gMax != null
    ? `${Math.round(gMin)}–${Math.round(gMax)} kg`
    : goalW != null ? `${Math.round(goalW)} kg` : '—'

  async function handleSaveGoal(data) {
    await onUpdateUser(data)
    setEditing(false)
    onSetupClose?.()
  }

  function handleClose() {
    setEditing(false)
    onSetupClose?.()
  }

  return (
    <div className="card px-6 py-4">
      <div className="flex items-center justify-between gap-8">
        <div className="flex items-center gap-10 flex-shrink-0">
          <div>
            <p className="text-muted text-xs mb-0.5">Current Weight</p>
            <p className="text-white font-bold text-base">
              {current != null ? `${current} kg` : '—'}
            </p>
          </div>
          <div>
            <p className="text-muted text-xs mb-0.5">Goal Weight</p>
            <p className="text-white font-bold text-base">{goalDisplay}</p>
          </div>
          <div>
            <p className="text-muted text-xs mb-0.5">Progress</p>
            <p className="text-accent font-bold text-base">{Math.round(pct)}%</p>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="relative h-2 bg-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-dim to-accent rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted mt-1.5">
            <span>
              Start: {startDt ? formatDate(startDt) : '—'}
              {start ? ` · ${start} kg` : ''}
            </span>
            <span>Target: {targetDt ? formatDate(targetDt) : '—'}{goalW != null ? ` · ${goalW} kg` : ''}</span>
          </div>
        </div>

        <button
          onClick={() => setEditing(true)}
          className="flex-shrink-0 text-muted hover:text-accent transition-colors p-1"
          title="Edit goal settings"
        >
          <Pencil size={14} />
        </button>
      </div>

      {editing && (
        <GoalEditModal
          summary={summary}
          user={user}
          onSave={handleSaveGoal}
          onClose={handleClose}
          setup={!!forceOpen}
        />
      )}
    </div>
  )
}
