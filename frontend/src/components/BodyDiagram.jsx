import { SAMPLE_LANDMARKS as T } from '../lib/mock.js'
import { BONES } from './PoseSkeleton.jsx'
const FILL = { warning: '#B7791F', incorrect: '#A6462E' }
// Neutral figure; joints with detected problems are ringed. Hover a joint or a row to link the two.
export default function BodyDiagram({ errors, active, onActive }) {
  const bad = Object.fromEntries(errors.map(e => [e.landmark, e]))
  return (
    <svg viewBox="0 0 100 100" className="w-full max-w-[260px] bg-paper border border-line" role="img" aria-label="Body diagram highlighting joints that need correction">
      {BONES.map(([a, b]) => <line key={a + b} x1={T[a][0] * 100} y1={T[a][1] * 100} x2={T[b][0] * 100} y2={T[b][1] * 100} stroke="#9AA0A5" strokeWidth="1.2" />)}
      <circle cx={T[0][0] * 100} cy={T[0][1] * 100} r="4" fill="none" stroke="#9AA0A5" strokeWidth="1.2" />
      {Object.entries(bad).map(([i, e]) => { const on = active === e.joint
        return <g key={i} tabIndex={0} onMouseEnter={() => onActive(e.joint)} onMouseLeave={() => onActive(null)} onFocus={() => onActive(e.joint)} onBlur={() => onActive(null)} style={{ cursor: 'pointer' }}>
          <circle cx={T[i][0] * 100} cy={T[i][1] * 100} r={on ? 7 : 5} fill={FILL[e.severity]} fillOpacity=".18" stroke={FILL[e.severity]} strokeWidth="1.2" style={{ transition: 'r .15s' }} />
          <circle cx={T[i][0] * 100} cy={T[i][1] * 100} r="1.8" fill={FILL[e.severity]} /></g> })}
    </svg>
  )
}
