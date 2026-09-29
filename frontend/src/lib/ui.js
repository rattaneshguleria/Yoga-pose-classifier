export const TONE = { ok: 'text-moss-dark bg-moss-soft', warning: 'text-amber bg-amber-soft', incorrect: 'text-clay bg-clay-soft' }
export const BAR = { ok: 'bg-moss', warning: 'bg-amber', incorrect: 'bg-clay' }
export const label = j => j.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())
export const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
export const verdict = s => s >= .85 ? ['Correct', 'ok'] : s >= .6 ? ['Needs improvement', 'warning'] : ['Incorrect', 'incorrect']
export function why(e) {
  const [lo, hi] = e.expected, d = e.detected < lo ? lo - e.detected : e.detected - hi
  if (e.joint === 'spine') return `Your torso leans ${e.detected}° from vertical; up to ${hi}° is acceptable.`
  if (e.joint === 'shoulders') return `Your shoulders are tilted ${e.detected}°; they should be within ${hi}° of level.`
  return `Measured ${e.detected}°, which is ${Math.round(d)}° ${e.detected < lo ? 'more bent' : 'straighter'} than the ${lo}–${hi}° range for this pose.`
}
