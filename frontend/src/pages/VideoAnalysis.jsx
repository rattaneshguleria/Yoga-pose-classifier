import { useRef, useState } from 'react'
import {
  Film,
  Upload,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  Clock3,
  ScanLine,
  RotateCcw,
} from 'lucide-react'

import { createVideoLandmarker } from '../lib/poseEngine.js'
import { classify, evaluate, RULES, poseLabel } from '../lib/analysis.js'
import VideoTimeline from '../components/VideoTimeline.jsx'
import LoadingState from '../components/LoadingState.jsx'
import AnimatedNumber from '../components/AnimatedNumber.jsx'
import { fmtTime, label, TONE, why } from '../lib/ui.js'

const STEP = 0.25
const MAX_SECONDS = 120

const seek = (v, t) =>
  new Promise(resolve => {
    v.onseeked = resolve
    v.currentTime = t
  })

export default function VideoAnalysis() {
  const player = useRef(null)
  const cancel = useRef(false)

  const [url, setUrl] = useState(null)
  const [progress, setProgress] = useState(null)
  const [err, setErr] = useState('')
  const [res, setRes] = useState(null)
  const [now, setNow] = useState(0)
  const [dragging, setDragging] = useState(false)

  async function run(file) {
    setErr('')
    setRes(null)

    if (!file?.type.startsWith('video/')) {
      return setErr('Choose a video file (MP4, MOV or WebM).')
    }

    const u = URL.createObjectURL(file)

    setUrl(u)
    cancel.current = false
    setProgress(0)

    const v = document.createElement('video')

    v.src = u
    v.muted = true
    v.preload = 'auto'

    try {
      await new Promise((ok, no) => {
        v.onloadedmetadata = ok
        v.onerror = no
      })

      const dur = Math.min(v.duration, MAX_SECONDS)
      const asp = v.videoWidth / v.videoHeight
      const model = await createVideoLandmarker()
      const frames = []

      for (
        let i = 0, t = 0;
        t < dur;
        i++, t += STEP
      ) {
        if (cancel.current) {
          setProgress(null)
          return
        }

        await seek(v, t)

        const l =
          model.detectForVideo(
            v,
            i * 250 + 1
          ).landmarks[0]

        if (l) {
          const c = classify(l, asp)

          const coachPose =
            c.coachPose ||
            (RULES[c.pose] ? c.pose : null)

          const pose = coachPose || c.pose

          frames.push({
            t,
            pose,
            detectedPose: c.pose,
            confidence: c.confidence,
            ...evaluate(pose, l, asp),
          })
        }

        setProgress(t / dur)
      }

      if (!frames.length) {
        setProgress(null)
        return setErr(
          'No person was detected in this video.'
        )
      }

      const segments = []

      frames.forEach(f => {
        const s =
          segments[segments.length - 1]

        if (
          s &&
          s.pose === f.pose &&
          f.t - s.end <= STEP * 2
        ) {
          s.end = f.t + STEP
        } else {
          segments.push({
            pose: f.pose,
            start: f.t,
            end: f.t + STEP,
          })
        }
      })

      const scoredFrames = frames.filter(
        f => f.form_score != null
      )

      const issues = []

      scoredFrames.forEach(f => {
        f.errors.forEach(e => {
          if (
            e.severity !== 'incorrect' &&
            f.form_score >= 0.7
          ) {
            return
          }

          if (
            !issues.some(
              x =>
                x.joint === e.joint &&
                f.t - x.t < 2
            )
          ) {
            issues.push({
              t: f.t,
              joint: e.joint,
              severity: e.severity,
              error: e,
            })
          }
        })
      })

      setRes({
        dur,
        segments: segments.filter(
          s => s.end - s.start >= 0.5
        ),
        issues,
        score: scoredFrames.length
          ? scoredFrames.reduce(
              (a, f) => a + f.form_score,
              0
            ) / scoredFrames.length
          : null,
      })
    } catch {
      setErr(
        'This video could not be analysed. Try MP4 (H.264) and check your connection for the first model load.'
      )
    }

    setProgress(null)
  }

  const jump = t => {
    const p = player.current

    if (p) {
      p.currentTime = Math.max(0, t)
      setNow(p.currentTime)
    }
  }

  const reset = () => {
    cancel.current = true

    if (url) {
      URL.revokeObjectURL(url)
    }

    setUrl(null)
    setRes(null)
    setProgress(null)
    setErr('')
    setNow(0)
  }

  const poses = res
    ? [...new Set(res.segments.map(s => s.pose))]
    : []

  const score =
    res?.score != null
      ? Math.round(res.score * 100)
      : null

  return (
    <div className="min-h-screen bg-bone">
      {/* Header */}
      <div className="border-b border-line bg-paper">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-7">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-moss-dark">
                <Film size={14} />
                Video analysis
              </div>

              <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-ink">
                Review your practice
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">
                Upload a practice video and YOGAVISION will
                identify poses, estimate form quality and highlight
                alignment issues across the session.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-mute">
              <ShieldCheck
                size={15}
                className="text-moss"
              />
              <span>
                Analysed locally in your browser
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-5 md:px-8 py-8">
        {/* Error */}
        {err && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 border border-clay-soft bg-clay-soft px-4 py-3 text-sm text-clay"
          >
            <AlertTriangle
              size={17}
              className="mt-0.5 shrink-0"
            />

            <div>
              <div className="font-semibold">
                Analysis could not be completed
              </div>

              <div className="mt-0.5">
                {err}
              </div>
            </div>
          </div>
        )}

        {/* Empty / Upload state */}
        {!url && progress == null && (
          <div className="grid lg:grid-cols-[1.3fr_.7fr] gap-6">
            <label
              onDragEnter={() => setDragging(true)}
              onDragOver={e => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => {
                e.preventDefault()
                setDragging(false)
                run(e.dataTransfer.files?.[0])
              }}
              className={`
                group relative min-h-[420px]
                flex flex-col items-center justify-center
                text-center cursor-pointer
                border-2 border-dashed
                transition-all duration-200
                ${
                  dragging
                    ? 'border-moss bg-moss-soft/60'
                    : 'border-line bg-paper hover:border-moss/60 hover:bg-moss-soft/20'
                }
              `}
            >
              <input
                type="file"
                accept="video/*"
                hidden
                onChange={e => {
                  run(e.target.files[0])
                  e.target.value = ''
                }}
              />

              <div className="h-16 w-16 rounded-2xl bg-moss-soft text-moss-dark flex items-center justify-center transition-transform duration-200 group-hover:-translate-y-1">
                <Upload size={27} />
              </div>

              <h2 className="mt-6 text-xl font-semibold text-ink">
                Upload your practice video
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-mute">
                Drag and drop a video here, or choose a file
                from your device.
              </p>

              <span className="mt-6 inline-flex items-center gap-2 bg-ink text-white px-5 py-2.5 text-sm font-semibold transition-colors group-hover:bg-moss-dark">
                <Film size={15} />
                Choose video
              </span>

              <div className="mt-5 text-xs text-mute">
                MP4, MOV or WebM · First {MAX_SECONDS} seconds
              </div>
            </label>

            {/* What you'll get */}
            <div className="border border-line bg-paper p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Sparkles
                  size={16}
                  className="text-moss"
                />
                What you'll get
              </div>

              <div className="mt-6 space-y-5">
                <Feature
                  icon={ScanLine}
                  title="Pose detection"
                  text="See which yoga poses were recognised throughout your video."
                />

                <Feature
                  icon={CheckCircle2}
                  title="Form score"
                  text="Get an overall score based on supported coaching rules."
                />

                <Feature
                  icon={AlertTriangle}
                  title="Alignment issues"
                  text="Jump directly to moments where your alignment needs attention."
                />

                <Feature
                  icon={Clock3}
                  title="Practice timeline"
                  text="Explore pose segments and corrections across your session."
                />
              </div>

              <div className="mt-7 pt-5 border-t border-line">
                <div className="flex gap-2 text-xs leading-5 text-mute">
                  <ShieldCheck
                    size={14}
                    className="mt-0.5 shrink-0 text-moss"
                  />

                  <span>
                    Your video is processed in the browser.
                    Nothing is uploaded for analysis.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {progress != null && (
          <div className="max-w-2xl mx-auto py-16">
            <div className="border border-line bg-paper p-8 text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-moss-soft text-moss-dark flex items-center justify-center">
                <Sparkles size={23} />
              </div>

              <h2 className="mt-5 text-xl font-semibold text-ink">
                Analysing your practice
              </h2>

              <p className="mt-2 text-sm text-mute">
                YOGAVISION is scanning the video frame by
                frame for poses and alignment.
              </p>

              <div className="mt-7">
                <LoadingState
                  text={`Analysing… ${Math.round(
                    progress * 100
                  )}%`}
                  progress={progress}
                />
              </div>

              <button
                onClick={() => {
                  cancel.current = true
                }}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-mute hover:text-ink transition-colors"
              >
                <span>Cancel analysis</span>
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {url && progress == null && (
          <div className="space-y-6">
            {/* Video + score */}
            <div className="grid xl:grid-cols-[1fr_360px] gap-6">
              {/* Player */}
              <section className="border border-line bg-paper overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                  <div>
                    <div className="text-sm font-semibold text-ink">
                      Practice video
                    </div>

                    <div className="mt-0.5 text-xs text-mute">
                      Click timeline markers to jump to moments
                    </div>
                  </div>

                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-mute hover:text-ink hover:bg-bone transition-colors"
                  >
                    <RotateCcw size={13} />
                    New video
                  </button>
                </div>

                <div className="bg-ink">
                  <video
                    ref={player}
                    src={url}
                    controls
                    className="w-full max-h-[420px] object-contain"
                    onTimeUpdate={e =>
                      setNow(
                        e.currentTarget.currentTime
                      )
                    }
                  />
                </div>

                {res && (
                  <div className="p-5">
                    <VideoTimeline
                      duration={res.dur}
                      segments={res.segments}
                      issues={res.issues}
                      current={now}
                      onSeek={jump}
                    />
                  </div>
                )}
              </section>

              {/* Score */}
              {res && (
                <aside className="space-y-5">
                  <div className="border border-line bg-paper p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.14em] font-semibold text-mute">
                          Overall form
                        </div>

                        <div className="mt-1 text-sm text-mute">
                          Supported poses only
                        </div>
                      </div>

                      <div className="h-10 w-10 rounded-xl bg-moss-soft text-moss-dark flex items-center justify-center">
                        <CheckCircle2 size={19} />
                      </div>
                    </div>

                    {score == null ? (
                      <div className="mt-8">
                        <div className="text-2xl font-semibold text-ink">
                          Recognition only
                        </div>

                        <p className="mt-2 text-sm leading-6 text-mute">
                          Detected poses do not currently have
                          matching coaching rules.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-7 flex items-end gap-2">
                        <div className="text-7xl font-semibold tracking-tight text-ink leading-none">
                          <AnimatedNumber value={score} />
                        </div>

                        <span className="pb-1 text-2xl font-medium text-mute">
                          %
                        </span>
                      </div>
                    )}

                    {score != null && (
                      <div className="mt-6 h-2 bg-bone overflow-hidden">
                        <div
                          className="h-full bg-moss transition-all"
                          style={{
                            width: `${score}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Detected poses */}
                  <div className="border border-line bg-paper p-6">
                    <div className="flex items-center gap-2">
                      <ScanLine
                        size={16}
                        className="text-moss"
                      />

                      <h2 className="text-sm font-semibold text-ink">
                        Detected poses
                      </h2>
                    </div>

                    {poses.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {poses.map(p => (
                          <span
                            key={p}
                            className="px-3 py-1.5 bg-moss-soft text-moss-dark text-xs font-semibold"
                          >
                            {poseLabel(p)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-mute">
                        No poses detected.
                      </p>
                    )}
                  </div>

                  {/* Issues */}
                  {score != null && (
                    <div className="border border-line bg-paper p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle
                            size={16}
                            className="text-amber"
                          />

                          <h2 className="text-sm font-semibold text-ink">
                            Alignment issues
                          </h2>
                        </div>

                        <span className="text-xs font-semibold text-mute">
                          {res.issues.length}
                        </span>
                      </div>

                      {res.issues.length === 0 ? (
                        <div className="mt-5 flex items-start gap-3 bg-moss-soft px-4 py-3">
                          <CheckCircle2
                            size={17}
                            className="mt-0.5 text-moss-dark shrink-0"
                          />

                          <p className="text-sm leading-5 text-moss-dark">
                            No alignment issues found in
                            supported poses.
                          </p>
                        </div>
                      ) : (
                        <ul className="mt-4 divide-y divide-line max-h-96 overflow-auto">
                          {res.issues.map((x, i) => (
                            <li key={i}>
                              <button
                                onClick={() =>
                                  jump(x.t)
                                }
                                className="w-full text-left py-3 px-2 hover:bg-bone transition-colors"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-sm font-semibold text-ink">
                                    {label(x.joint)}
                                  </span>

                                  <span className="text-xs font-medium text-mute">
                                    {fmtTime(x.t)}
                                  </span>
                                </div>

                                <div className="mt-1.5 flex items-center gap-2">
                                  <span
                                    className={`px-1.5 py-0.5 text-[11px] ${TONE[x.severity]}`}
                                  >
                                    {x.severity ===
                                    'incorrect'
                                      ? 'Incorrect'
                                      : 'Adjust'}
                                  </span>

                                  <span className="text-xs text-mute">
                                    Click to jump
                                  </span>
                                </div>

                                <span className="block mt-2 text-xs leading-5 text-mute">
                                  {why(x.error)}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </aside>
              )}
            </div>

            {/* Bottom summary */}
            {res && (
              <div className="grid sm:grid-cols-3 gap-4">
                <SummaryCard
                  icon={Clock3}
                  label="Video analysed"
                  value={fmtTime(res.dur)}
                />

                <SummaryCard
                  icon={ScanLine}
                  label="Poses detected"
                  value={poses.length}
                />

                <SummaryCard
                  icon={AlertTriangle}
                  label="Issues found"
                  value={res.issues.length}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function Feature({ icon: Icon, title, text }) {
  return (
    <div className="flex gap-3">
      <div className="h-9 w-9 shrink-0 bg-moss-soft text-moss-dark flex items-center justify-center">
        <Icon size={16} />
      </div>

      <div>
        <div className="text-sm font-semibold text-ink">
          {title}
        </div>

        <p className="mt-1 text-xs leading-5 text-mute">
          {text}
        </p>
      </div>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="border border-line bg-paper px-5 py-4 flex items-center gap-3">
      <div className="h-9 w-9 bg-moss-soft text-moss-dark flex items-center justify-center">
        <Icon size={16} />
      </div>

      <div>
        <div className="text-xs text-mute">
          {label}
        </div>

        <div className="mt-0.5 text-lg font-semibold text-ink">
          {value}
        </div>
      </div>
    </div>
  )
}