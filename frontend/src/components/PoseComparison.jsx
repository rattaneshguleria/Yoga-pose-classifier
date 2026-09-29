import { useMemo } from 'react'
import { BONES } from './PoseSkeleton.jsx'
import AnimatedNumber from './AnimatedNumber.jsx'
const IDX = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
const PARTS = { Shoulders: [11, 12], Elbows: [13, 14, 15, 16], Hips: [23, 24], Knees: [25, 26, 27, 28], Spine: [0, 11, 12] }
// Normalise: hip centre -> origin, torso length -> 1 unit (so body size and position drop out).
function norm(pts, a, flip) {
  const P = i => [(flip ? 1 - pts[i][0] : pts[i][0]) * a, pts[i][1]]
  const m = (i, j) => [(P(i)[0] + P(j)[0]) / 2, (P(i)[1] + P(j)[1]) / 2], h = m(23, 24), s = m(11, 12)
  const L = Math.hypot(s[0] - h[0], s[1] - h[1]) || 1
  return Object.fromEntries(IDX.map(i => [i, [(P(i)[0] - h[0]) / L, (P(i)[1] - h[1]) / L]]))
}
function score(u, r) {
  const parts = Object.fromEntries(Object.entries(PARTS).map(([k, ids]) => [k, Math.max(0, 1 - ids.reduce((s, i) => s + Math.hypot(u[i][0] - r[i][0], u[i][1] - r[i][1]), 0) / ids.length / 0.6)]))
  return { parts, overall: Object.values(parts).reduce((a, b) => a + b, 0) / 5 }
}
// user: MediaPipe landmarks [{x,y}], ref: [[x,y]] for IDX order.
export default function PoseComparison({ user, aspect, refPts }) {
  const res = useMemo(() => {
    const full = Array(33).fill([.5, .5]); IDX.forEach((i, k) => { full[i] = refPts[k] })
    const r = norm(full, 1, false), u = user.map(p => [p.x, p.y])
    const best = [false, true].map(f => { const n = norm(u, aspect, f); return { n, ...score(n, r) } }).sort((a, b) => b.overall - a.overall)[0]
    return { r, ...best }
  }, [user, aspect, refPts])
  const X = p => 50 + p[0] * 22, Y = p => 50 + p[1] * 22 - 4
  const draw = (pts, color, w) => <g>{BONES.map(([a, b]) => <line key={a + '-' + b} x1={X(pts[a])} y1={Y(pts[a])} x2={X(pts[b])} y2={Y(pts[b])} stroke={color} strokeWidth={w} strokeLinecap="round" />)}</g>
  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-8">
      <svg viewBox="0 0 100 100" className="w-full bg-paper border border-line" role="img" aria-label="Reference skeleton overlaid with your skeleton">
        {draw(res.r, '#4F7458', 1.6)}{draw(res.n, '#22262A', 1.1)}</svg>
      <div>
        <div className="flex items-end gap-3"><div className="text-5xl font-semibold"><AnimatedNumber value={Math.round(res.overall * 100)} /><span className="text-2xl text-mute">%</span></div><div className="pb-1.5 text-sm text-mute">overall alignment</div></div>
        <p className="text-xs text-mute mt-1"><i className="inline-block h-1.5 w-4 bg-moss mr-1" />Reference <i className="inline-block h-1.5 w-4 bg-ink ml-3 mr-1" />Your pose</p>
        <ul className="mt-4 space-y-3 max-w-md">{Object.entries(res.parts).map(([k, v]) => <li key={k}>
          <div className="flex justify-between text-sm"><span>{k}</span><span>{Math.round(v * 100)}%</span></div>
          <div className="h-1.5 bg-line mt-1"><div className={`h-full transition-[width] duration-500 ${v > .85 ? 'bg-moss' : v > .65 ? 'bg-amber' : 'bg-clay'}`} style={{ width: `${v * 100}%` }} /></div></li>)}</ul>
        <p className="mt-4 text-xs text-mute max-w-md">Both skeletons are scaled to torso length and centred on the hips, so only shape differences count. Reference skeletons are hand-authored approximations.</p>
      </div></div>
  )
}
