import { fmtTime, BAR } from '../lib/ui.js'
const PALETTE = ['#4F7458', '#6B7177', '#8AA58F', '#3B5943']
// segments: [{start,end,pose}], issues: [{t,joint,severity}]. Click the track to seek; markers are buttons.
export default function VideoTimeline({ duration, segments, issues, current, onSeek }) {
  const pct = t => `${(t / duration) * 100}%`, poses = [...new Set(segments.map(s => s.pose))]
  return (
    <div>
      <div className="relative h-10 bg-line cursor-pointer" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); onSeek(((e.clientX - r.left) / r.width) * duration) }}
        role="slider" tabIndex={0} aria-label="Video timeline" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(current)}
        onKeyDown={e => { if (e.key === 'ArrowRight') onSeek(current + 1); if (e.key === 'ArrowLeft') onSeek(current - 1) }}>
        {segments.map((s, i) => <div key={i} title={`${s.pose} ${fmtTime(s.start)}`} className="absolute h-full" style={{ left: pct(s.start), width: pct(s.end - s.start), background: PALETTE[poses.indexOf(s.pose) % 4], opacity: .85 }} />)}
        <div className="absolute inset-y-0 w-0.5 bg-ink pointer-events-none" style={{ left: pct(current) }} />
      </div>
      <div className="relative h-6">{issues.map((x, i) => <button key={i} onClick={() => onSeek(x.t)} title={`${fmtTime(x.t)} ${x.joint}`} aria-label={`Issue at ${fmtTime(x.t)}`}
        className={`absolute top-1 h-3.5 w-3.5 -translate-x-1/2 rotate-45 hover:scale-125 transition-transform ${BAR[x.severity]}`} style={{ left: pct(x.t) }} />)}</div>
      <div className="flex flex-wrap gap-4 text-xs text-mute">{poses.map((p, i) => <span key={p} className="flex items-center gap-1.5"><i className="h-2 w-2" style={{ background: PALETTE[i % 4] }} />{p}</span>)}
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rotate-45 bg-amber" />Form issue</span></div>
    </div>
  )
}
