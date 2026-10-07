import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Play,
  ScanLine,
  Activity,
  Clock3,
  Target,
  Sparkles,
  ChevronRight,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'

import AnimatedNumber from '../components/AnimatedNumber.jsx'
import BackendDown from '../components/BackendDown.jsx'
import LoadingState from '../components/LoadingState.jsx'
import Reveal from '../components/Reveal.jsx'
import DashboardYogaArt from '../components/DashboardYogaArt.jsx'
import { api, useApi } from '../lib/api.js'


function pct(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

function formatDuration(seconds) {
  const s = Math.max(0, Number(seconds) || 0)
  const mins = Math.floor(s / 60)
  const secs = Math.round(s % 60)

  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

function formatDate(value) {
  if (!value) return '—'

  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value

  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function scoreLabel(score) {
  if (score >= 90) return 'Excellent form'
  if (score >= 75) return 'Strong form'
  if (score >= 60) return 'Keep improving'
  return 'Needs attention'
}

function ScoreRing({ score }) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0))

  return (
    <div
      className="relative grid h-40 w-40 place-items-center rounded-full"
      style={{
        background: `conic-gradient(#7E9D82 ${safeScore * 3.6}deg, #E4E7E2 0deg)`,
      }}
    >
      <div className="grid h-[126px] w-[126px] place-items-center rounded-full bg-[#18201C] text-center">
        <div>
          <div className="text-4xl font-semibold tracking-tight text-white">
            {safeScore}
            <span className="text-lg text-[#A8C3A0]">%</span>
          </div>
          <div className="mt-1 text-xs text-white/50">form accuracy</div>
        </div>
      </div>
    </div>
  )
}

function MiniTrend({ series = [] }) {
  const values = series
    .map((item) => Number(item.accuracy))
    .filter((value) => Number.isFinite(value))

  if (values.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center rounded-2xl bg-[#F4F5F1] text-sm text-mute">
        Keep practicing to build your trend.
      </div>
    )
  }

  const width = 320
  const height = 90
  const padding = 8

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = values
    .map((value, index) => {
      const x =
        padding +
        (index / Math.max(values.length - 1, 1)) * (width - padding * 2)

      const y =
        height -
        padding -
        ((value - min) / range) * (height - padding * 2)

      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="overflow-hidden rounded-2xl bg-[#F4F5F1] px-3 py-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-24 w-full"
        preserveAspectRatio="none"
      >
        <polyline
          points={points}
          fill="none"
          stroke="#4F7458"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {values.length > 0 && (
          <circle
            cx={Number(points.split(' ').at(-1).split(',')[0])}
            cy={Number(points.split(' ').at(-1).split(',')[1])}
            r="4"
            fill="#4F7458"
          />
        )}
      </svg>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-line/70 bg-paper p-5 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-moss-soft text-moss">
          <Icon size={19} strokeWidth={1.8} />
        </div>

        <span className="text-xs text-mute">Today</span>
      </div>

      <div className="mt-5 text-2xl font-semibold tracking-tight text-ink">
        {value}
      </div>

      <div className="mt-1 text-sm text-mute">{label}</div>

      {detail && (
        <div className="mt-3 text-xs font-medium text-moss">{detail}</div>
      )}
    </div>
  )
}

function LatestMetrics({ id }) {
  const { data } = useApi(() => api.session(id), [id])

  if (!data?.metrics) return null

  const metrics = data.metrics

  const items = [
    ['Alignment', metrics.alignment],
    ['Stability', metrics.stability],
    ['Pose confidence', metrics.confidence],
  ]

  return (
    <div className="mt-6 space-y-4">
      {items.map(([label, value]) => {
        const score = pct(value)

        return (
          <div key={label}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-white/60">{label}</span>
              <span className="font-medium text-white">{score}%</span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#A8C3A0]"
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const sessions = useApi(api.sessions)
  const analytics = useApi(() => api.analytics(90))

  const list = sessions.data || []

  const today = new Date().toISOString().slice(0, 10)
  const todays = list.filter((session) =>
    String(session.date || '').startsWith(today)
  )

  const latest = list[0]

  let insight = null

  if (list.length >= 6) {
    const recent = list
      .slice(0, 3)
      .map((x) => Number(x.avg_accuracy) || 0)

    const previous = list
      .slice(3, 6)
      .map((x) => Number(x.avg_accuracy) || 0)

    const recentAvg =
      recent.reduce((sum, value) => sum + value, 0) / recent.length

    const previousAvg =
      previous.reduce((sum, value) => sum + value, 0) / previous.length

    const difference = Math.round((recentAvg - previousAvg) * 100)

    insight = {
      text: `Your last 3 sessions averaged ${pct(
        recentAvg
      )}% accuracy, ${difference >= 0 ? 'up' : 'down'} ${Math.abs(
        difference
      )} points from the 3 before.`,
      positive: difference >= 0,
    }
  }

  const topPose = analytics.data?.poses?.[0]
  const topMistake = analytics.data?.mistakes?.[0]

  const todayDuration = todays.reduce(
    (sum, session) => sum + (Number(session.duration) || 0),
    0
  )

  const todayAccuracy =
    todays.length > 0
      ? todays.reduce(
          (sum, session) => sum + (Number(session.avg_accuracy) || 0),
          0
        ) / todays.length
      : 0

  if (sessions.error) {
    return (
      <div className="max-w-6xl p-4 md:p-10">
        <BackendDown />
      </div>
    )
  }

  if (sessions.loading) {
    return (
      <div className="max-w-6xl p-4 md:p-10">
        <LoadingState />
      </div>
    )
  }

  return (
    <main className="max-w-7xl space-y-8 p-4 md:p-8 lg:p-10">
      {/* Header */}
      <Reveal>
        <section className="relative isolate min-h-[370px] overflow-hidden rounded-[28px] border border-line/70 bg-paper px-5 py-7 sm:px-7 md:px-9 md:py-9">
          <div className="relative z-10 max-w-[64%] sm:max-w-[58%]">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-moss/20 bg-moss-soft px-3 py-1.5 text-xs font-medium text-moss">
              <span className="h-1.5 w-1.5 rounded-full bg-moss" />
              AI Yoga Coach
            </div>

            <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl md:text-5xl">
              Your practice,
              <span className="block text-moss">made smarter.</span>
            </h1>

            <p className="mt-3 max-w-xl text-xs leading-5 text-mute sm:text-sm sm:leading-6 md:text-base">
              Track your form, understand your movement, and build consistency
              one session at a time.
            </p>
          </div>

          <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap">
            <Link
              to="/live"
              className="inline-flex items-center gap-2 rounded-xl bg-ink px-3 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#34393D] sm:px-5 sm:text-sm"
            >
              <Play size={16} fill="currentColor" />
              Start Live Session
            </Link>

            <Link
              to="/analyzer"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-3 text-xs font-semibold text-ink transition hover:border-moss/40 hover:bg-moss-soft sm:px-5 sm:text-sm"
            >
              <ScanLine size={17} />
              Analyze Pose
            </Link>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[54%] sm:right-[-1%] sm:w-[49%]">
            <DashboardYogaArt />
          </div>
        </section>
      </Reveal>

      {/* Main insight card */}
      {latest ? (
        <Reveal delay={80}>
          <section className="overflow-hidden rounded-[28px] bg-[#18201C] text-white shadow-sm">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
              <div className="p-7 md:p-9">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#A8C3A0]">
                  <Sparkles size={14} />
                  Latest practice
                </div>

                <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-center">
                  <ScoreRing score={pct(latest.avg_accuracy)} />

                  <div>
                    <p className="text-2xl font-semibold tracking-tight">
                      {scoreLabel(pct(latest.avg_accuracy))}
                    </p>

                    <p className="mt-2 max-w-sm text-sm leading-6 text-white/55">
                      Your latest session was recorded on{' '}
                      <span className="text-white/80">
                        {formatDate(latest.date)}
                      </span>
                      .
                    </p>

                    <Link
                      to={`/sessions/${latest.id}`}
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#A8C3A0] transition hover:text-white"
                    >
                      View session details
                      <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 bg-black/10 p-7 md:p-9 lg:border-l lg:border-t-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Activity size={17} className="text-[#A8C3A0]" />
                  Session breakdown
                </div>

                <LatestMetrics id={latest.id} />
              </div>
            </div>
          </section>
        </Reveal>
      ) : (
        <Reveal delay={80}>
          <section className="rounded-[28px] border border-line bg-paper p-8 md:p-10">
            <div className="max-w-xl">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-moss-soft text-moss">
                <Sparkles size={22} />
              </div>

              <h2 className="mt-6 text-2xl font-semibold tracking-tight">
                Your practice starts here.
              </h2>

              <p className="mt-2 text-sm leading-6 text-mute">
                Start a live session or analyze a pose to create your first
                practice record.
              </p>

              <Link
                to="/live"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white"
              >
                <Play size={16} fill="currentColor" />
                Start your first session
              </Link>
            </div>
          </section>
        </Reveal>
      )}

      {/* Today metrics */}
      <Reveal delay={120}>
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">
                Today
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                Practice at a glance
              </h2>
            </div>

            <Link
              to="/progress"
              className="hidden items-center gap-1 text-sm font-medium text-moss sm:flex"
            >
              View progress
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={Target}
              label="Sessions"
              value={todays.length}
              detail={
                todays.length
                  ? 'Practice logged today'
                  : 'No sessions yet'
              }
            />

            <MetricCard
              icon={Clock3}
              label="Practice time"
              value={formatDuration(todayDuration)}
              detail={todayDuration ? 'Time spent practicing' : 'Start a session'}
            />

            <MetricCard
              icon={Activity}
              label="Average accuracy"
              value={`${pct(todayAccuracy)}%`}
              detail={
                todayAccuracy
                  ? 'Based on today’s sessions'
                  : 'Your first score is waiting'
              }
            />

            <MetricCard
              icon={TrendingUp}
              label="Top pose"
              value={topPose?.pose || '—'}
              detail={
                topPose
                  ? `${topPose.count || 0} practice${topPose.count === 1 ? '' : 's'}`
                  : 'Explore the pose library'
              }
            />
          </div>
        </section>
      </Reveal>

      {/* Progress + focus */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <Reveal delay={160}>
          <section className="rounded-[24px] border border-line bg-paper p-6 md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">
                  90-day trend
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  Form accuracy
                </h2>
              </div>

              <Link
                to="/progress"
                className="grid h-9 w-9 place-items-center rounded-xl bg-bone text-mute transition hover:bg-moss-soft hover:text-moss"
                aria-label="View progress"
              >
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="mt-6">
              <MiniTrend series={analytics.data?.series || []} />
            </div>

            {insight && (
              <div className="mt-4 flex gap-3 rounded-2xl bg-moss-soft p-4">
                <div className="mt-0.5 text-moss">
                  <TrendingUp size={17} />
                </div>

                <div>
                  <p className="text-sm font-medium text-ink">
                    Practice insight
                  </p>
                  <p className="mt-1 text-xs leading-5 text-mute">
                    {insight.text}
                  </p>
                </div>
              </div>
            )}
          </section>
        </Reveal>

        <Reveal delay={200}>
          <section className="rounded-[24px] border border-line bg-paper p-6 md:p-7">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-mute">
              <AlertCircle size={15} />
              Focus area
            </div>

            {topMistake ? (
              <>
                <h2 className="mt-5 text-xl font-semibold tracking-tight">
                  {topMistake.joint || 'Form alignment'}
                </h2>

                <p className="mt-2 text-sm leading-6 text-mute">
                  This is currently your most common form issue. Pay a little
                  extra attention to it during your next session.
                </p>

                <Link
                  to="/live"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-moss"
                >
                  Practice now
                  <ArrowUpRight size={15} />
                </Link>
              </>
            ) : (
              <>
                <h2 className="mt-5 text-xl font-semibold tracking-tight">
                  Build your first insight
                </h2>

                <p className="mt-2 text-sm leading-6 text-mute">
                  Complete a few sessions and YogaVision will surface the form
                  areas that deserve your attention.
                </p>

                <Link
                  to="/live"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-moss"
                >
                  Start practicing
                  <ArrowUpRight size={15} />
                </Link>
              </>
            )}
          </section>
        </Reveal>
      </div>

      {/* Recent sessions */}
      <Reveal delay={240}>
        <section className="rounded-[24px] border border-line bg-paper">
          <div className="flex items-center justify-between border-b border-line px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">
                History
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                Recent sessions
              </h2>
            </div>

            <Link
              to="/sessions"
              className="inline-flex items-center gap-1 text-sm font-semibold text-moss"
            >
              View all
              <ChevronRight size={16} />
            </Link>
          </div>

          {list.length ? (
            <div className="divide-y divide-line">
              {list.slice(0, 5).map((session) => {
                const score = pct(session.avg_accuracy)

                return (
                  <Link
                    key={session.id}
                    to={`/sessions/${session.id}`}
                    className="group flex flex-col gap-4 px-6 py-5 transition hover:bg-bone/60 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-moss-soft text-moss">
                        <Activity size={17} />
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink">
                          {formatDate(session.date)}
                        </div>

                        <div className="mt-1 text-xs text-mute">
                          {formatDuration(session.duration)} ·{' '}
                          {session.poses?.length || 0} poses
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 sm:justify-end">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-ink">
                          {score}%
                        </div>

                        <div className="mt-1 text-xs text-mute">
                          accuracy
                        </div>
                      </div>

                      <ChevronRight
                        size={17}
                        className="text-mute transition group-hover:translate-x-0.5 group-hover:text-moss"
                      />
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-sm text-mute">
              No sessions recorded yet.
            </div>
          )}
        </section>
      </Reveal>
    </main>
  )
}
