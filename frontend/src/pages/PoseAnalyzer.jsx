import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Upload,
  Check,
  AlertTriangle,
  ScanLine,
  Sparkles,
  Image as ImageIcon,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'

import { detectImage } from '../lib/poseEngine.js'
import PoseComparison from '../components/PoseComparison.jsx'
import {
  classify,
  evaluate,
  RULES,
  POSES,
  poseLabel,
} from '../lib/analysis.js'
import { BONES } from '../components/PoseSkeleton.jsx'
import BodyDiagram from '../components/BodyDiagram.jsx'
import ErrorIndicator from '../components/ErrorIndicator.jsx'
import LoadingState from '../components/LoadingState.jsx'
import AnimatedNumber from '../components/AnimatedNumber.jsx'
import { TONE, label, verdict } from '../lib/ui.js'
import Reveal from '../components/Reveal.jsx'

const OK_TYPES = ['image/png', 'image/jpeg']
const MAX_MB = 10

function ScoreRing({ score }) {
  const value = Math.max(
    0,
    Math.min(100, Math.round(score * 100))
  )

  return (
    <div
      className="relative grid h-36 w-36 place-items-center rounded-full"
      style={{
        background: `conic-gradient(#7E9D82 ${
          value * 3.6
        }deg, #E4E7E2 0deg)`,
      }}
    >
      <div className="grid h-28 w-28 place-items-center rounded-full bg-[#18201C]">
        <div className="text-center text-white">
          <div className="text-4xl font-semibold tracking-tight">
            {value}
            <span className="text-base text-[#A8C3A0]">
              %
            </span>
          </div>

          <div className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
            form score
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PoseAnalyzer() {
  const canvas = useRef(null)
  const input = useRef(null)

  const [src, setSrc] = useState(null)
  const [lms, setLms] = useState(undefined)
  const [aspect, setAspect] = useState(1)

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [drag, setDrag] = useState(false)

  const [target, setTarget] = useState('auto')
  const [active, setActive] = useState(null)

  async function handle(file) {
    setErr('')

    if (!file) return

    if (!OK_TYPES.includes(file.type)) {
      return setErr(
        'Use a PNG, JPG or JPEG image.'
      )
    }

    if (file.size > MAX_MB * 1048576) {
      return setErr(
        `Image is over ${MAX_MB} MB. Resize it and try again.`
      )
    }

    const url = URL.createObjectURL(file)
    const img = new Image()

    setBusy(true)
    setLms(undefined)

    img.onload = async () => {
      try {
        setAspect(
          img.naturalWidth /
            img.naturalHeight
        )

        const l = await detectImage(img)

        setSrc({
          url,
          img,
        })

        setLms(l)
      } catch {
        setErr(
          'The pose model could not load. Check your connection and try again.'
        )
      }

      setBusy(false)
    }

    img.onerror = () => {
      setBusy(false)
      setErr(
        'That file could not be read as an image.'
      )
    }

    img.src = url
  }

  const result = useMemo(() => {
    if (!lms) return null

    const c = classify(
      lms,
      aspect
    )

    const coachPose =
      target === 'auto'
        ? c.coachPose ||
          (RULES[c.pose]
            ? c.pose
            : null)
        : target

    const pose =
      coachPose || c.pose

    return {
      pose,
      detectedPose: c.pose,
      confidence: c.confidence,
      source: c.source,
      ...evaluate(
        pose,
        lms,
        aspect
      ),
    }
  }, [
    lms,
    aspect,
    target,
  ])

  useEffect(() => {
    if (!src || !canvas.current)
      return

    const c = canvas.current
    const { img } = src

    const s = Math.min(
      1,
      1280 / img.naturalWidth
    )

    c.width =
      img.naturalWidth * s

    c.height =
      img.naturalHeight * s

    const x = c.getContext('2d')

    x.drawImage(
      img,
      0,
      0,
      c.width,
      c.height
    )

    if (!lms) return

    x.strokeStyle = '#F5F5F1'
    x.lineWidth = Math.max(
      2,
      c.width / 320
    )

    BONES.forEach(([a, b]) => {
      x.beginPath()

      x.moveTo(
        lms[a].x * c.width,
        lms[a].y * c.height
      )

      x.lineTo(
        lms[b].x * c.width,
        lms[b].y * c.height
      )

      x.stroke()
    })

    const bad =
      Object.fromEntries(
        (result?.errors || []).map(
          e => [
            e.landmark,
            e.severity,
          ]
        )
      )

    ;[
      0,
      11,
      12,
      13,
      14,
      15,
      16,
      23,
      24,
      25,
      26,
      27,
      28,
    ].forEach(i => {
      x.fillStyle =
        bad[i] === 'incorrect'
          ? '#D9694A'
          : bad[i]
          ? '#E0A63A'
          : '#6FA57B'

      x.beginPath()

      x.arc(
        lms[i].x * c.width,
        lms[i].y * c.height,
        c.width / 130 +
          (bad[i] ? 3 : 0),
        0,
        7
      )

      x.fill()
    })
  }, [src, lms, result])

  const [word, tone] = result
    ? verdict(result.form_score)
    : []

  return (
    <main className="min-h-screen bg-[#F5F5F1] p-4 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <Reveal>
          <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-moss">
                <ScanLine size={14} />
                Pose Analysis
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
                Understand your form.
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-mute">
                Upload a yoga pose and let YogaVision analyze
                your alignment, confidence, and form.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-4 py-3 text-xs text-mute">
              <ShieldCheck
                size={15}
                className="text-moss"
              />
              Analysis runs locally in your browser
            </div>
          </section>
        </Reveal>

        {/* UPLOAD */}
        {!src && !busy && (
          <Reveal delay={80}>
            <section
              role="button"
              tabIndex={0}
              onClick={() =>
                input.current.click()
              }
              onKeyDown={e =>
                (e.key === 'Enter' ||
                  e.key === ' ') &&
                input.current.click()
              }
              onDragOver={e => {
                e.preventDefault()
                setDrag(true)
              }}
              onDragLeave={() =>
                setDrag(false)
              }
              onDrop={e => {
                e.preventDefault()
                setDrag(false)
                handle(
                  e.dataTransfer.files[0]
                )
              }}
              className={`group mt-8 cursor-pointer rounded-[28px] border-2 border-dashed p-10 text-center transition-all duration-200 md:p-16 ${
                drag
                  ? 'border-moss bg-moss-soft scale-[1.01] shadow-lg'
                  : 'border-line bg-paper hover:border-moss/50 hover:bg-white'
              }`}
            >
              <div
                className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl transition ${
                  drag
                    ? 'bg-moss text-white'
                    : 'bg-moss-soft text-moss group-hover:scale-105'
                }`}
              >
                <Upload size={26} />
              </div>

              <h2 className="mt-6 text-xl font-semibold">
                Upload your pose
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-mute">
                Drop an image here or click to browse.
                Make sure your whole body is visible and
                the image is well lit.
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white">
                <Upload size={15} />
                Choose image
              </div>

              <p className="mt-4 text-xs text-mute">
                PNG, JPG or JPEG · Maximum {MAX_MB} MB
              </p>

              <input
                ref={input}
                type="file"
                accept="image/png,image/jpeg"
                hidden
                onChange={e => {
                  handle(
                    e.target.files[0]
                  )
                  e.target.value = ''
                }}
              />
            </section>
          </Reveal>
        )}

        {/* LOADING */}
        {busy && (
          <div className="mt-8 rounded-[28px] border border-line bg-paper p-8">
            <LoadingState text="Detecting pose landmarks…" />
          </div>
        )}

        {err && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-xl bg-clay-soft px-4 py-3 text-sm text-clay"
          >
            <AlertTriangle
              size={17}
              className="mt-0.5 shrink-0"
            />
            {err}
          </div>
        )}

        {/* IMAGE + RESULT */}
        {src && !busy && (
          <>
            <Reveal delay={80}>
              <section className="mt-8 grid gap-5 lg:grid-cols-2">

                {/* ORIGINAL */}
                <div className="overflow-hidden rounded-[24px] border border-line bg-paper">
                  <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-mute">
                        Original
                      </div>

                      <div className="mt-1 text-sm font-medium">
                        Uploaded image
                      </div>
                    </div>

                    <ImageIcon
                      size={18}
                      className="text-mute"
                    />
                  </div>

                  <div className="bg-[#101412] p-3">
                    <img
                      src={src.url}
                      alt="Uploaded pose"
                      className="max-h-[620px] w-full rounded-xl object-contain"
                    />
                  </div>
                </div>

                {/* ANALYSED */}
                <div className="overflow-hidden rounded-[24px] border border-line bg-paper">
                  <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-moss">
                        <Sparkles size={13} />
                        AI analysis
                      </div>

                      <div className="mt-1 text-sm font-medium">
                        Landmark overlay
                      </div>
                    </div>

                    <span className="rounded-lg bg-moss-soft px-2 py-1 text-[10px] font-semibold text-moss-dark">
                      DETECTED
                    </span>
                  </div>

                  <div className="bg-[#101412] p-3">
                    <canvas
                      ref={canvas}
                      className="max-h-[620px] w-full rounded-xl object-contain"
                      aria-label="Analysed pose with skeleton"
                    />
                  </div>
                </div>
              </section>
            </Reveal>

            {/* NO PERSON */}
            {lms === null && (
              <Reveal delay={120}>
                <div className="mt-5 rounded-2xl border border-amber/30 bg-amber-soft p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      size={18}
                      className="mt-0.5 text-amber"
                    />

                    <div>
                      <div className="font-semibold">
                        No person detected
                      </div>

                      <p className="mt-1 text-sm leading-5 text-mute">
                        Use a photo where your whole body
                        is visible and well lit.
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            )}

            {/* RESULTS */}
            {result && (
              <Reveal delay={160}>
                <section className="mt-8">

                  {/* RESULT HEADER */}
                  <div className="rounded-[26px] bg-[#18201C] p-6 text-white md:p-8">
                    <div className="flex flex-col justify-between gap-7 md:flex-row md:items-center">

                      <div className="flex items-center gap-6">
                        {result.recognition_only ? (
                          <div className="grid h-28 w-28 place-items-center rounded-full bg-white/5">
                            <ScanLine
                              size={30}
                              className="text-[#A8C3A0]"
                            />
                          </div>
                        ) : (
                          <ScoreRing
                            score={
                              result.form_score
                            }
                          />
                        )}

                        <div>
                          <div className="text-xs uppercase tracking-[0.16em] text-white/40">
                            {result.recognition_only
                              ? 'Detected pose'
                              : 'Form assessment'}
                          </div>

                          <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
                            {result.recognition_only
                              ? poseLabel(
                                  result.detectedPose
                                )
                              : word}
                          </h2>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs">
                              {poseLabel(
                                result.pose ||
                                  result.detectedPose
                              )}
                            </span>

                            <span className="text-xs text-white/45">
                              {result.source ===
                              'model'
                                ? 'Classifier confidence'
                                : 'Match to pose rules'}{' '}
                              ·{' '}
                              {Math.round(
                                result.confidence *
                                  100
                              )}
                              %
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/50">
                        <ShieldCheck
                          size={15}
                          className="text-[#A8C3A0]"
                        />
                        Analyzed locally
                      </div>
                    </div>
                  </div>

                  {/* BODY + JOINTS */}
                  {!result.recognition_only && (
                    <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">

                      {/* BODY */}
                      <section className="rounded-[24px] border border-line bg-paper p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-mute">
                              Alignment map
                            </div>

                            <h3 className="mt-1 text-lg font-semibold">
                              Your body
                            </h3>
                          </div>

                          <div className="grid h-9 w-9 place-items-center rounded-xl bg-moss-soft text-moss">
                            <ActivityIcon />
                          </div>
                        </div>

                        <div className="mt-5">
                          <BodyDiagram
                            errors={
                              result.errors
                            }
                            active={active}
                            onActive={
                              setActive
                            }
                          />
                        </div>

                        <label className="mt-5 block text-sm text-mute">
                          Judge against

                          <select
                            value={target}
                            onChange={e =>
                              setTarget(
                                e.target.value
                              )
                            }
                            className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink outline-none focus:border-moss"
                          >
                            <option value="auto">
                              Best match
                            </option>

                            {Object.keys(
                              RULES
                            ).map(p => (
                              <option key={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </label>
                      </section>

                      {/* JOINTS */}
                      <section className="rounded-[24px] border border-line bg-paper p-6">
                        <div className="flex items-end justify-between">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-mute">
                              Detailed feedback
                            </div>

                            <h3 className="mt-1 text-lg font-semibold">
                              Joint-by-joint
                            </h3>
                          </div>

                          <span className="text-xs text-mute">
                            {Object.keys(
                              result.joint_angles
                            ).length}{' '}
                            points
                          </span>
                        </div>

                        <div className="mt-5 overflow-hidden rounded-2xl border border-line">
                          <table className="w-full text-sm">
                            <tbody className="divide-y divide-line">
                              {Object.entries(
                                result.joint_angles
                              ).map(
                                ([j, v]) => {
                                  const e =
                                    result.errors.find(
                                      x =>
                                        x.joint ===
                                        j
                                    )

                                  const s =
                                    e
                                      ? e.severity
                                      : 'ok'

                                  return (
                                    <tr
                                      key={j}
                                      onMouseEnter={() =>
                                        setActive(
                                          j
                                        )
                                      }
                                      onMouseLeave={() =>
                                        setActive(
                                          null
                                        )
                                      }
                                      className={`transition-colors ${
                                        active ===
                                        j
                                          ? 'bg-moss-soft/60'
                                          : 'hover:bg-bone'
                                      }`}
                                    >
                                      <td className="px-4 py-3 font-medium">
                                        {label(j)}
                                      </td>

                                      <td className="px-4 py-3 text-mute">
                                        {v}°
                                      </td>

                                      <td className="px-4 py-3 text-right">
                                        <span
                                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold ${TONE[s]}`}
                                        >
                                          {s ===
                                          'ok' ? (
                                            <Check
                                              size={
                                                11
                                              }
                                            />
                                          ) : (
                                            <AlertTriangle
                                              size={
                                                11
                                              }
                                            />
                                          )}

                                          {s ===
                                          'ok'
                                            ? 'Correct'
                                            : s ===
                                              'warning'
                                            ? 'Needs adjustment'
                                            : 'Incorrect'}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                }
                              )}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    </div>
                  )}

                  {/* IMPROVEMENTS */}
                  {!result.recognition_only && (
                    <section className="mt-6 rounded-[24px] border border-line bg-paper p-6 md:p-7">
                      <div className="flex items-center gap-2">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-soft text-amber">
                          <Sparkles size={17} />
                        </div>

                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wider text-mute">
                            AI coaching
                          </div>

                          <h3 className="mt-0.5 text-lg font-semibold">
                            How to improve
                          </h3>
                        </div>
                      </div>

                      {result.errors.length ? (
                        <ul className="mt-6 space-y-3">
                          {result.errors.map(
                            (e, i) => (
                              <Reveal
                                as="li"
                                key={
                                  e.joint
                                }
                                className="list-none"
                              >
                                <ErrorIndicator
                                  error={e}
                                  correction={
                                    result
                                      .corrections[
                                      i
                                    ]
                                  }
                                  active={
                                    active
                                  }
                                  onActive={
                                    setActive
                                  }
                                />
                              </Reveal>
                            )
                          )}
                        </ul>
                      ) : (
                        <div className="mt-5 flex items-start gap-3 rounded-xl bg-moss-soft px-4 py-4 text-sm leading-5 text-moss-dark">
                          <Check
                            size={17}
                            className="mt-0.5 shrink-0"
                          />

                          <div>
                            <div className="font-semibold">
                              Excellent alignment
                            </div>

                            <div className="mt-0.5">
                              No alignment problems were found
                              against the {result.pose} rules.
                            </div>
                          </div>
                        </div>
                      )}
                    </section>
                  )}

                  {/* REFERENCE COMPARISON */}
                  {!result.recognition_only && (
                    <section className="mt-6 rounded-[24px] border border-line bg-paper p-6 md:p-7">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wider text-mute">
                            Reference comparison
                          </div>

                          <h3 className="mt-1 text-lg font-semibold">
                            How close is your pose?
                          </h3>
                        </div>

                        <ArrowRight
                          size={18}
                          className="text-mute"
                        />
                      </div>

                      <div className="mt-6">
                        {(() => {
                          const ref =
                            POSES.find(
                              p =>
                                p.name ===
                                result.pose
                            )?.ref

                          return ref ? (
                            <PoseComparison
                              user={lms}
                              aspect={aspect}
                              refPts={ref}
                            />
                          ) : (
                            <p className="text-sm text-mute">
                              No reference skeleton exists yet
                              for {result.pose}.
                            </p>
                          )
                        })()}
                      </div>
                    </section>
                  )}
                </section>
              </Reveal>
            )}
          </>
        )}
      </div>
    </main>
  )
}

function ActivityIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </svg>
  )
}