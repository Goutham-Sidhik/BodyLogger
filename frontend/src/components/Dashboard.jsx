import { useState } from 'react'
import Header from './Header'
import WeightChart from './WeightChart'
import WeightBody from './WeightBody'
import Measurements from './Measurements'
import ProgressGoal from './ProgressGoal'
import AddPanel from './AddPanel'
import DayDetail from './DayDetail'

export default function Dashboard({ summary, logs, user, todayLog, onSave, onDelete, onUpdateUser, onClearAll }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [editLog, setEditLog]     = useState(null)
  const [detailLog, setDetailLog] = useState(null)
  const [showSetup, setShowSetup] = useState(false)

  function openAdd() {
    setEditLog(todayLog)
    setPanelOpen(true)
  }

  function handleSelectDate(date) {
    const log = logs.find(l => l.date === date)
    if (log) setDetailLog(log)
  }

  function openEdit(log) {
    setEditLog(log)
    setDetailLog(null)
    setPanelOpen(true)
  }

  async function handleClearAll() {
    await onClearAll()
    setShowSetup(true)
  }

  const heightCm = summary?.height_cm ?? null

  return (
    <div className="h-screen bg-bg overflow-hidden flex flex-col px-16 xl:px-24 py-6 gap-4">

      <div className="flex-shrink-0">
        <Header user={user} onAddDetails={openAdd} onClearAll={handleClearAll} />
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-4">
        <div className="flex-1 min-h-0 flex flex-col">
          <WeightChart summary={summary} logs={logs} onSelectDate={handleSelectDate} />
        </div>

        <div className="flex-shrink-0 grid grid-cols-2 gap-4">
          <div className="min-h-0 flex flex-col">
            <WeightBody summary={summary} logs={logs} />
          </div>
          <div className="min-h-0 flex flex-col">
            <Measurements summary={summary} logs={logs} />
          </div>
        </div>
      </div>

      <div className="flex-shrink-0">
        <ProgressGoal
          summary={summary}
          user={user}
          onUpdateUser={onUpdateUser}
          forceOpen={showSetup}
          onSetupClose={() => setShowSetup(false)}
        />
      </div>

      <AddPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSave={onSave}
        onDelete={onDelete}
        existingLog={editLog}
        logs={logs}
      />

      <DayDetail
        log={detailLog}
        heightCm={heightCm}
        onClose={() => setDetailLog(null)}
        onEdit={() => openEdit(detailLog)}
      />
    </div>
  )
}
