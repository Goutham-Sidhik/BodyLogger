import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { formatDate, calcBodyFat } from '../utils/helpers'
import { api } from '../services/api'

// Measurement fields to display (single bicep/thigh, fallback to right-side from old data)
const MEAS_FIELDS = [
  { key: 'neck',        fallback: null,          label: 'Neck' },
  { key: 'chest',       fallback: null,          label: 'Chest' },
  { key: 'waist_belly', fallback: 'waist',       label: 'Waist' },
  { key: 'hip',         fallback: null,          label: 'Hip' },
  { key: 'bicep',       fallback: 'bicep_right', label: 'Bicep' },
  { key: 'thigh',       fallback: 'thigh_right', label: 'Thigh' },
  { key: 'knee',        fallback: null,          label: 'Knee' },
  { key: 'calf',        fallback: null,          label: 'Calf' },
]

function resolve(m, key, fallback) {
  const v = m?.[key]
  if (v != null) return v
  return fallback ? (m?.[fallback] ?? null) : null
}

export default function DayDetail({ log, heightCm, onClose, onEdit }) {
  const [photos, setPhotos] = useState([])

  useEffect(() => {
    if (log) {
      api.getPhotos(log.date).then(setPhotos).catch(() => setPhotos([]))
    } else {
      setPhotos([])
    }
  }, [log])

  if (!log) return null

  const m  = log.measurements || {}
  const n  = log.nutrition     || {}

  const measEntries  = MEAS_FIELDS.map(f => ({ ...f, value: resolve(m, f.key, f.fallback) }))
                                   .filter(e => e.value != null)
  const hasNutrition = Object.values(n).some(v => v != null)

  const fatPct  = calcBodyFat(m, heightCm)
  const leanPct = fatPct != null ? parseFloat((100 - fatPct).toFixed(1)) : null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
        <div
          className="pointer-events-auto bg-[#0e1119] border border-card-border rounded-2xl
                     shadow-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-card-border flex-shrink-0">
            <div>
              <p className="text-muted text-xs">Details</p>
              <h3 className="text-white font-semibold">{formatDate(log.date)}</h3>
            </div>
            <button onClick={onClose} className="text-muted hover:text-white transition-colors p-1">
              <X size={17} />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

            {/* Weight */}
            {log.weight && (
              <div>
                <p className="text-muted text-xs uppercase tracking-wider mb-1">Weight</p>
                <p className="text-accent text-3xl font-bold">
                  {log.weight}
                  <span className="text-muted text-sm font-normal ml-1">kg</span>
                </p>
              </div>
            )}

            {/* Measurements - 2-column flat rows */}
            {measEntries.length > 0 && (
              <div>
                <p className="text-muted text-xs uppercase tracking-wider mb-2">Measurements</p>
                <div className="grid grid-cols-2 gap-x-4">
                  {measEntries.map(e => (
                    <div key={e.key} className="flex justify-between items-center py-1.5 border-b border-card-border/40">
                      <span className="text-muted text-xs">{e.label}</span>
                      <span className="text-white text-xs font-medium">{e.value} <span className="text-muted text-[10px] font-normal">in</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Body Composition (auto-calculated) - 2-column flat rows */}
            {fatPct != null && (
              <div>
                <p className="text-muted text-xs uppercase tracking-wider mb-2">Body Composition <span className="normal-case text-[10px]">(est.)</span></p>
                <div className="grid grid-cols-2 gap-x-4">
                  <div className="flex justify-between items-center py-1.5 border-b border-card-border/40">
                    <span className="text-muted text-xs">Body Fat</span>
                    <span className="text-[#2dd4bf] text-xs font-medium">{fatPct}<span className="text-muted text-[10px] font-normal ml-0.5">%</span></span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-card-border/40">
                    <span className="text-muted text-xs">Lean Mass</span>
                    <span className="text-accent text-xs font-medium">{leanPct}<span className="text-muted text-[10px] font-normal ml-0.5">%</span></span>
                  </div>
                </div>
              </div>
            )}

            {/* Nutrition - 2-column flat rows */}
            {hasNutrition && (
              <div>
                <p className="text-muted text-xs uppercase tracking-wider mb-2">Nutrition</p>
                <div className="grid grid-cols-2 gap-x-4">
                  {n.calories_in  != null && <NutrRow label="Calories In"  value={`${n.calories_in} kcal`} />}
                  {n.calories_out != null && <NutrRow label="Calories Out" value={`${n.calories_out} kcal`} />}
                  {n.protein_g    != null && <NutrRow label="Protein"      value={`${n.protein_g}g`} />}
                  {n.carbs_g      != null && <NutrRow label="Carbs"        value={`${n.carbs_g}g`} />}
                  {n.fat_g        != null && <NutrRow label="Fat"          value={`${n.fat_g}g`} />}
                </div>
              </div>
            )}

            {/* Notes */}
            {log.notes && (
              <div>
                <p className="text-muted text-xs uppercase tracking-wider mb-2">Notes</p>
                <p className="text-white text-sm leading-relaxed">{log.notes}</p>
              </div>
            )}

            {/* Photos */}
            {photos.length > 0 && (
              <div>
                <p className="text-muted text-xs uppercase tracking-wider mb-2">Progress Photos</p>
                <div className="flex flex-wrap gap-2">
                  {photos.map(filename => (
                    <img
                      key={filename}
                      src={api.photoUrl(filename)}
                      alt="Progress"
                      className="w-24 h-24 object-cover rounded-xl border border-card-border"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function NutrRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-card-border/40">
      <span className="text-muted text-xs">{label}</span>
      <span className="text-white text-xs font-medium">{value}</span>
    </div>
  )
}
