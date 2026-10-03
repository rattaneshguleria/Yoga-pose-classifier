import { useRef, useState } from 'react'
import { Film } from 'lucide-react'
import { createVideoLandmarker } from '../lib/poseEngine.js'
import { classify, evaluate, RULES, poseLabel } from '../lib/analysis.js'
import VideoTimeline from '../components/VideoTimeline.jsx'
import LoadingState from '../components/LoadingState.jsx'
import EmptyState from '../components/EmptyState.jsx'
import AnimatedNumber from '../components/AnimatedNumber.jsx'
import { fmtTime, label, TONE, why } from '../lib/ui.js'

const STEP = 0.25, MAX_SECONDS = 120
const seek = (v, t) => new Promise(r => { v.onseeked = r; v.currentTime = t })

export default function VideoAnalysis() {
  const player = useRef(null), cancel = useRef(false)
  const [url, setUrl] = useState(null), [progress, setProgress] = useState(null), [err, setErr] = useState('')
  const [res, setRes] = useState(null), [now, setNow] = useState(0)

  async function run(file) {
    setErr(''); setRes(null)
    if (!file?.type.startsWith('video/')) return setErr('Choose a video file (MP4, MOV or WebM).')
    const u = URL.createObjectURL(file); setUrl(u); cancel.current = false; setProgress(0)
    const v = document.createElement('video'); v.src = u; v.muted = true; v.preload = 'auto'
    try {
      await new Promise((ok, no) => { v.onloadedmetadata = ok; v.onerror = no })
      const dur = Math.min(v.duration, MAX_SECONDS), asp = v.videoWidth / v.videoHeight, model = await createVideoLandmarker(), frames = []
      for (let i = 0, t = 0; t < dur; i++, t += STEP) {
        if (cancel.current) { setProgress(null); return }
        await seek(v, t)
        const l = model.detectForVideo(v, i * 250 + 1).landmarks[0]
        if (l) {
          const c = classify(l, asp), coachPose = c.coachPose || (RULES[c.pose] ? c.pose : null), pose = coachPose || c.pose
          frames.push({ t, pose, detectedPose: c.pose, confidence: c.confidence, ...evaluate(pose, l, asp) })
        }
        setProgress(t / dur)
      }
      if (!frames.length) { setProgress(null); return setErr('No person was detected in this video.') }
      const segments = []; frames.forEach(f => { const s = segments[segments.length - 1]
        if (s && s.pose === f.pose && f.t - s.end <= STEP * 2) s.end = f.t + STEP; else segments.push({ pose: f.pose, start: f.t, end: f.t + STEP }) })
      const scoredFrames = frames.filter(f => f.form_score != null)
      const issues = []; scoredFrames.forEach(f => f.errors.forEach(e => { if (e.severity !== 'incorrect' && f.form_score >= .7) return
        if (!issues.some(x => x.joint === e.joint && f.t - x.t < 2)) issues.push({ t: f.t, joint: e.joint, severity: e.severity, error: e }) }))
      setRes({ dur, segments: segments.filter(s => s.end - s.start >= .5), issues, score: scoredFrames.length ? scoredFrames.reduce((a, f) => a + f.form_score, 0) / scoredFrames.length : null })
    } catch { setErr('This video could not be analysed. Try MP4 (H.264) and check your connection for the first model load.') }
    setProgress(null)
  }
  const jump = t => { const p = player.current; if (p) { p.currentTime = Math.max(0, t); setNow(p.currentTime) } }
  const poses = res ? [...new Set(res.segments.map(s => s.pose))] : []
  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">Video analysis</h1>
      <p className="text-sm text-mute mt-1">Analysed in your browser, up to the first {MAX_SECONDS} seconds, four frames per second. Nothing is uploaded.</p>
      <label className="mt-5 inline-flex items-center gap-2 border border-line px-4 py-2 text-sm font-semibold hover:bg-paper cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-moss">
        <Film size={14} />Choose video<input type="file" accept="video/*" hidden onChange={e => { run(e.target.files[0]); e.target.value = '' }} /></label>
      {err && <p role="alert" className="mt-3 text-sm text-clay bg-clay-soft px-3 py-2">{err}</p>}
      {progress != null && <div className="max-w-md"><LoadingState text={`Analysing… ${Math.round(progress * 100)}%`} progress={progress} />
        <button onClick={() => { cancel.current = true }} className="text-sm underline">Cancel</button></div>}
      {!url && <div className="mt-8"><EmptyState title="No video yet">Upload a practice video to get detected poses, a form score and a timeline of alignment issues you can click to jump to.</EmptyState></div>}
      {url && <div className="mt-8 grid lg:grid-cols-[1fr_320px] gap-8">
        <div>
          <video ref={player} src={url} controls className="w-full bg-ink" onTimeUpdate={e => setNow(e.currentTarget.currentTime)} />
          {res && <div className="mt-4"><VideoTimeline duration={res.dur} segments={res.segments} issues={res.issues} current={now} onSeek={jump} /></div>}
        </div>
        {res && <aside>
          <div className="text-xs text-mute">{res.score == null ? 'Recognition only' : 'Form score for supported poses'}</div>
          {res.score == null ? <p className="mt-2 text-sm text-mute">Detected poses have no matching coaching rules.</p> : <div className="text-6xl font-semibold"><AnimatedNumber value={Math.round(res.score * 100)} /><span className="text-2xl text-mute">%</span></div>}
          <h2 className="mt-6 font-semibold text-sm">Detected poses</h2>
          <ul className="mt-1 text-sm">{poses.map(p => <li key={p}>{poseLabel(p)}</li>)}</ul>
          {res.score != null && <><h2 className="mt-6 font-semibold text-sm">Issues ({res.issues.length})</h2>
          {res.issues.length === 0 ? <p className="mt-1 text-sm text-moss-dark">No alignment issues found in supported poses.</p> :
            <ul className="mt-1 divide-y divide-line max-h-80 overflow-auto">{res.issues.map((x, i) =>
              <li key={i}><button onClick={() => jump(x.t)} className="w-full text-left py-2 hover:bg-paper transition-colors px-1">
                <span className="text-sm font-medium">{fmtTime(x.t)} · {label(x.joint)}</span>
                <span className={`ml-2 px-1.5 text-xs ${TONE[x.severity]}`}>{x.severity === 'incorrect' ? 'Incorrect' : 'Adjust'}</span>
                <span className="block text-xs text-mute">{why(x.error)}</span></button></li>)}</ul>}
          </>}
        </aside>}
      </div>}
    </div>
  )
}
