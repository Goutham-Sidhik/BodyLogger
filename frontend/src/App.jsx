import { useBodyLog } from './hooks/useBodyLog'
import Dashboard from './components/Dashboard'

export default function App() {
  const { summary, logs, user, todayLog, loading, error, saveLog, deleteLog, updateUser, clearAllData } = useBodyLog()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted text-sm">Loading BodyLog…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="card p-8 max-w-md text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-white font-bold text-lg">Cannot connect to backend</h2>
          <p className="text-muted text-sm">{error}</p>
          <p className="text-muted text-xs">
            Make sure the backend is running on <code className="text-accent">localhost:8000</code>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary mx-auto"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <Dashboard
      summary={summary}
      logs={logs}
      user={user}
      todayLog={todayLog}
      onSave={saveLog}
      onDelete={deleteLog}
      onUpdateUser={updateUser}
      onClearAll={clearAllData}
    />
  )
}
