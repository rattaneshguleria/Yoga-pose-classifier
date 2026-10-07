import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  ScanLine,
  ShieldCheck,
  User,
} from 'lucide-react'

import YogaHeroIllustration from '../components/YogaHeroIllustration.jsx'
import { api, setAuthState } from '../lib/api.js'

const FEATURES = [
  { icon: ScanLine, label: 'Real-time pose detection' },
  { icon: ShieldCheck, label: 'Privacy-first analysis' },
  { icon: Activity, label: 'Progress tracking' },
]

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [validation, setValidation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const isLogin = mode === 'login'

  function changeMode(nextMode) {
    setMode(nextMode)
    setError('')
    setValidation('')
  }

  function tiltIllustration(event) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    setTilt({ x: -y * 10, y: x * 16 })
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setValidation('')

    if (!username.trim() || !password) {
      setValidation('Enter your username and password to continue.')
      return
    }
    if (!isLogin && password.length < 6) {
      setValidation('Your password must be at least 6 characters.')
      return
    }

    setSubmitting(true)
    try {
      const action = isLogin ? api.auth.login : api.auth.register
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
    <main className="login-page">
      <section className="login-hero" aria-label="YogaVision introduction">
        <div className="login-hero-inner">
          <Link to="/welcome" className="login-brand" aria-label="YogaVision home">
            <span className="login-brand-mark"><Activity size={20} aria-hidden="true" /></span>
            <span className="login-brand-copy">
              <span className="login-brand-name">YogaVision</span>
              <span className="login-brand-caption">Intelligent yoga analysis</span>
            </span>
          </Link>

          <div className="login-hero-content">
            <h1 className="login-hero-title">
              Your practice.<br />
              <span>Your progress.</span>
            </h1>
            <p className="login-hero-support">
              Save your sessions, understand your alignment, and see your practice grow.
            </p>

            <div
              className="login-illustration-wrap"
              onMouseMove={tiltIllustration}
              onMouseLeave={() => setTilt({ x: 0, y: 0 })}
              style={{ transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
            >
              <YogaHeroIllustration />
            </div>

            <div className="login-features">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div className="login-feature" key={label}>
                  <span className="login-feature-icon"><Icon size={16} aria-hidden="true" /></span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="login-hero-footnote">Computer vision <span>·</span> Pose intelligence <span>·</span> Wellness</div>
        </div>
      </section>

      <section className="login-form-panel" aria-label={isLogin ? 'Log in' : 'Register'}>
        <div className="login-form-inner">
          <div className="login-mobile-brand">
            <Link to="/welcome" className="login-brand" aria-label="YogaVision home">
              <span className="login-brand-mark"><Activity size={19} aria-hidden="true" /></span>
              <span className="login-brand-copy">
                <span className="login-brand-name">YogaVision</span>
                <span className="login-brand-caption">Intelligent yoga analysis</span>
              </span>
            </Link>
            <Link to="/welcome" className="login-back-link">Back</Link>
          </div>

          <Link to="/welcome" className="login-back-link login-back-desktop">
            <ArrowLeft size={15} aria-hidden="true" /> Back to YogaVision
          </Link>

          <div className="login-heading">
            <div className="login-eyebrow">{isLogin ? 'Welcome back' : 'Get started'}</div>
            <h2>{isLogin ? 'Continue your practice.' : 'Create your account.'}</h2>
            <p>{isLogin
              ? 'Log in to access your saved sessions and progress.'
              : 'Create an account to save your YogaVision practice history.'}</p>
          </div>

          <div className="login-tabs" role="tablist" aria-label="Account access">
            <span className={`login-tab-indicator ${isLogin ? 'is-login' : 'is-register'}`} aria-hidden="true" />
            <button type="button" role="tab" id="login-tab" aria-selected={isLogin} aria-controls="login-form" onClick={() => changeMode('login')}>
              Log in
            </button>
            <button type="button" role="tab" id="register-tab" aria-selected={!isLogin} aria-controls="login-form" onClick={() => changeMode('register')}>
              Register
            </button>
          </div>

          <form id="login-form" role="tabpanel" aria-labelledby={isLogin ? 'login-tab' : 'register-tab'} onSubmit={submit} className="login-form" noValidate>
            <div className="login-field">
              <label htmlFor="username">Username</label>
              <div className="login-input-wrap">
                <User size={17} aria-hidden="true" />
                <input
                  id="username"
                  name="username"
                  value={username}
                  onChange={event => setUsername(event.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <div className="login-input-wrap">
                <Lock size={17} aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  className="login-eye-button"
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                </button>
              </div>
              {!isLogin && <span className="login-field-hint">At least 6 characters</span>}
            </div>

            {(validation || error) && (
              <div className={`login-message ${error ? 'is-error' : ''}`} role="alert">
                {validation || error}
              </div>
            )}

            <button className="login-submit" type="submit" disabled={submitting}>
              <span>{submitting ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}</span>
              {!submitting && <ArrowRight size={18} aria-hidden="true" />}
            </button>
          </form>

          <div className="login-privacy-note">
            <ShieldCheck size={19} aria-hidden="true" />
            <p>Your account data is used for your YogaVision sessions and progress history. Camera analysis runs locally in your browser.</p>
          </div>

          <p className="login-footer">
            {isLogin ? 'New to YogaVision? ' : 'Already have an account? '}
            <button type="button" onClick={() => changeMode(isLogin ? 'register' : 'login')}>
              {isLogin ? 'Create an account' : 'Log in'}
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}
