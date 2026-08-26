import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { getGreeting, formatDate, todayISO } from '../utils/helpers'

export default function Header({ user, onAddDetails, onClearAll }) {
  const name  = user?.name || 'there'
  const today = formatDate(todayISO())
  const [confirming, setConfirming] = useState(false)
  const [clearing, setClearing]     = useState(false)
  const [clearError, setClearError] = useState(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!confirming) return
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setConfirming(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [confirming])

  async function handleClear() {
    setClearing(true)
    setClearError(null)
    try {
      await onClearAll()
      setConfirming(false)
    } catch (e) {
      setClearError(e.message || 'Failed to clear logs')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {getGreeting()}, {name}! 👋
        </h1>
        <p className="text-muted text-sm mt-1">Stay consistent. Progress is progress.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="bg-subtle border border-card-border rounded-lg px-3 py-1.5">
          <span className="text-white text-sm font-semibold">{today}</span>
        </div>

        <button
          onClick={onAddDetails}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={15} />
          Log Data
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setConfirming(v => !v)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Trash2 size={15} />
            Clear Logs
          </button>

          {confirming && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-card-border rounded-xl shadow-xl p-4 z-50 flex flex-col gap-3">
              <p className="text-white text-sm font-semibold">Clear all logs?</p>
              <p className="text-muted text-xs leading-relaxed">This will permanently delete all log entries and photos. Your profile settings will be kept.</p>
              {clearError && <p className="text-red-400 text-xs">{clearError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleClear}
                  disabled={clearing}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold py-1.5 rounded-lg transition-colors"
                >
                  {clearing ? 'Clearing…' : 'Yes, clear'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 text-muted hover:text-white text-sm py-1.5 rounded-lg border border-card-border transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
