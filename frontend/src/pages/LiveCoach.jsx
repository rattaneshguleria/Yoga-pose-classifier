import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Square, FlipHorizontal, Camera, Check, AlertTriangle, ShieldCheck, Pause } from 'lucide-react'
import PoseSkeleton, { BONES } from '../components/PoseSkeleton.jsx'
import CalibrationPanel, { calibrationChecks } from '../components/CalibrationPanel.jsx'
import { startDetection } from '../lib/poseEngine.js'
import { classify, evaluate, RULES } from '../lib/analysis.js'
import { useSearchParams } from 'react-router-dom'
import { api, classifyRemote } from '../lib/api.js'
import { getSettings } from '../lib/settings.js'
import Toast from '../components/Toast.jsx'

const TONE = { ok: 'text-moss-dark bg-moss-soft', warning: 'text-amber bg-amber-soft', incorrect: 'text-clay bg-clay-soft' }
const label = j => j.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())
const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const HOLD_MIN_SCORE = 0.8, HOLD_COUNTS_AT = 5

export default function LiveCoach() {
  const video = useRef(null), stream = useRef(null), stopDetect = useRef(null), probe = useRef(null)
  const [phase, setPhase] = useState('off') // off | starting | calibrating | active | paused | denied | modelError
  const phaseRef = useRef(phase); phaseRef.current = phase
  const [params] = useSearchParams(), [toast, setToast] = useState(''), [summary, setSummary] = useState(null)
  const [mirror, setMirror] = useState(() => getSettings().mirror), [target, setTarget] = useState(RULES[params.get('pose')] ? params.get('pose') : 'auto')
  const stats = useRef({ poses: {}, joints: {}, scores: [], total: 0 })
  const [aspect, setAspect] = useState(4 / 3), aspectRef = useRef(4 / 3), [brightness, setBrightness] = useState(128)
  const [frame, setFrame] = useState(null) // { lms, pose, confidence, ...evaluation }
  const [lms, setLms] = useState(null)
  const [timer, setTimer] = useState({ session: 0, hold: 0, count: 0 })
  const tick = useRef({ t: 0, hold: 0, counted: false, count: 0, session: 0 })
  const lastUi = useRef(0), remote = useRef(null), lastRemote = useRef(0)

  const onFrame = useCallback(l => {
    const now = performance.now(), p = phaseRef.current
    const dt = tick.current.t ? (now - tick.current.t) / 1000 : 0; tick.current.t = now
    if (now - lastUi.current < 66) return; lastUi.current = now // ~15 fps UI updates
    setLms(l)
    if (!l || (p !== 'active' && p !== 'calibrating')) { setFrame(f => f && { ...f, lms: l }); return }
    if (now - lastRemote.current > 500) { lastRemote.current = now; classifyRemote(l, aspectRef.current).then(r => { remote.current = r }) }
    const cls = remote.current || classify(l, aspectRef.current), pose = targetRef.current === 'auto' ? cls.pose : targetRef.current
    const ev = evaluate(pose, l, aspectRef.current)
    setFrame({ lms: l, pose, confidence: cls.confidence, source: cls.source, ...ev })
    if (p === 'active') {
      const st = stats.current, pn = (st.poses[pose] ||= { sec: 0, score: 0, conf: 0 })
      pn.sec += dt; pn.score += ev.form_score * dt; pn.conf += cls.confidence * dt; st.total += dt; st.scores.push(ev.form_score)
      for (const j of Object.keys(ev.joint_angles)) { const jj = (st.joints[j] ||= { t: 0, bad: 0 }); jj.t += dt; if (ev.errors.some(e => e.joint === j)) jj.bad += dt }
      const t = tick.current; t.session += dt
      if (ev.form_score >= HOLD_MIN_SCORE) { t.hold += dt; if (t.hold >= HOLD_COUNTS_AT && !t.counted) { t.counted = true; t.count++ } }
      else { t.hold = 0; t.counted = false }
      setTimer({ session: t.session, hold: t.hold, count: t.count })
    }
  }, [])
  const targetRef = useRef(target); targetRef.current = target

  async function start() {
    setPhase('starting')
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { ...(getSettings().cameraId ? { deviceId: { exact: getSettings().cameraId } } : { facingMode: 'user' }), width: 1280, height: 720 }, audio: false })
    } catch { return setPhase('denied') }
    video.current.srcObject = stream.current
    await video.current.play().catch(() => {})
    aspectRef.current = video.current.videoWidth / video.current.videoHeight || 4 / 3; setAspect(aspectRef.current)
    try { stopDetect.current = await startDetection(video.current, onFrame); setPhase('calibrating') }
    catch { stop(); setPhase('modelError') }
  }
  function stop() {
    stopDetect.current?.(); stream.current?.getTracks().forEach(t => t.stop())
    setFrame(null); setLms(null); setPhase(p => (p === 'denied' || p === 'modelError') ? p : 'off')
  }
  useEffect(() => () => { stopDetect.current?.(); stream.current?.getTracks().forEach(t => t.stop()) }, [])

  // lighting probe: mean luma of a 32x24 downsample, twice a second
  useEffect(() => {
    if (phase === 'off') return
    const c = probe.current, ctx = c.getContext('2d', { willReadFrequently: true })
    const id = setInterval(() => {
      if (!video.current || video.current.readyState < 2) return
      ctx.drawImage(video.current, 0, 0, 32, 24)
      const d = ctx.getImageData(0, 0, 32, 24).data; let s = 0
      for (let i = 0; i < d.length; i += 4) s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      setBrightness(s / (d.length / 4))
    }, 500)
    return () => clearInterval(id)
  }, [phase])

  function finish() {
    const st = stats.current
    if (st.total >= 5) {
      const poses = Object.entries(st.poses).filter(([, v]) => v.sec >= 2).map(([name, v]) => ({ name, seconds: Math.round(v.sec), accuracy: +(v.score / v.sec).toFixed(2), confidence: +(v.conf / v.sec).toFixed(2) }))
      const mean = st.scores.reduce((a, b) => a + b, 0) / st.scores.length, sd = Math.sqrt(st.scores.reduce((a, b) => a + (b - mean) ** 2, 0) / st.scores.length)
      setSummary({ duration: Math.round(st.total), avg_accuracy: +mean.toFixed(2), poses, joints: Object.fromEntries(Object.entries(st.joints).map(([j, v]) => [j, +(1 - v.bad / v.t).toFixed(2)])),
        metrics: { alignment: +mean.toFixed(2), stability: +Math.max(0, 1 - sd).toFixed(2), confidence: +(poses.reduce((a, p) => a + p.confidence, 0) / (poses.length || 1)).toFixed(2) } })
    }
    stop()
  }
  async function save() { try { await api.save(summary); setSummary(null); setToast('Session saved') } catch { setToast('Could not save: is the backend running?') } }
  function begin() {
    stats.current = { poses: {}, joints: {}, scores: [], total: 0 }; setSummary(null); tick.current = { t: 0, hold: 0, counted: false, count: 0, session: 0 }; setTimer({ session: 0, hold: 0, count: 0 }); setPhase('active') }
  function capture() {
    const v = video.current, c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight
    const ctx = c.getContext('2d'); ctx.drawImage(v, 0, 0)
    if (lms) { ctx.strokeStyle = '#F5F5F1'; ctx.lineWidth = 3
      BONES.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(lms[a].x * c.width, lms[a].y * c.height); ctx.lineTo(lms[b].x * c.width, lms[b].y * c.height); ctx.stroke() }) }
    const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = `yogavision-${Date.now()}.png`; a.click()
  }

  const live = phase === 'calibrating' || phase === 'active' || phase === 'paused'
  const flagged = Object.fromEntries((frame?.errors || []).map(e => [e.landmark, e.severity]))
  const skel = lms && lms.map(p => [p.x, p.y])
  const flip = { transform: mirror ? 'scaleX(-1)' : 'none' }
  const msg = { off: 'Stand 2–3 metres back so your whole body is in frame.', starting: 'Waiting for camera permission…',
    denied: "Camera access was blocked. Allow the camera in your browser's site settings, then try again.",
    modelError: 'The pose model could not load. Check your internet connection and try again.' }[phase]

  return (
    <div className="grid lg:grid-cols-[1fr_340px] min-h-screen">
      <section className="p-4 md:p-6">
        <div className="relative bg-ink overflow-hidden" style={{ aspectRatio: aspect }}>
          <video ref={video} playsInline muted className="h-full w-full" style={flip} />
          <canvas ref={probe} width="32" height="24" className="hidden" />
          {live && <div className="absolute inset-0" style={flip}><PoseSkeleton landmarks={skel} flagged={flagged} /></div>}
          {!live && <div className="absolute inset-0 grid place-items-center text-center text-bone/80 p-6" role={phase === 'denied' || phase === 'modelError' ? 'alert' : undefined}><p className="max-w-sm">{msg}</p></div>}
          {phase === 'active' && frame && <div className="absolute left-3 top-3 bg-ink/80 text-bone px-3 py-2 pop-in">
            <div className="font-semibold flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-moss live-dot" />{frame.pose}</div><div className="text-xs">{frame.source === 'model' ? 'Confidence' : 'Match'} {Math.round(frame.confidence * 100)}%</div></div>}
          {phase === 'paused' && <div className="absolute inset-0 grid place-items-center bg-ink/60 text-bone font-semibold">Paused</div>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!live ? <button onClick={start} className="press inline-flex items-center gap-2 bg-moss text-white px-4 py-2 text-sm font-semibold hover:bg-moss-dark hover:-translate-y-0.5 hover:shadow-lg transition-all"><Play size={14} />Start camera</button> : <>
            <button onClick={() => setPhase(p => p === 'paused' ? 'active' : 'paused')} disabled={phase === 'calibrating'} className="press inline-flex items-center gap-2 border border-line px-4 py-2 text-sm hover:bg-paper disabled:opacity-40"><Pause size={14} />{phase === 'paused' ? 'Resume' : 'Pause'}</button>
            <button onClick={finish} className="press inline-flex items-center gap-2 border border-line px-4 py-2 text-sm font-semibold hover:bg-paper"><Square size={14} />Stop session</button>
            <button onClick={capture} className="press inline-flex items-center gap-2 border border-line px-4 py-2 text-sm hover:bg-paper"><Camera size={14} />Capture frame</button></>}
          <button onClick={() => setMirror(m => !m)} aria-pressed={mirror} className="press inline-flex items-center gap-2 border border-line px-4 py-2 text-sm hover:bg-paper"><FlipHorizontal size={14} />Mirror</button>
          <label className="ml-auto text-sm text-mute">Target pose{' '}
            <select value={target} onChange={e => setTarget(e.target.value)} className="border border-line bg-paper text-ink px-2 py-1.5">
              <option value="auto">Auto-detect</option>{Object.keys(RULES).map(p => <option key={p}>{p}</option>)}</select></label>
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-mute"><ShieldCheck size={14} />Pose detection runs in your browser; video frames are not uploaded. Nothing is stored unless you capture a frame or save a session.</p>
      </section>

      <aside className="border-t lg:border-t-0 lg:border-l border-line bg-paper p-5" aria-live="polite">
        {phase === 'calibrating' ? <CalibrationPanel checks={calibrationChecks({ cameraOn: true, lms, brightness })} onBegin={begin} />
        : !frame || !(phase === 'active' || phase === 'paused') ? summary ? <div><h2 className="font-semibold">Session complete</h2><p className="mt-1 text-sm text-mute">{fmt(summary.duration)} · accuracy {Math.round(summary.avg_accuracy * 100)}% · {summary.poses.length} pose{summary.poses.length === 1 ? '' : 's'}</p>
          <div className="mt-4 flex gap-2"><button onClick={save} className="press bg-moss text-white px-4 py-2 text-sm font-semibold hover:bg-moss-dark hover:-translate-y-0.5 transition-all">Save session</button><button onClick={() => setSummary(null)} className="press border border-line px-4 py-2 text-sm hover:bg-paper">Discard</button></div></div>
          : <p className="text-sm text-mute">Start the camera, then complete calibration to begin.</p> : <>
          <div className="flex items-end justify-between"><div><div className="text-xs text-mute">Form score</div>
            <div className={`text-5xl font-semibold transition-transform ${frame.form_score >= .85 ? 'text-moss-dark' : ''}`}>{Math.round(frame.form_score * 100)}<span className="text-2xl text-mute">%</span></div></div>
            <div className="text-right text-sm"><div className="text-mute text-xs">Hold</div><span className="text-2xl font-semibold">{fmt(timer.hold)}</span></div></div>
          <div className="mt-3 flex gap-6 text-xs text-mute"><span>Session {fmt(timer.session)}</span><span>Holds completed {timer.count}</span></div>
          <h2 className="mt-6 text-sm font-semibold">Joint angles</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {Object.entries(frame.joint_angles).map(([j, v]) => {
              const err = frame.errors.find(e => e.joint === j), s = err ? err.severity : 'ok'
              return <li key={j} className="flex items-center justify-between py-2"><span>{label(j)}</span>
                <span className="flex items-center gap-2">{v}°{err && <span className="text-xs text-mute">target {err.expected.join('–')}°</span>}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${TONE[s]}`}>{s === 'ok' ? <Check size={12} /> : <AlertTriangle size={12} />}{s === 'ok' ? 'Good' : s === 'warning' ? 'Adjust' : 'Incorrect'}</span></span></li>
            })}
            {frame.errors.filter(e => ['spine', 'shoulders'].includes(e.joint)).map(e => <li key={e.joint} className="flex items-center justify-between py-2"><span>{label(e.joint)}</span>
              <span className="flex items-center gap-2">{e.detected}° <span className="text-xs text-mute">max {e.expected[1]}°</span><span className={`px-2 py-0.5 text-xs font-medium ${TONE[e.severity]}`}>Adjust</span></span></li>)}
          </ul>
          <h2 className="mt-6 text-sm font-semibold">Corrections</h2>
          {frame.corrections.length ? <ul className="mt-2 space-y-2 text-sm">{frame.corrections.map((c, i) => <li key={c} className="border-l-2 border-amber pl-3 reveal in" style={{ animationDelay: `${i * 60}ms` }}>{c}</li>)}</ul>
            : <p className="mt-2 text-sm text-moss-dark">Form looks good. Hold steady.</p>}
        </>}
      </aside>
      <Toast msg={toast} onDone={() => setToast('')} />
    </div>
  )
}