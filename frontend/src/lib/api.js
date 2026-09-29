import { useEffect, useState } from 'react'
const j = async (u, o) => { const r = await fetch(u, o); if (!r.ok) throw new Error(r.status); return r.json() }
export const api = {
  sessions: () => j('/api/sessions'), session: id => j(`/api/sessions/${id}`), analytics: d => j(`/api/analytics?days=${d}`),
  save: s => j('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) }),
}
export function useApi(fn, deps = []) {
  const [s, set] = useState({ loading: true })
  useEffect(() => { let ok = true; set(p => ({ ...p, loading: true })); fn().then(data => ok && set({ data })).catch(error => ok && set({ error })); return () => { ok = false } }, deps)
  return s
}

// Trained-model classification on the backend (only landmarks are sent, never video). null => use the browser rule-based fit.
export async function classifyRemote(landmarks, aspect) {
  try {
    const r = await fetch('/api/classify/pose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ landmarks, aspect }) })
    if (!r.ok) return null
    const d = await r.json()
    return d.source === 'model' ? { pose: d.pose, confidence: d.confidence, model: true } : null
  } catch { return null }
}
