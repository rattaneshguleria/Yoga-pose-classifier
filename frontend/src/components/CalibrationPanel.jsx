import { Check, Circle } from 'lucide-react'
export function calibrationChecks({ cameraOn, lms, brightness }) {
  const v = i => lms?.[i]?.visibility ?? 0
  const inFrame = i => lms && lms[i].y > 0.01 && lms[i].y < 0.99 && lms[i].x > 0.01 && lms[i].x < 0.99
  return [
    ['Camera', cameraOn, 'Allow camera access.'],
    ['Body detected', [11,12,23,24].every(i => v(i) > 0.6), 'Step into the frame.'],
    ['Lighting', brightness > 60 && brightness < 220, brightness <= 60 ? 'Too dark: face a light source.' : 'Too bright: avoid a window behind you.'],
    ['Full body', [0,27,28].every(i => v(i) > 0.5 && inFrame(i)), 'Stand 2–3 metres back so head and feet are visible.'],
  ]
}
export default function CalibrationPanel({ checks, onBegin }) {
  const ready = checks.every(c => c[1])
  return (
    <div>
      <h2 className="text-sm font-semibold">Calibration</h2>
      <ul className="mt-3 space-y-2 text-sm">{checks.map(([name, ok, hint]) =>
        <li key={name} className="flex items-start gap-2">
          {ok ? <Check size={16} className="text-moss mt-0.5" /> : <Circle size={16} className="text-mute mt-0.5" />}
          <div><div className={ok ? 'font-medium' : ''}>{name}</div>{!ok && <div className="text-xs text-mute">{hint}</div>}</div></li>)}
      </ul>
      <button disabled={!ready} onClick={onBegin} className="mt-5 w-full bg-moss text-white py-2.5 text-sm font-semibold disabled:bg-line disabled:text-mute hover:bg-moss-dark transition-colors">
        {ready ? 'Calibration complete: begin session' : 'Waiting for all checks'}</button>
    </div>
  )
}
