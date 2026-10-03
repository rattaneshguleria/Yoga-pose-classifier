import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, setAuthState } from '../lib/api.js'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const action = mode === 'login' ? api.auth.login : api.auth.register
      const payload = await action(username, password)
      setAuthState(payload)
      navigate('/sessions')
    } catch (err) {
      setError(err.message || 'Unable to sign in right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bone px-4 py-12">
      <div className="mx-auto max-w-md rounded border border-line bg-paper p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">YOGAVISION</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          </div>
          <Link to="/welcome" className="text-sm text-mute hover:text-ink">Back</Link>
        </div>

        <div className="mb-4 inline-flex rounded border border-line bg-paper p-1">
          {['login', 'register'].map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${mode === item ? 'bg-moss text-white' : 'text-mute hover:text-ink'}`}
            >
              {item === 'login' ? 'Log in' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-ink">Username</label>
            <input id="username" value={username} onChange={e => setUsername(e.target.value)} className="w-full border border-line bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-moss" placeholder="demo-user" required />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">Password</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-line bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-moss" placeholder="At least 6 characters" minLength="6" required />
          </div>
          {error ? <p className="rounded border border-clay/40 bg-clay-soft px-3 py-2 text-sm text-clay">{error}</p> : null}
          <button type="submit" disabled={submitting} className="w-full rounded bg-moss px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-moss-dark disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
