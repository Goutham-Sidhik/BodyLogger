import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import { todayISO } from '../utils/helpers'

export function useBodyLog() {
  const [summary, setSummary]     = useState(null)
  const [logs, setLogs]           = useState([])
  const [user, setUser]           = useState(null)
  const [todayLog, setTodayLog]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const loadAll = useCallback(async () => {
    try {
      setError(null)
      const [sum, allLogs, usr] = await Promise.all([
        api.getSummary(),
        api.getLogs(),
        api.getUser(),
      ])
      setSummary(sum)
      setLogs(allLogs)
      setUser(usr)

      const today = todayISO()
      const tlog = allLogs.find(l => l.date === today) || null
      setTodayLog(tlog)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const saveLog = useCallback(async (data) => {
    const result = await api.upsertLog(data)
    await loadAll()
    return result
  }, [loadAll])

  const updateUser = useCallback(async (data) => {
    const result = await api.updateUser(data)
    await loadAll()
    return result
  }, [loadAll])

  const deleteLog = useCallback(async (date) => {
    await api.deleteLog(date)
    await loadAll()
  }, [loadAll])

  const clearAllData = useCallback(async () => {
    await api.clearAllData()
    await loadAll()
  }, [loadAll])

  return {
    summary,
    logs,
    user,
    todayLog,
    loading,
    error,
    refresh: loadAll,
    saveLog,
    updateUser,
    deleteLog,
    clearAllData,
  }
}
