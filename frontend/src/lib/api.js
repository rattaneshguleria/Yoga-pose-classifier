import { useEffect, useState } from 'react'

const AUTH_KEY = 'yogavision-auth'
export function getAuthState() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
export function setAuthState(data) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data))
}
export function clearAuthState() {
  localStorage.removeItem(AUTH_KEY)
}

const request = async (url, options = {}) => {
  const auth = getAuthState()
  const headers = new Headers(options.headers || {})
  if (auth?.token) headers.set('Authorization', `Bearer ${auth.token}`)
  const r = await fetch(url, { ...options, headers })
  if (!r.ok) {
    let message = r.statusText || 'Request failed'
    try {
      const detail = await r.json()
      if (detail && detail.detail) message = detail.detail
    } catch {}
    throw new Error(message)
  }
  if (r.status === 204) return null
  return r.headers.get('content-type')?.includes('application/json') ? r.json() : r.text()
}

export const api = {
  auth: {
    register: (username, password) => request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),
    login: (username, password) => request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),
    me: () => request('/api/auth/me'),
    logout: () => request('/api/auth/logout', { method: 'POST' }),
  },
  sessions: () => request('/api/sessions'),
  session: id => request(`/api/sessions/${id}`),
  analytics: d => request(`/api/analytics?days=${d}`),
  save: s => request('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(s),
  }),
}

export function useApi(fn, deps = []) {
  const [s, set] = useState({ loading: true })
  useEffect(() => {
    let ok = true
    set(p => ({ ...p, loading: true }))
    fn().then(data => ok && set({ data })).catch(error => ok && set({ error }))
    return () => { ok = false }
  }, deps)
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
