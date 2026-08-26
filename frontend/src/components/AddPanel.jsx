import { useState, useEffect, useRef } from 'react'
import { X, Save, Trash2, Camera, XCircle } from 'lucide-react'
import { todayISO, formatDate } from '../utils/helpers'
import { api } from '../services/api'
import DatePicker from './DatePicker'

const CM_TO_IN = 0.3937
const IN_TO_CM = 1 / CM_TO_IN

const MEAS_FIELDS = [
  { key: 'neck',        label: 'Neck' },
  { key: 'chest',       label: 'Chest' },
  { key: 'bicep',       label: 'Bicep' },
  { key: 'waist_belly', label: 'Waist (Belly)' },
  { key: 'hip',         label: 'Hip' },
  { key: 'thigh',       label: 'Thigh' },
]

const NUTR_FIELDS = [
  { key: 'calories_in', label: 'Calories In', unit: 'kcal', step: '1' },
  { key: 'protein_g',   label: 'Protein',     unit: 'g' },
  { key: 'carbs_g',     label: 'Carbs',       unit: 'g' },
  { key: 'fat_g',       label: 'Fat',         unit: 'g' },
]

function Field({ label, unit, value, onChange, step = '0.1' }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type="number"
          step={step}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="—"
          className="input-field pr-10"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

export default function AddPanel({ open, onClose, onSave, onDelete, existingLog, logs }) {
  const [date, setDate]               = useState(todayISO())
  const [weight, setWeight]           = useState('')
  const [measurements, setMeasures]   = useState({})
  const [measUnit, setMeasUnit]       = useState('in')
  const [nutrition, setNutrition]     = useState({})
  const [notes, setNotes]             = useState('')
  const [photos, setPhotos]           = useState([])
  const [pendingFiles, setPending]    = useState([])
  const [saving, setSaving]           = useState(false)
  const [confirmDel, setConfirmDel]   = useState(false)
  const [photoError, setPhotoError]   = useState(null)
  const [hasExisting, setHasExisting] = useState(false)
  const fileRef                       = useRef(null)

  function _applyLog(log, d) {
    const m = log?.measurements ?? {}
    setWeight(log?.weight ?? '')
    setMeasures({
      ...m,
      bicep:       m.bicep       ?? m.bicep_right ?? '',
      thigh:       m.thigh       ?? m.thigh_right ?? '',
      waist_belly: m.waist_belly ?? m.waist       ?? '',
    })
    setMeasUnit('in')
    setNutrition(log?.nutrition ?? {})
    setNotes(log?.notes ?? '')
    setPending([])
    setHasExisting(!!log)
    api.getPhotos(d).then(setPhotos).catch(() => setPhotos([]))
  }

  useEffect(() => {
    if (!open) return
    const log = existingLog
    const d   = log?.date ?? todayISO()
    setDate(d)
    setConfirmDel(false)
    setPhotoError(null)
    _applyLog(log, d)
  }, [open, existingLog])

  function handleDateChange(newDate) {
    setDate(newDate)
    setConfirmDel(false)
    const log = (logs || []).find(l => l.date === newDate) ?? null
    _applyLog(log, newDate)
  }

  const setM = (k, v) => setMeasures(p => ({ ...p, [k]: v }))
  const setN = (k, v) => setNutrition(p => ({ ...p, [k]: v }))

  const toNum = v => { const n = parseFloat(v);  return isNaN(n) ? null : n }
  const toInt = v => { const n = parseInt(v, 10); return isNaN(n) ? null : n }

  // Measurements state stores display values in current unit.
  // On toggle: convert all values from old unit to new unit.
  // On save: convert to cm if unit is 'in'.
  function handleMeasUnitToggle(newUnit) {
    if (newUnit === measUnit) return
    setMeasures(prev => {
      const next = {}
      for (const [k, v] of Object.entries(prev)) {
        const n = parseFloat(v)
        if (isNaN(n) || v === '') { next[k] = v; continue }
        next[k] = newUnit === 'in'
          ? parseFloat((n * CM_TO_IN).toFixed(2))
          : parseFloat((n * IN_TO_CM).toFixed(1))
      }
      return next
    })
    setMeasUnit(newUnit)
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files || [])
    setPending(prev => [...prev, ...files])
    e.target.value = ''
  }

  function removePending(idx) {
    setPending(prev => prev.filter((_, i) => i !== idx))
  }

  async function removeServerPhoto(filename) {
    try {
      await api.deletePhoto(filename)
      setPhotos(prev => prev.filter(f => f !== filename))
    } catch {
      setPhotoError('Could not delete photo')
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        date,
        weight: toNum(weight),
        measurements: Object.fromEntries(
          MEAS_FIELDS.map(f => {
            const n = parseFloat(measurements[f.key])
            if (isNaN(n)) return [f.key, null]
            // Always save in inches
            return [f.key, measUnit === 'cm' ? parseFloat((n * CM_TO_IN).toFixed(2)) : n]
          })
        ),
        nutrition: {
          calories_in: toInt(nutrition.calories_in),
          protein_g:   toNum(nutrition.protein_g),
          carbs_g:     toNum(nutrition.carbs_g),
          fat_g:       toNum(nutrition.fat_g),
        },
        notes: notes.trim() || null,
      }
      await onSave(payload)
      for (const file of pendingFiles) {
        try { await api.uploadPhoto(date, file) }
        catch { setPhotoError('One or more photos failed to upload') }
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDel) { setConfirmDel(true); return }
    await onDelete(date)
    onClose()
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
        <div
          className="pointer-events-auto bg-[#0e1119] border border-card-border rounded-2xl
                     shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden"
          style={{ maxHeight: '88vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-card-border flex-shrink-0">
            <div>
              <h2 className="text-white font-semibold">Add Details</h2>
              <p className="text-muted text-xs mt-0.5">{formatDate(date)}</p>
            </div>
            <div className="flex items-center gap-3">
              <DatePicker
                value={date}
                max={todayISO()}
                onChange={handleDateChange}
                className="w-40"
              />
              <button onClick={onClose} className="text-muted hover:text-white transition-colors p-1">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ── Body ───────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">

            {/* Two-column: Weight + Measurements | Nutrition */}
            <div className="grid grid-cols-2 divide-x divide-card-border">

              {/* Left: Weight + Measurements */}
              <div className="px-6 py-5 space-y-5">
                <div>
                  <p className="text-white text-xs font-semibold mb-3">⚖️ Weight</p>
                  <Field label="Weight" unit="kg" value={weight} onChange={setWeight} step="0.1" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white text-xs font-semibold">📏 Measurements</p>
                    <div className="flex items-center bg-subtle border border-card-border rounded-md overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() => handleMeasUnitToggle('cm')}
                        className={`px-2 py-0.5 font-medium transition-colors ${measUnit === 'cm' ? 'bg-accent text-black' : 'text-muted hover:text-white'}`}
                      >cm</button>
                      <button
                        type="button"
                        onClick={() => handleMeasUnitToggle('in')}
                        className={`px-2 py-0.5 font-medium transition-colors ${measUnit === 'in' ? 'bg-accent text-black' : 'text-muted hover:text-white'}`}
                      >in</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {MEAS_FIELDS.map(f => (
                      <Field
                        key={f.key}
                        label={f.label}
                        unit={measUnit}
                        value={measurements[f.key] ?? ''}
                        onChange={v => setM(f.key, v)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Nutrition only */}
              <div className="px-6 py-5">
                <p className="text-white text-xs font-semibold mb-3">🥗 Nutrition</p>
                <div className="space-y-3">
                  {NUTR_FIELDS.map(f => (
                    <Field
                      key={f.key}
                      label={f.label}
                      unit={f.unit}
                      value={nutrition[f.key] ?? ''}
                      onChange={v => setN(f.key, v)}
                      step={f.step ?? '0.1'}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* ── Notes — full width ──────────────────────────── */}
            <div className="px-6 py-4 border-t border-card-border">
              <p className="text-white text-xs font-semibold mb-2">
                📝 Notes <span className="text-muted font-normal">(optional)</span>
              </p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="How did you feel? Any observations…"
                rows={2}
                className="input-field resize-none text-sm leading-relaxed"
              />
            </div>

            {/* ── Photos — always visible, horizontal layout ─── */}
            <div className="px-6 py-4 border-t border-card-border">
              <p className="text-white text-xs font-semibold mb-3">
                📸 Progress Photos
                {(photos.length + pendingFiles.length) > 0 && (
                  <span className="text-accent font-normal ml-1.5">
                    ({photos.length + pendingFiles.length})
                  </span>
                )}
              </p>

              {photoError && <p className="text-red-400 text-xs mb-2">{photoError}</p>}

              {/* Horizontal row: [Add button] [photos...] */}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex-shrink-0 flex flex-col items-center justify-center gap-1
                             w-16 h-16 border border-dashed border-card-border rounded-lg
                             text-muted hover:text-white hover:border-accent/40 transition-colors"
                >
                  <Camera size={16} />
                  <span className="text-[10px]">Add</span>
                </button>

                {/* Saved photos */}
                {photos.map(filename => (
                  <div key={filename} className="relative group flex-shrink-0">
                    <img
                      src={api.photoUrl(filename)}
                      alt="Progress"
                      className="w-16 h-16 object-cover rounded-lg border border-card-border"
                    />
                    <button
                      type="button"
                      onClick={() => removeServerPhoto(filename)}
                      className="absolute -top-1.5 -right-1.5 text-red-400 hover:text-red-300
                                 bg-[#0e1119] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                ))}

                {/* Pending (not yet uploaded) photos */}
                {pendingFiles.map((file, idx) => (
                  <div key={idx} className="relative group flex-shrink-0">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-lg border border-accent/30"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-accent/20 text-accent text-[9px] text-center py-0.5 rounded-b-lg">
                      pending
                    </div>
                    <button
                      type="button"
                      onClick={() => removePending(idx)}
                      className="absolute -top-1.5 -right-1.5 text-red-400 hover:text-red-300
                                 bg-[#0e1119] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Footer ─────────────────────────────────────────── */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-card-border flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2"
            >
              <Save size={14} />
              {saving ? 'Saving…' : 'Save Entry'}
            </button>

            {hasExisting && (
              <button
                type="button"
                onClick={handleDelete}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  confirmDel
                    ? 'bg-red-600 text-white'
                    : 'text-red-400 hover:text-red-300 border border-red-900/40 hover:border-red-700/60'
                }`}
              >
                <Trash2 size={14} />
                {confirmDel ? 'Confirm' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
