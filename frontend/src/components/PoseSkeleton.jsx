export const BONES = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]]
const JOINTS = [0,11,12,13,14,15,16,23,24,25,26,27,28]
const COLOR = { ok: '#6FA57B', warning: '#E0A63A', incorrect: '#D9694A' }
// landmarks: [[x,y]] normalised 0-1. flagged: { landmarkIndex: 'warning'|'incorrect' }
export default function PoseSkeleton({ landmarks, flagged = {} }) {
  if (!landmarks) return null
  const p = i => [landmarks[i][0] * 100, landmarks[i][1] * 100]
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
      {BONES.map(([a, b]) => <line key={a + '-' + b} x1={p(a)[0]} y1={p(a)[1]} x2={p(b)[0]} y2={p(b)[1]} stroke="#F5F5F1" strokeOpacity=".85" vectorEffect="non-scaling-stroke" strokeWidth="2" />)}
      {JOINTS.map(i => <circle key={i} cx={p(i)[0]} cy={p(i)[1]} r={flagged[i] ? 1.3 : .9} fill={COLOR[flagged[i] || 'ok']} />)}
    </svg>
  )
}
