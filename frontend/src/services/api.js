const BASE = '/api'

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  status:      ()        => req('/status'),
  getUser:     ()        => req('/user'),
  updateUser:  (d)       => req('/user',        { method: 'PUT',    body: JSON.stringify(d) }),
  getLogs:     ()        => req('/logs'),
  getLog:      (date)    => req(`/logs/${date}`),
  createLog:   (d)       => req('/logs',        { method: 'POST',   body: JSON.stringify(d) }),
  upsertLog:   (d)       => req('/logs/upsert', { method: 'POST',   body: JSON.stringify(d) }),
  updateLog:   (date, d) => req(`/logs/${date}`, { method: 'PUT',   body: JSON.stringify(d) }),
  deleteLog:   (date)    => req(`/logs/${date}`, { method: 'DELETE' }),
  clearAllData: ()       => req('/logs',          { method: 'DELETE' }),
  getSummary:  ()        => req('/stats/summary'),

  getPhotos:   (date)     => req(`/photos/${date}`),
  deletePhoto: (filename) => req(`/photos/${filename}`, { method: 'DELETE' }),

  uploadPhoto: async (date, file) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${BASE}/photos/${date}`, { method: 'POST', body: form })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(err.detail || 'Upload failed')
    }
    return res.json()
  },

  // Build URL for serving a photo through the backend proxy
  photoUrl: (filename) => `${BASE}/photos/serve/${filename}`,
}
