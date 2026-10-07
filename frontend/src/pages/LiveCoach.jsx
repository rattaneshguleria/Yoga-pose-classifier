import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Play,
  Square,
  FlipHorizontal,
  Camera,
  Check,
  AlertTriangle,
  ShieldCheck,
  Pause
} from 'lucide-react'

import PoseSkeleton, { BONES } from '../components/PoseSkeleton.jsx'
import CalibrationPanel, { calibrationChecks } from '../components/CalibrationPanel.jsx'
import { startDetection } from '../lib/poseEngine.js'
import { classify, evaluate, RULES, poseLabel } from '../lib/analysis.js'
import { useSearchParams } from 'react-router-dom'
import { api, classifyRemote } from '../lib/api.js'
import { getSettings } from '../lib/settings.js'
import Toast from '../components/Toast.jsx'

const TONE = {
  ok: 'text-moss-dark bg-moss-soft',
  warning: 'text-amber bg-amber-soft',
  incorrect: 'text-clay bg-clay-soft'
}

const label = j =>
  j.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())

const fmt = s =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(
    Math.floor(s % 60)
  ).padStart(2, '0')}`

const HOLD_MIN_SCORE = 0.8
const HOLD_COUNTS_AT = 3

export default function LiveCoach() {
  const video = useRef(null)
  const stream = useRef(null)
  const stopDetect = useRef(null)
  const probe = useRef(null)

  const [phase, setPhase] = useState('off')
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  // Automatic calibration/session start
  const autoStarted = useRef(false)

  // Pose lost tracking
  const missingSince = useRef(0)
  const [poseLost, setPoseLost] = useState(false)

  const [params] = useSearchParams()

  const [toast, setToast] = useState('')
  const [summary, setSummary] = useState(null)

  const [mirror, setMirror] = useState(
    () => getSettings().mirror
  )

  const [target, setTarget] = useState(
    RULES[params.get('pose')]
      ? params.get('pose')
      : 'auto'
  )

  const targetRef = useRef(target)
  targetRef.current = target

  const stats = useRef({
    poses: {},
    joints: {},
    scores: [],
    total: 0
  })

  const [aspect, setAspect] = useState(4 / 3)
  const aspectRef = useRef(4 / 3)

  const [brightness, setBrightness] = useState(128)

  const [frame, setFrame] = useState(null)
  const [lms, setLms] = useState(null)

  const [timer, setTimer] = useState({
    session: 0,
    hold: 0,
    count: 0
  })

  const tick = useRef({
    t: 0,
    hold: 0,
    counted: false,
    count: 0,
    session: 0
  })

  const lastUi = useRef(0)
  const remote = useRef(null)
  const lastRemote = useRef(0)

  const onFrame = useCallback(l => {
    const now = performance.now()
    const p = phaseRef.current

    const dt = tick.current.t
      ? (now - tick.current.t) / 1000
      : 0

    tick.current.t = now

    // ~15 FPS UI updates
    if (now - lastUi.current < 66) return
    lastUi.current = now

    setLms(l)

    // Detect when user leaves the camera frame
    if (p === 'active' && !l) {
      if (!missingSince.current) {
        missingSince.current = now
      }

      if (now - missingSince.current > 800) {
        setPoseLost(true)
      }
    } else if (l) {
      missingSince.current = 0
      setPoseLost(false)
    }

    if (
      !l ||
      (p !== 'active' && p !== 'calibrating')
    ) {
      setFrame(f =>
        f && { ...f, lms: l }
      )
      return
    }

    // Remote classifier every ~500ms
    if (now - lastRemote.current > 500) {
      lastRemote.current = now

      classifyRemote(
        l,
        aspectRef.current
      ).then(r => {
        remote.current = r
      })
    }

    const cls =
      remote.current ||
      classify(
        l,
        aspectRef.current
      )

    const coachPose =
      targetRef.current === 'auto'
        ? (
            cls.coachPose ||
            (
              RULES[cls.pose]
                ? cls.pose
                : null
            )
          )
        : targetRef.current

    const pose =
      coachPose || cls.pose

    const ev = evaluate(
      pose,
      l,
      aspectRef.current
    )

    setFrame({
      lms: l,
      pose,
      detectedPose: cls.pose,
      coachPose,
      confidence: cls.confidence,
      source: cls.source,
      ...ev
    })

    if (p === 'active') {
      const st = stats.current

      const pn =
        (st.poses[pose] ||= {
          sec: 0,
          score: 0,
          conf: 0
        })

      pn.sec += dt
      pn.conf +=
        cls.confidence * dt

      st.total += dt

      const t = tick.current
      t.session += dt

      if (ev.form_score == null) {
        t.hold = 0
        t.counted = false
      } else {
        pn.score +=
          ev.form_score * dt

        pn.scoredSec =
          (pn.scoredSec || 0) + dt

        st.scores.push(
          ev.form_score
        )

        for (
          const j of Object.keys(
            ev.joint_angles
          )
        ) {
          const jj =
            (st.joints[j] ||= {
              t: 0,
              bad: 0
            })

          jj.t += dt

          if (
            ev.errors.some(
              e => e.joint === j
            )
          ) {
            jj.bad += dt
          }
        }

        if (
          ev.form_score >=
          HOLD_MIN_SCORE
        ) {
          t.hold += dt

          if (
            t.hold >=
              HOLD_COUNTS_AT &&
            !t.counted
          ) {
            t.counted = true
            t.count++
          }
        } else {
          t.hold = 0
          t.counted = false
        }
      }

      setTimer({
        session: t.session,
        hold: t.hold,
        count: t.count
      })
    }
  }, [])

  async function start() {
    autoStarted.current = false
    missingSince.current = 0
    setPoseLost(false)

    setPhase('starting')

    try {
      stream.current =
        await navigator.mediaDevices.getUserMedia({
          video: {
            ...(getSettings().cameraId
              ? {
                  deviceId: {
                    exact:
                      getSettings()
                        .cameraId
                  }
                }
              : {
                  facingMode: 'user'
                }),
            width: 1280,
            height: 720
          },
          audio: false
        })
    } catch {
      return setPhase('denied')
    }

    video.current.srcObject =
      stream.current

    await video.current
      .play()
      .catch(() => {})

    aspectRef.current =
      video.current.videoWidth /
        video.current.videoHeight ||
      4 / 3

    setAspect(
      aspectRef.current
    )

    try {
      stopDetect.current =
        await startDetection(
          video.current,
          onFrame
        )

      setPhase('calibrating')
    } catch {
      stop()
      setPhase('modelError')
    }
  }

  function stop() {
    stopDetect.current?.()

    stream.current
      ?.getTracks()
      .forEach(t => t.stop())

    autoStarted.current = false
    missingSince.current = 0
    setPoseLost(false)

    setFrame(null)
    setLms(null)

    setPhase(p =>
      p === 'denied' ||
      p === 'modelError'
        ? p
        : 'off'
    )
  }

  /*
   * AUTOMATIC CALIBRATION
   *
   * Once all calibration checks pass,
   * automatically begin the session.
   */
  const calibrationReady =
    calibrationChecks({
      cameraOn: true,
      lms,
      brightness
    }).every(
      check => check[1]
    )

  useEffect(() => {
    if (phase !== 'calibrating') {
      autoStarted.current = false
      return
    }

    if (
      !calibrationReady ||
      autoStarted.current
    ) {
      return
    }

    const timer = setTimeout(() => {
      if (autoStarted.current) return

      autoStarted.current = true
      begin()
    }, 900)

    return () =>
      clearTimeout(timer)
  }, [phase, calibrationReady])

  /*
   * Cleanup when leaving the page.
   */
  useEffect(() => {
    return () => {
      stopDetect.current?.()

      stream.current
        ?.getTracks()
        .forEach(t => t.stop())
    }
  }, [])

  /*
   * Lighting probe:
   * mean luma of a 32x24 downsample
   */
  useEffect(() => {
    if (phase === 'off') return

    const c = probe.current

    const ctx =
      c.getContext(
        '2d',
        {
          willReadFrequently: true
        }
      )

    const id = setInterval(() => {
      if (
        !video.current ||
        video.current.readyState < 2
      ) {
        return
      }

      ctx.drawImage(
        video.current,
        0,
        0,
        32,
        24
      )

      const d =
        ctx.getImageData(
          0,
          0,
          32,
          24
        ).data

      let s = 0

      for (
        let i = 0;
        i < d.length;
        i += 4
      ) {
        s +=
          0.299 * d[i] +
          0.587 * d[i + 1] +
          0.114 * d[i + 2]
      }

      setBrightness(
        s / (d.length / 4)
      )
    }, 500)

    return () =>
      clearInterval(id)
  }, [phase])

  function finish() {
    const st = stats.current

    if (st.total >= 5) {
      const poses =
        Object.entries(
          st.poses
        )
          .filter(
            ([, v]) =>
              v.sec >= 2
          )
          .map(
            ([name, v]) => ({
              name,
              seconds:
                Math.round(
                  v.sec
                ),
              accuracy:
                v.scoredSec
                  ? +(
                      v.score /
                      v.scoredSec
                    ).toFixed(2)
                  : null,
              confidence:
                +(
                  v.conf /
                  v.sec
                ).toFixed(2)
            })
          )

      const mean =
        st.scores.length
          ? st.scores.reduce(
              (a, b) => a + b,
              0
            ) /
            st.scores.length
          : null

      const sd =
        mean == null
          ? 0
          : Math.sqrt(
              st.scores.reduce(
                (a, b) =>
                  a +
                  (b - mean) ** 2,
                0
              ) /
                st.scores.length
            )

      setSummary({
        duration:
          Math.round(
            st.total
          ),

        avg_accuracy:
          mean == null
            ? null
            : +mean.toFixed(2),

        recognition_only:
          mean == null,

        poses,

        joints:
          Object.fromEntries(
            Object.entries(
              st.joints
            ).map(
              ([j, v]) => [
                j,
                +(
                  1 -
                  v.bad / v.t
                ).toFixed(2)
              ]
            )
          ),

        metrics: {
          alignment:
            mean == null
              ? null
              : +mean.toFixed(2),

          stability:
            mean == null
              ? null
              : +Math.max(
                  0,
                  1 - sd
                ).toFixed(2),

          confidence:
            +(
              poses.reduce(
                (a, p) =>
                  a +
                  p.confidence,
                0
              ) /
              (
                poses.length ||
                1
              )
            ).toFixed(2)
        }
      })
    }

    stop()
  }

  async function save() {
    try {
      await api.save(
        summary
      )

      setSummary(null)
      setToast(
        'Session saved'
      )
    } catch {
      setToast(
        'Could not save: is the backend running?'
      )
    }
  }

  function begin() {
    autoStarted.current = true
    missingSince.current = 0
    setPoseLost(false)

    stats.current = {
      poses: {},
      joints: {},
      scores: [],
      total: 0
    }

    setSummary(null)

    tick.current = {
      t: 0,
      hold: 0,
      counted: false,
      count: 0,
      session: 0
    }

    setTimer({
      session: 0,
      hold: 0,
      count: 0
    })

    setPhase('active')
  }

  function capture() {
    const v = video.current

    const c =
      document.createElement(
        'canvas'
      )

    c.width =
      v.videoWidth

    c.height =
      v.videoHeight

    const ctx =
      c.getContext('2d')

    ctx.drawImage(
      v,
      0,
      0
    )

    if (lms) {
      ctx.strokeStyle =
        '#F5F5F1'

      ctx.lineWidth = 3

      BONES.forEach(
        ([a, b]) => {
          ctx.beginPath()

          ctx.moveTo(
            lms[a].x *
              c.width,
            lms[a].y *
              c.height
          )

          ctx.lineTo(
            lms[b].x *
              c.width,
            lms[b].y *
              c.height
          )

          ctx.stroke()
        }
      )
    }

    const a =
      document.createElement(
        'a'
      )

    a.href =
      c.toDataURL(
        'image/png'
      )

    a.download =
      `yogavision-${Date.now()}.png`

    a.click()
  }

  const live =
    phase === 'calibrating' ||
    phase === 'active' ||
    phase === 'paused'

  const flagged =
    Object.fromEntries(
      (frame?.errors || []).map(
        e => [
          e.landmark,
          e.severity
        ]
      )
    )

  const skel =
    lms &&
    lms.map(p => [
      p.x,
      p.y
    ])

  const flip = {
    transform: mirror
      ? 'scaleX(-1)'
      : 'none'
  }

  const msg = {
    off:
      'Stand 2–3 metres back so your whole body is in frame.',

    starting:
      'Waiting for camera permission…',

    denied:
      "Camera access was blocked. Allow the camera in your browser's site settings, then try again.",

    modelError:
      'The pose model could not load. Check your internet connection and try again.'
  }[phase]

  return (
    <div className="grid lg:grid-cols-[1fr_360px] min-h-screen">

      <section className="p-4 md:p-6 flex flex-col gap-4">

        {/* Video Viewport with HUD Overlays */}
        <div
          className="relative bg-ink overflow-hidden rounded-2xl shadow-lg border border-line"
          style={{
            aspectRatio: aspect
          }}
        >

          <video
            ref={video}
            playsInline
            muted
            className="h-full w-full object-cover"
            style={flip}
          />

          <canvas
            ref={probe}
            width="32"
            height="24"
            className="hidden"
          />

          {live && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={flip}
            >
              <PoseSkeleton
                landmarks={skel}
                flagged={flagged}
              />
            </div>
          )}

          {/* =====================================================
              PRE-SESSION / CAMERA SETUP SCREEN
          ===================================================== */}
          {!live && phase === 'off' && (
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-[#18201C] to-[#101412] p-5 text-white text-center">
              <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-moss-soft text-moss-dark">
                  <Camera size={22} />
                </div>

                <h2 className="mt-4 text-xl font-bold tracking-tight text-white">
                  Camera Setup & Calibration
                </h2>

                <p className="mt-2 text-xs leading-5 text-white/60">
                  Follow these quick tips before starting your practice session.
                </p>

                <div className="mt-5 space-y-2.5 text-left text-xs text-white/80">
                  <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-moss text-[10px] font-bold text-white">1</span>
                    <span>Position camera at waist-to-chest height</span>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-moss text-[10px] font-bold text-white">2</span>
                    <span>Stand 2–3 metres back so head and feet fit in frame</span>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-moss text-[10px] font-bold text-white">3</span>
                    <span>Ensure front lighting (avoid direct bright backlight)</span>
                  </div>
                </div>

                <button
                  onClick={start}
                  className="press mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-moss px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-moss-dark hover:-translate-y-0.5"
                >
                  <Play size={16} fill="currentColor" />
                  Start Camera
                </button>
              </div>
            </div>
          )}

          {/* =====================================================
              STARTING / PERMISSION PROMPT
          ===================================================== */}
          {!live && phase === 'starting' && (
            <div className="absolute inset-0 grid place-items-center bg-[#101412] p-6 text-white text-center">
              <div className="max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-moss-soft text-moss-dark">
                  <Camera size={22} className="live-dot" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">
                  Waiting for camera permission…
                </h3>
                <p className="mt-2 text-xs leading-5 text-white/60">
                  Please grant camera access in your browser prompt to begin pose detection.
                </p>
              </div>
            </div>
          )}

          {/* =====================================================
              PERMISSION DENIED / MODEL ERROR
          ===================================================== */}
          {!live && (phase === 'denied' || phase === 'modelError') && (
            <div
              className="absolute inset-0 grid place-items-center bg-[#101412] p-6 text-white text-center"
              role="alert"
            >
              <div className="max-w-sm rounded-2xl border border-clay/30 bg-[#18201C] p-6 shadow-2xl">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-clay-soft text-clay">
                  <AlertTriangle size={22} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">
                  {phase === 'denied' ? 'Camera Access Blocked' : 'Model Loading Error'}
                </h3>
                <p className="mt-2 text-xs leading-5 text-white/60">
                  {msg}
                </p>
                <button
                  onClick={start}
                  className="press mt-5 inline-flex items-center gap-2 rounded-xl bg-moss px-4 py-2.5 text-xs font-semibold text-white hover:bg-moss-dark"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* =====================================================
              CALIBRATING HUD OVERLAY
          ===================================================== */}
          {phase === 'calibrating' && (
            <div className="absolute inset-x-3 top-3 z-20 mx-auto max-w-lg pop-in">
              <div className="rounded-2xl border border-white/15 bg-[#18201C]/90 p-3.5 text-white shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-moss-soft">
                    <span className="h-2 w-2 rounded-full bg-moss live-dot" />
                    Camera Calibration
                  </div>
                  <span className="text-xs text-white/70 font-medium">
                    {calibrationReady ? 'Ready!' : 'Calibrating…'}
                  </span>
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-4">
                  {calibrationChecks({ cameraOn: true, lms, brightness }).map(([name, ok]) => (
                    <div
                      key={name}
                      className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                        ok ? 'bg-moss-soft text-moss-dark' : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {ok ? (
                        <Check size={12} strokeWidth={2.5} />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                      )}
                      <span className="truncate">{name}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-2.5 text-center text-xs">
                  {calibrationReady ? (
                    <span className="font-semibold text-moss-soft">
                      All checks passed! Starting session…
                    </span>
                  ) : (
                    <span className="text-white/70">
                      {calibrationChecks({ cameraOn: true, lms, brightness }).find(c => !c[1])?.[2] || 'Adjust your position…'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =====================================================
              ACTIVE HUD: TOP-LEFT CURRENT POSE BADGE
          ===================================================== */}
          {phase === 'active' && frame && (
            <div className="absolute left-3 top-3 z-20 pop-in">
              <div className="rounded-xl border border-white/15 bg-[#18201C]/85 px-3 py-2 text-white shadow-lg backdrop-blur-md">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="h-2 w-2 rounded-full bg-moss live-dot" />
                  <span className="text-sm font-bold tracking-tight">
                    {poseLabel(frame.pose)}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-white/60">
                  {frame.source === 'model' ? 'Confidence' : 'Rule match'}{' '}
                  <span className="font-semibold text-white/90">
                    {Math.round(frame.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================
              ACTIVE HUD: TOP-RIGHT FORM SCORE & HOLD COUNTDOWN
          ===================================================== */}
          {phase === 'active' && frame && frame.form_score != null && (
            <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2 pop-in">
              {/* Live Form Score Badge */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#18201C]/90 p-2 pl-3 text-white shadow-xl backdrop-blur-md">
                <div className="text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                    Form Score
                  </div>
                  <div
                    className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                      frame.form_score >= 0.85
                        ? 'text-moss-soft'
                        : frame.form_score >= 0.6
                        ? 'text-amber'
                        : 'text-clay'
                    }`}
                  >
                    {Math.round(frame.form_score * 100)}
                    <span className="text-sm font-normal text-white/40">%</span>
                  </div>
                </div>

                <div
                  className={`grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-xl text-xs font-bold ${
                    frame.form_score >= 0.85
                      ? 'bg-moss-soft text-moss-dark'
                      : frame.form_score >= 0.6
                      ? 'bg-amber-soft text-amber'
                      : 'bg-clay-soft text-clay'
                  }`}
                >
                  {frame.form_score >= 0.85 ? 'GOOD' : frame.form_score >= 0.6 ? 'ADJ' : 'ERR'}
                </div>
              </div>

              {/* Hold Duration & Rep Countdown */}
              <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#18201C]/85 px-3 py-1.5 text-xs text-white shadow-md backdrop-blur-md">
                <span className="text-white/60">Hold:</span>
                <span className={`font-mono font-bold ${timer.hold >= HOLD_COUNTS_AT ? 'text-moss-soft' : 'text-white'}`}>
                  {timer.hold.toFixed(1)}s / {HOLD_COUNTS_AT}.0s
                </span>
                {timer.count > 0 && (
                  <span className="ml-1 rounded-md bg-moss-soft px-1.5 py-0.5 text-[10px] font-semibold text-moss-dark">
                    ✓ {timer.count}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* =====================================================
              ACTIVE HUD: BOTTOM-CENTER REAL-TIME CORRECTION BANNER
          ===================================================== */}
          {phase === 'active' && frame && (
            <div className="absolute inset-x-3 bottom-3 z-20 mx-auto max-w-lg pop-in">
              {frame.corrections && frame.corrections.length > 0 ? (
                <div className="flex items-center gap-3 rounded-2xl border border-amber/40 bg-[#18201C]/92 p-3 text-white shadow-2xl backdrop-blur-md">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-soft text-amber">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-amber">
                      Correction Needed
                    </div>
                    <div className="text-xs sm:text-sm font-medium leading-snug text-white">
                      {frame.corrections[0]}
                    </div>
                  </div>
                </div>
              ) : frame.form_score != null ? (
                <div className="flex items-center gap-3 rounded-2xl border border-moss/30 bg-[#18201C]/90 p-3 text-white shadow-xl backdrop-blur-md">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-moss-soft text-moss-dark">
                    <Check size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-moss-soft">
                      Alignment Accurate
                    </div>
                    <div className="text-xs sm:text-sm font-medium leading-snug text-white">
                      Form looks good! Hold steady.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* =====================================================
              POSE LOST OVERLAY (CAMERA FEED STAYS VISIBLE UNDERNEATH)
          ===================================================== */}
          {phase === 'active' && poseLost && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-[#101412]/50 backdrop-blur-[2px]">
              <div className="mx-4 max-w-sm rounded-2xl border border-white/20 bg-[#18201C]/95 p-6 text-center text-white shadow-2xl">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-soft text-amber">
                  <Camera size={21} />
                </div>

                <h3 className="mt-4 text-base font-semibold">
                  Pose not detected
                </h3>

                <p className="mt-1.5 text-xs leading-5 text-white/60">
                  Step back into the frame and make sure your whole body is visible.
                </p>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-moss-soft">
                  <span className="h-1.5 w-1.5 rounded-full bg-moss live-dot" />
                  Camera active · Waiting for you
                </div>
              </div>
            </div>
          )}

          {/* =====================================================
              PAUSED OVERLAY
          ===================================================== */}
          {phase === 'paused' && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-ink/70 text-bone backdrop-blur-xs font-semibold">
              <div className="rounded-2xl border border-white/10 bg-[#18201C] p-6 text-center shadow-xl">
                <div className="text-xl font-bold">Session Paused</div>
                <p className="mt-1 text-xs text-white/60">Take a breath, then resume when ready.</p>
                <button
                  onClick={() => setPhase('active')}
                  className="press mt-4 inline-flex items-center gap-2 rounded-xl bg-moss px-5 py-2.5 text-sm font-semibold text-white hover:bg-moss-dark"
                >
                  <Play size={14} fill="currentColor" />
                  Resume Practice
                </button>
              </div>
            </div>
          )}

        </div>

        {/* =====================================================
            SESSION TOOLBAR / CONTROLS
        ===================================================== */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-paper p-3 shadow-xs">

          {!live ? (
            <button
              onClick={start}
              className="press inline-flex items-center gap-2 rounded-xl bg-moss text-white px-4 py-2.5 text-sm font-semibold hover:bg-moss-dark hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              <Play size={14} fill="currentColor" />
              Start camera
            </button>
          ) : (
            <>
              <button
                onClick={() =>
                  setPhase(p =>
                    p === 'paused'
                      ? 'active'
                      : 'paused'
                  )
                }
                disabled={phase === 'calibrating'}
                className="press inline-flex items-center gap-2 rounded-xl border border-line bg-bone px-3.5 py-2 text-xs font-semibold text-ink hover:bg-white disabled:opacity-40 transition-colors"
              >
                <Pause size={13} />
                {phase === 'paused' ? 'Resume' : 'Pause'}
              </button>

              <button
                onClick={finish}
                className="press inline-flex items-center gap-2 rounded-xl border border-line bg-bone px-3.5 py-2 text-xs font-semibold text-clay hover:bg-white hover:border-clay/40 transition-colors"
              >
                <Square size={13} />
                Stop session
              </button>

              <button
                onClick={capture}
                className="press inline-flex items-center gap-2 rounded-xl border border-line bg-bone px-3.5 py-2 text-xs font-semibold text-ink hover:bg-white transition-colors"
              >
                <Camera size={13} />
                Capture frame
              </button>
            </>
          )}

          <button
            onClick={() => setMirror(m => !m)}
            aria-pressed={mirror}
            className={`press inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-xs font-semibold transition-colors ${
              mirror
                ? 'bg-moss-soft text-moss-dark border-moss/30'
                : 'bg-bone text-mute hover:bg-white hover:text-ink'
            }`}
          >
            <FlipHorizontal size={13} />
            Mirror
          </button>

          {/* Target Pose Selector (Identical state & logic) */}
          <label className="ml-auto flex items-center gap-2 text-xs text-mute">
            <span>Target pose</span>
            <select
              value={target}
              onChange={e => setTarget(e.target.value)}
              className="rounded-xl border border-line bg-bone text-ink px-2.5 py-1.5 text-xs font-medium outline-none focus:border-moss"
            >
              <option value="auto">Auto-detect</option>
              {Object.keys(RULES).map(p => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>

        </div>

        <p className="flex items-center gap-2 text-xs text-mute">
          <ShieldCheck size={14} className="shrink-0 text-moss" />
          Pose detection runs in your browser; video frames are not uploaded. Nothing is stored unless you capture a frame or save a session.
        </p>

      </section>

      <aside
        className="border-t lg:border-t-0 lg:border-l border-line bg-paper p-5"
        aria-live="polite"
      >

        {phase === 'calibrating' ? (

          <CalibrationPanel
            checks={calibrationChecks({
              cameraOn: true,
              lms,
              brightness
            })}
            onBegin={begin}
          />

        ) : !frame ||
          !(
            phase === 'active' ||
            phase === 'paused'
          ) ? (

          summary ? (

            summary.recognition_only ? (

              <div>

                <h2 className="font-semibold">
                  Session complete
                </h2>

                <p className="mt-1 text-sm text-mute">
                  {fmt(
                    summary.duration
                  )}{' '}
                  ·{' '}
                  {
                    summary
                      .poses
                      .length
                  }{' '}
                  recognized poses · no form score available
                </p>

                <div className="mt-4">

                  <button
                    onClick={() =>
                      setSummary(
                        null
                      )
                    }
                    className="press border border-line px-4 py-2 text-sm hover:bg-paper"
                  >
                    Close
                  </button>

                </div>

              </div>

            ) : (

              <div>

                <h2 className="font-semibold">
                  Session complete
                </h2>

                <p className="mt-1 text-sm text-mute">
                  {fmt(
                    summary.duration
                  )}{' '}
                  · accuracy{' '}
                  {Math.round(
                    summary.avg_accuracy *
                      100
                  )}
                  % ·{' '}
                  {
                    summary
                      .poses
                      .length
                  }{' '}
                  pose
                  {
                    summary
                      .poses
                      .length ===
                    1
                      ? ''
                      : 's'
                  }
                </p>

                <div className="mt-4 flex gap-2">

                  <button
                    onClick={
                      save
                    }
                    className="press bg-moss text-white px-4 py-2 text-sm font-semibold hover:bg-moss-dark hover:-translate-y-0.5 transition-all"
                  >
                    Save session
                  </button>

                  <button
                    onClick={() =>
                      setSummary(
                        null
                      )
                    }
                    className="press border border-line px-4 py-2 text-sm hover:bg-paper"
                  >
                    Discard
                  </button>

                </div>

              </div>

            )

          ) : (

            <p className="text-sm text-mute">
              Start the camera, then complete calibration to begin.
            </p>

          )

        ) : (

          <>
            {frame.recognition_only ? (

              <div>

                <div className="text-xs text-mute">
                  Detected pose
                </div>

                <div className="mt-1 text-xl font-semibold">
                  {poseLabel(
                    frame.detectedPose
                  )}
                </div>

                <span className="mt-3 inline-block bg-bone px-2 py-1 text-sm font-medium">
                  Recognition only
                </span>

                <div className="mt-3 text-sm text-mute">
                  Confidence{' '}
                  {Math.round(
                    frame.confidence *
                      100
                  )}
                  %
                </div>

              </div>

            ) : (

              <>

                <div className="flex items-end justify-between">

                  <div>

                    <div className="text-xs text-mute">
                      Form score
                    </div>

                    <div
                      className={`text-5xl font-semibold transition-transform ${
                        frame.form_score >=
                        0.85
                          ? 'text-moss-dark'
                          : ''
                      }`}
                    >
                      {Math.round(
                        frame.form_score *
                          100
                      )}

                      <span className="text-2xl text-mute">
                        %
                      </span>
                    </div>

                  </div>

                  <div className="text-right text-sm">

                    <div className="text-mute text-xs">
                      Hold
                    </div>

                    <span className="text-2xl font-semibold">
                      {fmt(
                        timer.hold
                      )}
                    </span>

                  </div>

                </div>

                <div className="mt-3 flex gap-6 text-xs text-mute">

                  <span>
                    Session{' '}
                    {fmt(
                      timer.session
                    )}
                  </span>

                  <span>
                    Holds completed{' '}
                    {timer.count}
                  </span>

                </div>

                <h2 className="mt-6 text-sm font-semibold">
                  Joint angles
                </h2>

                <ul className="mt-2 divide-y divide-line text-sm">

                  {Object.entries(
                    frame.joint_angles
                  ).map(
                    ([j, v]) => {

                      const err =
                        frame.errors.find(
                          e =>
                            e.joint ===
                            j
                        )

                      const s =
                        err
                          ? err.severity
                          : 'ok'

                      return (
                        <li
                          key={j}
                          className="flex items-center justify-between py-2"
                        >

                          <span>
                            {label(j)}
                          </span>

                          <span className="flex items-center gap-2">

                            {v}°

                            {err && (
                              <span className="text-xs text-mute">
                                target{' '}
                                {err.expected.join(
                                  '–'
                                )}
                                °
                              </span>
                            )}

                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${TONE[s]}`}
                            >
                              {s ===
                              'ok' ? (
                                <Check
                                  size={
                                    12
                                  }
                                />
                              ) : (
                                <AlertTriangle
                                  size={
                                    12
                                  }
                                />
                              )}

                              {s ===
                              'ok'
                                ? 'Good'
                                : s ===
                                  'warning'
                                ? 'Adjust'
                                : 'Incorrect'}
                            </span>

                          </span>

                        </li>
                      )
                    }
                  )}

                  {frame.errors
                    .filter(e =>
                      [
                        'spine',
                        'shoulders'
                      ].includes(
                        e.joint
                      )
                    )
                    .map(e => (
                      <li
                        key={
                          e.joint
                        }
                        className="flex items-center justify-between py-2"
                      >

                        <span>
                          {label(
                            e.joint
                          )}
                        </span>

                        <span className="flex items-center gap-2">

                          {e.detected}°

                          <span className="text-xs text-mute">
                            max{' '}
                            {
                              e
                                .expected[1]
                            }
                            °
                          </span>

                          <span
                            className={`px-2 py-0.5 text-xs font-medium ${TONE[e.severity]}`}
                          >
                            Adjust
                          </span>

                        </span>

                      </li>
                    ))}

                </ul>

                <h2 className="mt-6 text-sm font-semibold">
                  Corrections
                </h2>

                {frame.corrections
                  .length ? (

                  <ul className="mt-2 space-y-2 text-sm">

                    {frame.corrections.map(
                      (
                        c,
                        i
                      ) => (
                        <li
                          key={c}
                          className="border-l-2 border-amber pl-3 reveal in"
                          style={{
                            animationDelay: `${i * 60}ms`
                          }}
                        >
                          {c}
                        </li>
                      )
                    )}

                  </ul>

                ) : (

                  <p className="mt-2 text-sm text-moss-dark">
                    Form looks good. Hold steady.
                  </p>

                )}

              </>

            )}

          </>

        )}

      </aside>

      <Toast
        msg={toast}
        onDone={() =>
          setToast('')
        }
      />

    </div>
  )
}