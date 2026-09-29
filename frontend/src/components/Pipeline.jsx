import { useState } from 'react'
// status: what is true of THIS codebase today, so the diagram never overclaims.
export const STAGES = [
  ['Camera / image / video', 'Live webcam via getUserMedia, uploaded PNG/JPG images, or uploaded videos sampled at 4 frames per second.', 'Working'],
  ['OpenCV preprocessing', 'In the browser, MediaPipe resizes and normalises frames itself. On the server path, cv2.imdecode plus BGR to RGB conversion prepares frames.', 'Server path in phase 6'],
  ['Pose landmark detection', 'MediaPipe Pose Landmarker returns 33 body landmarks per frame with visibility scores. It runs in the browser, so frames stay on the device.', 'Working'],
  ['Feature extraction', 'Landmarks are converted to the values the rules and classifier use: joint angles, torso lean, shoulder tilt and, for training, hip-centred coordinates scaled by torso length.', 'Working'],
  ['Joint angle calculation', 'Angles at elbows, knees and hips come from the dot product of the two limb vectors at each joint, corrected for the video aspect ratio.', 'Working'],
  ['Pose classification', 'Today the pose is the best fit of measured angles against each pose\u2019s rule ranges. After training, an MLP on landmark features replaces this and reports a real confidence.', 'Rule-based until trained'],
  ['Form / error detection', 'Each angle is compared with the target range for the pose. Deviations become errors with a severity: within 20\u00b0 is a warning, beyond that is incorrect.', 'Working'],
  ['Feedback generation', 'Every rule carries a correction message for too-small and too-large angles, so the text on screen comes directly from the measurement.', 'Working'],
  ['Analytics', 'Saved sessions store per-pose accuracy and per-joint time in range in SQLite. Progress and the dashboard aggregate them.', 'Working'],
]
export default function Pipeline() {
  const [i, setI] = useState(0), [name, text, status] = STAGES[i]
  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-8">
      <ol className="border-l border-line" role="tablist" aria-orientation="vertical">{STAGES.map(([n], k) =>
        <li key={n}><button role="tab" aria-selected={i === k} onClick={() => setI(k)}
          onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(STAGES.length - 1, k + 1)) } if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(0, k - 1)) } }}
          tabIndex={i === k ? 0 : -1}
          className={`w-full text-left px-4 py-2 text-sm -ml-px border-l-2 transition-colors ${i === k ? 'border-moss bg-moss-soft font-semibold text-moss-dark' : 'border-transparent text-mute hover:text-ink hover:bg-paper'}`}>{n}</button></li>)}</ol>
      <div role="tabpanel" className="min-h-[9rem]" key={i}><div className="page-in"><h3 className="text-xl font-semibold">{name}</h3>
        <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-medium ${status === 'Working' ? 'bg-moss-soft text-moss-dark' : 'bg-amber-soft text-amber'}`}>{status}</span>
        <p className="mt-3 max-w-xl leading-relaxed">{text}</p></div></div>
    </div>)
}
