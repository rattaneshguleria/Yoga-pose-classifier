// Browser port of backend/app/pose_logic.py. Keep the two rule tables in sync
// (later: serve the rules from GET /api/poses so there is a single source).
const JOINTS = { left_elbow: [11,13,15], right_elbow: [12,14,16], left_knee: [23,25,27], right_knee: [24,26,28], left_hip: [11,23,25], right_hip: [12,24,26] }
import poses from './poses.json'
export const POSES = poses
export const RULES = Object.fromEntries(poses.map(p => [p.name, p.rules]))
const swapLR = r => Object.fromEntries(Object.entries(r).map(([j, v]) => [j.startsWith('left') ? j.replace('left','right') : j.replace('right','left'), v]))

const pt = (l, i, a) => [l[i].x * a, l[i].y]
function angle(a, b, c) {
  const [ax, ay, cx, cy] = [a[0]-b[0], a[1]-b[1], c[0]-b[0], c[1]-b[1]]
  const cos = (ax*cx + ay*cy) / (Math.hypot(ax, ay) * Math.hypot(cx, cy) + 1e-8)
  return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI
}
export function jointAngles(l, a) {
  return Object.fromEntries(Object.entries(JOINTS).map(([n, [p, v, q]]) => [n, Math.round(angle(pt(l,p,a), pt(l,v,a), pt(l,q,a)))]))
}
const mid = (l, i, j, a) => { const p = pt(l,i,a), q = pt(l,j,a); return [(p[0]+q[0])/2, (p[1]+q[1])/2] }
const torsoLean = (l, a) => { const s = mid(l,11,12,a), h = mid(l,23,24,a); return Math.abs(Math.atan2(s[0]-h[0], h[1]-s[1]) * 180 / Math.PI) }
const shoulderTilt = (l, a) => { const p = pt(l,11,a), q = pt(l,12,a); return Math.abs(Math.atan2(q[1]-p[1], Math.abs(q[0]-p[0]) + 1e-8) * 180 / Math.PI) }
const dev = (v, lo, hi) => v < lo ? lo - v : v > hi ? v - hi : 0

function fit(rules, ang) { // 0..1 closeness to a rule set
  if (!Object.keys(rules).length) return 0
  const s = Object.entries(rules).map(([j, [lo, hi]]) => Math.max(0, 1 - dev(ang[j], lo, hi) / 40))
  return s.reduce((x, y) => x + y, 0) / s.length
}
const orient = (pose, ang) => { const r = RULES[pose]; if (!r) return {}; const m = swapLR(r); return fit(r, ang) >= fit(m, ang) ? r : m }

// Stand-in for the trained classifier: which known pose best fits the measured angles.
export function classify(l, a) {
  if (MODEL) return { ...predict(extractFeatures(l, a)), source: 'model' }
  const ang = jointAngles(l, a)
  const ranked = Object.keys(RULES).map(p => [p, fit(orient(p, ang), ang)]).sort((x, y) => y[1] - x[1])
  return { pose: ranked[0][0], confidence: ranked[0][1], source: 'rules' }
}
export function evaluate(pose, l, a) {
  const ang = jointAngles(l, a), rules = orient(pose, ang), errors = [], corrections = []
  for (const [j, [lo, hi, low, high]] of Object.entries(rules)) {
    const d = dev(ang[j], lo, hi); if (!d) continue
    errors.push({ joint: j, detected: ang[j], expected: [lo, hi], severity: d > 20 ? 'incorrect' : 'warning', landmark: JOINTS[j][1] })
    const msg = ang[j] < lo ? low : (high || low); if (msg) corrections.push(msg)
  }
  const lean = torsoLean(l, a), tilt = shoulderTilt(l, a)
  if (lean > 12) { errors.push({ joint: 'spine', detected: +lean.toFixed(1), expected: [0,12], severity: 'warning', landmark: 11 }); corrections.push('Keep your torso upright.') }
  if (tilt > 6) { errors.push({ joint: 'shoulders', detected: +tilt.toFixed(1), expected: [0,6], severity: 'warning', landmark: 12 }); corrections.push('Level your shoulders.') }
  const penalty = errors.reduce((s, e) => s + (e.severity === 'incorrect' ? 1 : .5), 0)
  return { joint_angles: ang, errors, corrections, form_score: Math.max(0, 1 - penalty / (Object.keys(rules).length + 2)) }
}

// ---- trained classifier (exported by ml/train.py to /model.json; pure JS forward pass) ----
const FIDX = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
let MODEL = null
export async function loadClassifier() {
  try { const r = await fetch('/model.json'); if (r.ok) MODEL = await r.json() } catch { /* no trained model: rules are used */ }
  return !!MODEL
}
// MUST match backend/app/features.py
export function extractFeatures(l, a) {
  const P = i => [l[i].x * a, l[i].y], h = mid(l, 23, 24, a), sh = mid(l, 11, 12, a), L = Math.hypot(sh[0] - h[0], sh[1] - h[1]) || 1
  const coords = FIDX.flatMap(i => [(P(i)[0] - h[0]) / L, (P(i)[1] - h[1]) / L])
  const angs = Object.values(JOINTS).map(([p, v, q]) => angle(pt(l, p, a), pt(l, v, a), pt(l, q, a)) / 180)
  return [...coords, ...angs, torsoLean(l, a) / 90]
}
function predict(f) {
  let x = f.map((v, i) => (v - MODEL.mean[i]) / MODEL.std[i])
  MODEL.layers.forEach((ly, k) => { x = ly.W.map((row, r) => row.reduce((s, w, c) => s + w * x[c], ly.b[r])); if (k < MODEL.layers.length - 1) x = x.map(v => Math.max(0, v)) })
  const m = Math.max(...x), e = x.map(v => Math.exp(v - m)), z = e.reduce((p, q) => p + q, 0), p = e.map(v => v / z), k = p.indexOf(Math.max(...p))
  return { pose: MODEL.classes[k], confidence: p[k] }
}
