import { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, Check, AlertTriangle } from 'lucide-react'
import { detectImage } from '../lib/poseEngine.js'
import PoseComparison from '../components/PoseComparison.jsx'
import { classify, evaluate, RULES, POSES } from '../lib/analysis.js'
import { BONES } from '../components/PoseSkeleton.jsx'
import BodyDiagram from '../components/BodyDiagram.jsx'
import ErrorIndicator from '../components/ErrorIndicator.jsx'
import LoadingState from '../components/LoadingState.jsx'
import AnimatedNumber from '../components/AnimatedNumber.jsx'
import { TONE, label, verdict } from '../lib/ui.js'
import Reveal from '../components/Reveal.jsx'

const OK_TYPES = ['image/png', 'image/jpeg'], MAX_MB = 10
export default function PoseAnalyzer() {
  const canvas = useRef(null), input = useRef(null)
  const [src, setSrc] = useState(null), [lms, setLms] = useState(undefined), [aspect, setAspect] = useState(1)
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [drag, setDrag] = useState(false)
  const [target, setTarget] = useState('auto'), [active, setActive] = useState(null)

  async function handle(file) {
    setErr('')
    if (!file) return
    if (!OK_TYPES.includes(file.type)) return setErr('Use a PNG, JPG or JPEG image.')
    if (file.size > MAX_MB * 1048576) return setErr(`Image is over ${MAX_MB} MB. Resize it and try again.`)
    const url = URL.createObjectURL(file), img = new Image(); setBusy(true); setLms(undefined)
    img.onload = async () => {
      try { setAspect(img.naturalWidth / img.naturalHeight); const l = await detectImage(img); setSrc({ url, img }); setLms(l) }
      catch { setErr('The pose model could not load. Check your connection and try again.') }
      setBusy(false)
    }
    img.onerror = () => { setBusy(false); setErr('That file could not be read as an image.') }
    img.src = url
  }
  const result = useMemo(() => {
    if (!lms) return null
    const c = classify(lms, aspect), pose = target === 'auto' ? c.pose : target
    return { pose, confidence: c.confidence, source: c.source, ...evaluate(pose, lms, aspect) }
  }, [lms, aspect, target])

  useEffect(() => { // draw analysed image
    if (!src || !canvas.current) return
    const c = canvas.current, { img } = src, s = Math.min(1, 1280 / img.naturalWidth)
    c.width = img.naturalWidth * s; c.height = img.naturalHeight * s
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height)
    if (!lms) return
    x.strokeStyle = '#F5F5F1'; x.lineWidth = Math.max(2, c.width / 320)
    BONES.forEach(([a, b]) => { x.beginPath(); x.moveTo(lms[a].x * c.width, lms[a].y * c.height); x.lineTo(lms[b].x * c.width, lms[b].y * c.height); x.stroke() })
    const bad = Object.fromEntries((result?.errors || []).map(e => [e.landmark, e.severity]))
    ;[0,11,12,13,14,15,16,23,24,25,26,27,28].forEach(i => { x.fillStyle = bad[i] === 'incorrect' ? '#D9694A' : bad[i] ? '#E0A63A' : '#6FA57B'
      x.beginPath(); x.arc(lms[i].x * c.width, lms[i].y * c.height, c.width / 130 + (bad[i] ? 3 : 0), 0, 7); x.fill() })
  }, [src, lms, result])

  const [word, tone] = result ? verdict(result.form_score) : []
  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">Upload a yoga pose for analysis</h1>
      <p className="text-sm text-mute mt-1">PNG, JPG or JPEG, up to {MAX_MB} MB. The image is analysed in your browser and is not uploaded.</p>
      <div role="button" tabIndex={0} onClick={() => input.current.click()} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && input.current.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]) }}
        className={`mt-5 border border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${drag ? 'border-moss bg-moss-soft scale-[1.01] shadow-lg' : 'border-line hover:bg-paper hover:border-mute'}`}>
        <Upload className={`mx-auto text-mute transition-transform ${drag ? 'scale-125 text-moss' : ''}`} size={22} /><p className="mt-2 text-sm font-medium">Drop an image here or press Enter to browse</p>
        <input ref={input} type="file" accept="image/png,image/jpeg" hidden onChange={e => { handle(e.target.files[0]); e.target.value = '' }} /></div>
      {err && <p role="alert" className="mt-3 text-sm text-clay bg-clay-soft px-3 py-2">{err}</p>}
      {busy && <LoadingState text="Detecting pose landmarks…" />}
      {src && !busy && <div className="mt-8 grid lg:grid-cols-2 gap-4">
        <figure><figcaption className="text-xs text-mute mb-1">Original</figcaption><img src={src.url} alt="Uploaded pose" className="w-full border border-line" /></figure>
        <figure><figcaption className="text-xs text-mute mb-1">Analysed</figcaption><canvas ref={canvas} className="w-full border border-line" aria-label="Analysed pose with skeleton" /></figure></div>}
      {src && !busy && lms === null && <p className="mt-6 text-sm border-l-2 border-amber pl-3">No person was detected. Use a photo where the whole body is visible and well lit.</p>}
      {result && !busy && <div className="mt-8 grid lg:grid-cols-[260px_1fr] gap-8">
        <div>
          <div className="text-xs text-mute">Form score</div>
          <div className="text-6xl font-semibold"><AnimatedNumber value={Math.round(result.form_score * 100)} /><span className="text-2xl text-mute">%</span></div>
          <span className={`mt-2 inline-block px-2 py-0.5 text-sm font-medium ${TONE[tone]}`}>{word}</span>
          <dl className="mt-5 text-sm space-y-2"><div className="flex justify-between"><dt className="text-mute">Detected pose</dt><dd className="font-medium">{result.pose}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">{result.source === 'model' ? 'Classifier confidence' : 'Match to pose rules'}</dt><dd className="font-medium">{Math.round(result.confidence * 100)}%</dd></div></dl>
          <label className="mt-5 block text-sm text-mute">Judge against{' '}<select value={target} onChange={e => setTarget(e.target.value)} className="border border-line bg-paper text-ink px-2 py-1.5">
            <option value="auto">Best match</option>{Object.keys(RULES).map(p => <option key={p}>{p}</option>)}</select></label>
          <div className="mt-6"><BodyDiagram errors={result.errors} active={active} onActive={setActive} /></div>
        </div>
        <div>
          <h2 className="font-semibold">Joint-by-joint</h2>
          <table className="mt-2 w-full text-sm"><tbody className="divide-y divide-line">
            {Object.entries(result.joint_angles).map(([j, v]) => { const e = result.errors.find(x => x.joint === j), s = e ? e.severity : 'ok'
              return <tr key={j} onMouseEnter={() => setActive(j)} onMouseLeave={() => setActive(null)} className={active === j ? 'bg-paper' : ''}>
                <td className="py-2">{label(j)}</td><td className="text-mute">{v}°</td>
                <td className="text-right"><span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${TONE[s]}`}>{s === 'ok' ? <Check size={12} /> : <AlertTriangle size={12} />}{s === 'ok' ? 'Correct' : s === 'warning' ? 'Needs adjustment' : 'Incorrect'}</span></td></tr> })}
          </tbody></table>
          <h2 className="font-semibold mt-8">How to improve</h2>
          {result.errors.length ? <ul className="mt-2 space-y-2">{result.errors.map((e, i) =>
            <Reveal as="li" key={e.joint} className="list-none"><ErrorIndicator error={e} correction={result.corrections[i]} active={active} onActive={setActive} /></Reveal>)}</ul>
            : <p className="mt-2 text-sm text-moss-dark">No alignment problems found against the {result.pose} rules.</p>}
        </div></div>}
      {result && !busy && (() => { const ref = POSES.find(p => p.name === result.pose)?.ref
        return <section className="mt-10"><h2 className="font-semibold mb-3">Compare with reference</h2>{ref ? <PoseComparison user={lms} aspect={aspect} refPts={ref} /> : <p className="text-sm text-mute">No reference skeleton exists yet for {result.pose}.</p>}</section> })()}
    </div>
  )
}