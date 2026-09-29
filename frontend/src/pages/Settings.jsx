import { useEffect, useState } from 'react'
import { useSettings } from '../lib/settings.js'
const Row = ({ title, hint, children }) => <div className="flex items-center justify-between gap-6 py-4"><div><div className="font-medium">{title}</div><div className="text-sm text-mute">{hint}</div></div>{children}</div>
const Toggle = ({ on, set, label }) => <button role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)} className={`w-11 h-6 shrink-0 p-0.5 transition-colors ${on ? 'bg-moss' : 'bg-line'}`}><span className={`block h-5 w-5 bg-white transition-transform ${on ? 'translate-x-5' : ''}`} /></button>
export default function Settings() {
  const [s, patch] = useSettings(), [cams, setCams] = useState([])
  useEffect(() => { navigator.mediaDevices?.enumerateDevices().then(d => setCams(d.filter(x => x.kind === 'videoinput'))).catch(() => {}) }, [])
  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <div className="mt-4 divide-y divide-line border-y border-line">
        <Row title="Camera" hint="Device labels appear after you have allowed camera access once."><select value={s.cameraId} onChange={e => patch({ cameraId: e.target.value })} className="border border-line bg-paper px-2 py-1.5 text-sm max-w-[14rem]">
          <option value="">Default camera</option>{cams.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${i + 1}`}</option>)}</select></Row>
        <Row title="Mirror camera by default" hint="Shows the live feed like a mirror."><Toggle on={s.mirror} set={v => patch({ mirror: v })} label="Mirror camera by default" /></Row>
        <Row title="Reduce motion" hint="Turns off page transitions and animated numbers."><Toggle on={s.reducedMotion} set={v => patch({ reducedMotion: v })} label="Reduce motion" /></Row>
        <Row title="High contrast" hint="Darker text and stronger borders."><Toggle on={s.highContrast} set={v => patch({ highContrast: v })} label="High contrast" /></Row>
        <Row title="Where analysis runs" hint="Pose detection currently runs in your browser only. Server inference arrives in phase 6."><span className="text-sm text-mute">Browser (local)</span></Row>
      </div></div>)
}
