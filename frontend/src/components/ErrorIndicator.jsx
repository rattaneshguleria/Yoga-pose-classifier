import { AlertTriangle } from 'lucide-react'
import { TONE, BAR, label, why } from '../lib/ui.js'
// One mistake: Problem, Severity, Detected, Expected, Correction, plus a range bar showing how far off it is.
export default function ErrorIndicator({ error, correction, active, onActive }) {
  const max = error.expected[1] > 30 ? 180 : 30, pct = v => `${Math.min(100, (v / max) * 100)}%`
  return (
    <div onMouseEnter={() => onActive(error.joint)} onMouseLeave={() => onActive(null)}
      className={`border-l-2 pl-4 py-3 transition-all ${active === error.joint ? 'border-ink bg-paper translate-x-1' : 'border-line'}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{label(error.joint)}</h3>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${TONE[error.severity]}`}><AlertTriangle size={12} />{error.severity === 'incorrect' ? 'Needs correction' : 'Adjust'}</span></div>
      <p className="mt-1 text-sm text-mute">{why(error)}</p>
      <div className="relative mt-3 h-1.5 bg-line" aria-hidden="true">
        <div className="absolute h-full bg-moss/40" style={{ left: pct(error.expected[0]), width: `calc(${pct(error.expected[1])} - ${pct(error.expected[0])})` }} />
        <div className={`absolute -top-1 h-3.5 w-1 ${BAR[error.severity]}`} style={{ left: pct(error.detected) }} /></div>
      <div className="mt-1 flex justify-between text-xs text-mute"><span>Detected {error.detected}°</span><span>Expected {error.expected[0]}–{error.expected[1]}°</span></div>
      {correction && <p className="mt-2 text-sm"><span className="font-medium">Fix:</span> {correction}</p>}
    </div>
  )
}