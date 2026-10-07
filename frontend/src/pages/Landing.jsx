import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Lock,
  ScanLine,
  Sparkles,
  Target,
  Activity,
  ShieldCheck
} from 'lucide-react'

import { POSES } from '../lib/analysis.js'
import { BONES } from '../components/PoseSkeleton.jsx'
import Pipeline from '../components/Pipeline.jsx'

const IDX = [
  0, 11, 12, 13, 14, 15, 16,
  23, 24, 25, 26, 27, 28
]

const W2 =
  POSES.find(
    p => p.id === 'warrior-ii'
  ).ref

const P = {}

IDX.forEach(
  (i, k) => {
    P[i] = W2[k]
  }
)

const CALL = {
  25: [
    'Left knee',
    '92°',
    'Target 85–110°',
    'ok'
  ],
  26: [
    'Right knee',
    '172°',
    'Target 165–180°',
    'ok'
  ],
  13: [
    'Left elbow',
    '158°',
    'Target 165–180°',
    'warn'
  ]
}

export default function Landing() {
  const [on, setOn] =
    useState(13)

  return (
    <div className="min-h-screen bg-bone text-ink">

      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-line/70 bg-bone/90 backdrop-blur-xl">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">

          <Link
            to="/welcome"
            className="flex items-center gap-2"
          >

            <div className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-bone">
              <Activity size={18} />
            </div>

            <div>
              <div className="text-sm font-bold tracking-tight">
                YOGAVISION
              </div>

              <div className="hidden text-[10px] text-mute sm:block">
                Intelligent Yoga Analysis
              </div>
            </div>

          </Link>

          <nav className="hidden items-center gap-7 text-sm text-mute md:flex">

            <a
              href="#how"
              className="transition hover:text-ink"
            >
              How it works
            </a>

            <a
              href="#poses"
              className="transition hover:text-ink"
            >
              Poses
            </a>

            <a
              href="#privacy"
              className="transition hover:text-ink"
            >
              Privacy
            </a>

          </nav>

          <div className="flex items-center gap-2">

            <Link
              to="/login"
              className="hidden rounded-xl px-4 py-2 text-sm font-medium text-mute transition hover:bg-paper hover:text-ink sm:block"
            >
              Log in
            </Link>

            <Link
              to="/live"
              className="inline-flex items-center gap-2 rounded-xl bg-moss px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-moss-dark hover:shadow-lg"
            >
              Start
              <ArrowRight size={15} />
            </Link>

          </div>

        </div>

      </header>


      {/* =====================================================
          HERO
      ====================================================== */}

      <main>

        <section className="relative overflow-hidden">

          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-14 md:grid-cols-2 md:px-8 md:pb-28 md:pt-20">

            {/* Left */}

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-moss/20 bg-moss-soft px-3 py-1.5 text-xs font-medium text-moss-dark">

                <span className="h-1.5 w-1.5 rounded-full bg-moss live-dot" />

                Computer vision for yoga

              </div>

              <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-7xl">

                Move better.
                <br />

                <span className="text-moss-dark">
                  Know why.
                </span>

              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-mute md:text-lg">

                YogaVision uses computer vision to
                understand your posture, measure
                joint alignment and give you
                real-time feedback while you practice.

              </p>

              <div className="mt-8 flex flex-wrap gap-3">

                <Link
                  to="/live"
                  className="press inline-flex items-center gap-2 rounded-xl bg-moss px-6 py-3.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-moss-dark hover:shadow-xl"
                >
                  <Camera size={17} />
                  Start Live Analysis
                  <ArrowRight size={15} />
                </Link>

                <Link
                  to="/library"
                  className="press inline-flex items-center gap-2 rounded-xl border border-ink/20 bg-paper px-6 py-3.5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-ink hover:bg-white"
                >
                  Explore poses
                </Link>

              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-mute">

                <span className="flex items-center gap-1.5">
                  <CheckCircle2
                    size={14}
                    className="text-moss"
                  />
                  Real-time feedback
                </span>

                <span className="flex items-center gap-1.5">
                  <CheckCircle2
                    size={14}
                    className="text-moss"
                  />
                  Browser-based detection
                </span>

                <span className="flex items-center gap-1.5">
                  <CheckCircle2
                    size={14}
                    className="text-moss"
                  />
                  No video storage
                </span>

              </div>

            </div>


            {/* Right — AI visualization */}

            <div className="relative">

              <div className="absolute -inset-8 rounded-[3rem] bg-moss/10 blur-3xl" />

              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#101412] shadow-2xl">

                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-white">

                  <div className="flex items-center gap-2">

                    <ScanLine
                      size={16}
                      className="text-[#A8C3A0]"
                    />

                    <span className="text-xs font-medium">
                      LIVE POSE ANALYSIS
                    </span>

                  </div>

                  <span className="flex items-center gap-1.5 text-[11px] text-white/50">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7EE787]" />
                    AI ready
                  </span>

                </div>


                <div className="relative aspect-square">

                  <svg
                    viewBox="0 0 100 100"
                    className="absolute inset-0 h-full w-full"
                    role="img"
                    aria-label="Warrior II pose skeleton with joint measurements"
                  >

                    {BONES.map(
                      ([a, b]) => (
                        <line
                          key={`${a}-${b}`}
                          x1={
                            P[a]
                              ? P[a][0] *
                                100
                              : 0
                          }
                          y1={
                            P[a]
                              ? P[a][1] *
                                100
                              : 0
                          }
                          x2={
                            P[b]
                              ? P[b][0] *
                                100
                              : 0
                          }
                          y2={
                            P[b]
                              ? P[b][1] *
                                100
                              : 0
                          }
                          stroke="#F5F5F1"
                          strokeOpacity=".7"
                          strokeWidth="1"
                          strokeLinecap="round"
                        />
                      )
                    )}

                    {IDX.map(
                      i =>
                        CALL[i] ? (
                          <g
                            key={i}
                            tabIndex={0}
                            onMouseEnter={() =>
                              setOn(i)
                            }
                            onFocus={() =>
                              setOn(i)
                            }
                            style={{
                              cursor:
                                'pointer'
                            }}
                          >

                            <circle
                              cx={
                                P[i][0] *
                                100
                              }
                              cy={
                                P[i][1] *
                                100
                              }
                              r={
                                on === i
                                  ? 4
                                  : 3
                              }
                              fill={
                                CALL[i][3] ===
                                'warn'
                                  ? '#E6C56A'
                                  : '#7EE787'
                              }
                              fillOpacity=".22"
                            />

                            <circle
                              cx={
                                P[i][0] *
                                100
                              }
                              cy={
                                P[i][1] *
                                100
                              }
                              r="1.5"
                              fill={
                                CALL[i][3] ===
                                'warn'
                                  ? '#E6C56A'
                                  : '#7EE787'
                              }
                            />

                          </g>
                        ) : (
                          <circle
                            key={i}
                            cx={
                              P[i]
                                ? P[i][0] *
                                  100
                                : 0
                            }
                            cy={
                              P[i]
                                ? P[i][1] *
                                  100
                                : 0
                            }
                            r="1"
                            fill="#F5F5F1"
                            fillOpacity=".5"
                          />
                        )
                    )}

                  </svg>


                  {/* AI label */}

                  <div className="absolute left-5 top-5 rounded-xl border border-white/10 bg-black/30 px-3 py-2 backdrop-blur-md">

                    <div className="text-[10px] uppercase tracking-wider text-white/40">
                      Detected pose
                    </div>

                    <div className="mt-0.5 text-sm font-semibold text-white">
                      Warrior II
                    </div>

                    <div className="mt-0.5 text-xs text-[#A8C3A0]">
                      Confidence 94%
                    </div>

                  </div>


                  {/* Measurement card */}

                  <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-[#18201C]/95 p-4 text-white shadow-xl backdrop-blur-md">

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <div className="text-[10px] uppercase tracking-wider text-white/40">
                          Live measurement
                        </div>

                        <div className="mt-1 text-base font-semibold">
                          {CALL[on][0]}
                        </div>

                        <div className="mt-0.5 text-xs text-white/50">
                          {CALL[on][2]}
                        </div>

                      </div>

                      <div
                        className={`text-2xl font-semibold ${
                          CALL[on][3] ===
                          'warn'
                            ? 'text-[#E6C56A]'
                            : 'text-[#7EE787]'
                        }`}
                      >
                        {CALL[on][1]}
                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            TRUST STRIP
        ====================================================== */}

        <section className="border-y border-line bg-paper">

          <div className="mx-auto grid max-w-7xl divide-y divide-line px-5 md:grid-cols-3 md:divide-x md:divide-y-0 md:px-8">

            <div className="flex items-center gap-4 px-0 py-6 md:px-8">

              <ScanLine
                size={20}
                className="text-moss-dark"
              />

              <div>
                <div className="text-sm font-semibold">
                  33 body landmarks
                </div>
                <div className="text-xs text-mute">
                  Real-time pose detection
                </div>
              </div>

            </div>

            <div className="flex items-center gap-4 py-6 md:px-8">

              <Target
                size={20}
                className="text-moss-dark"
              />

              <div>
                <div className="text-sm font-semibold">
                  Joint-level feedback
                </div>
                <div className="text-xs text-mute">
                  Specific alignment corrections
                </div>
              </div>

            </div>

            <div className="flex items-center gap-4 py-6 md:px-8">

              <ShieldCheck
                size={20}
                className="text-moss-dark"
              />

              <div>
                <div className="text-sm font-semibold">
                  Privacy-first
                </div>
                <div className="text-xs text-mute">
                  Video stays in your browser
                </div>
              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            HOW IT WORKS
        ====================================================== */}

        <section
          id="how"
          className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28"
        >

          <div className="max-w-2xl">

            <div className="flex items-center gap-2 text-sm font-medium text-moss-dark">
              <Sparkles size={15} />
              How it works
            </div>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              From camera to correction.
            </h2>

            <p className="mt-4 text-sm leading-6 text-mute md:text-base">
              YogaVision turns your camera feed into
              useful information about your movement,
              without making you guess what went wrong.
            </p>

          </div>


          <div className="mt-12 grid gap-5 md:grid-cols-3">

            {[
              {
                number: '01',
                icon: ScanLine,
                title: 'Detect your pose',
                text: 'MediaPipe identifies body landmarks from your camera, photo or recorded video.'
              },
              {
                number: '02',
                icon: Target,
                title: 'Measure alignment',
                text: 'Joint angles are compared with the target ranges defined for each supported pose.'
              },
              {
                number: '03',
                icon: Activity,
                title: 'Improve in real time',
                text: 'Form issues become clear corrections so you can adjust while you are practicing.'
              }
            ].map(
              item => {

                const Icon =
                  item.icon

                return (
                  <div
                    key={item.number}
                    className="group rounded-2xl border border-line bg-paper p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                  >

                    <div className="flex items-center justify-between">

                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-moss-soft text-moss-dark">
                        <Icon size={19} />
                      </div>

                      <span className="text-xs font-medium text-mute">
                        {item.number}
                      </span>

                    </div>

                    <h3 className="mt-6 text-lg font-semibold">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-mute">
                      {item.text}
                    </p>

                  </div>
                )
              }
            )}

          </div>

        </section>


        {/* =====================================================
            POSES
        ====================================================== */}

        <section
          id="poses"
          className="border-y border-line bg-paper"
        >

          <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">

            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

              <div>

                <div className="text-sm font-medium text-moss-dark">
                  Pose library
                </div>

                <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                  Practice with purpose.
                </h2>

              </div>

              <Link
                to="/library"
                className="inline-flex items-center gap-2 text-sm font-semibold text-moss-dark hover:underline"
              >
                View full library
                <ArrowRight size={15} />
              </Link>

            </div>


            <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-4">

              {POSES.map(
                pose => (
                  <Link
                    key={pose.id}
                    to={`/library/${pose.id}`}
                    className="group rounded-xl border border-line bg-bone p-4 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div>

                        <div className="text-sm font-semibold">
                          {pose.name}
                        </div>

                        <div className="mt-1 text-xs text-mute">
                          {pose.difficulty}
                        </div>

                      </div>

                      <ArrowRight
                        size={15}
                        className="text-mute transition-transform group-hover:translate-x-1 group-hover:text-moss-dark"
                      />

                    </div>

                  </Link>
                )
              )}

            </div>

          </div>

        </section>


        {/* =====================================================
            PRIVACY
        ====================================================== */}

        <section
          id="privacy"
          className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24"
        >

          <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:items-center">

            <div>

              <div className="flex items-center gap-2 text-sm font-medium text-moss-dark">
                <Lock size={15} />
                Privacy by design
              </div>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                Your practice stays yours.
              </h2>

            </div>

            <div className="rounded-2xl border border-line bg-paper p-6">

              <p className="text-sm leading-7 text-mute">
                Pose detection runs in your browser,
                so camera frames and uploaded images
                are not sent to a server. Nothing is
                stored unless you choose to save a
                session. Saved sessions contain scores
                and joint statistics, not video.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">

                {[
                  'Browser-based detection',
                  'No video storage',
                  'Session control'
                ].map(
                  text => (
                    <span
                      key={text}
                      className="inline-flex items-center gap-1.5 rounded-full bg-moss-soft px-3 py-1.5 text-xs font-medium text-moss-dark"
                    >
                      <CheckCircle2
                        size={12}
                      />
                      {text}
                    </span>
                  )
                )}

              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            CTA
        ====================================================== */}

        <section className="border-t border-line bg-[#101412] text-white">

          <div className="mx-auto max-w-4xl px-5 py-20 text-center md:px-8 md:py-28">

            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#A8C3A0]">
              <Sparkles size={20} />
            </div>

            <h2 className="mt-6 text-3xl font-semibold tracking-tight md:text-5xl">
              Ready to check your form?
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/50 md:text-base">
              Step into frame and let YogaVision
              turn your practice into useful feedback.
            </p>

            <Link
              to="/live"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#A8C3A0] px-6 py-3.5 text-sm font-semibold text-[#101412] transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-xl"
            >
              Start Live Analysis
              <ArrowRight size={16} />
            </Link>

          </div>

        </section>

      </main>

    </div>
  )
}