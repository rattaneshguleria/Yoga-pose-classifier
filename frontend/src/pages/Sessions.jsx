import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  LogIn,
  CalendarDays,
  Clock3,
  Target,
  Activity,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'

import {
  api,
  getAuthState,
  useApi,
} from '../lib/api.js'

import BackendDown from '../components/BackendDown.jsx'
import LoadingState from '../components/LoadingState.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { fmtTime, label } from '../lib/ui.js'
import Reveal from '../components/Reveal.jsx'

const pct = v =>
  Math.round(v * 100) + '%'

const when = d =>
  new Date(d).toLocaleDateString(
    undefined,
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  )

function scoreTone(value) {
  if (value >= 0.85) {
    return {
      text: 'text-moss-dark',
      bg: 'bg-moss-soft',
      bar: 'bg-moss',
    }
  }

  if (value >= 0.7) {
    return {
      text: 'text-amber',
      bg: 'bg-amber-soft',
      bar: 'bg-amber',
    }
  }

  return {
    text: 'text-clay',
    bg: 'bg-clay-soft',
    bar: 'bg-clay',
  }
}

function ScoreRing({ value }) {
  const score = Math.round(value * 100)

  const tone = scoreTone(value)

  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg
        viewBox="0 0 36 36"
        className="h-full w-full -rotate-90"
      >
        <path
          d="M18 2.0845
             a 15.9155 15.9155 0 0 1 0 31.831
             a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#E4E4DE"
          strokeWidth="3"
        />

        <path
          d="M18 2.0845
             a 15.9155 15.9155 0 0 1 0 31.831
             a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${score}, 100`}
          className={tone.text}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-semibold text-ink">
          {score}%
        </span>
      </div>
    </div>
  )
}

function Metric({
  icon: Icon,
  label: title,
  value,
  detail,
}) {
  return (
    <div className="border border-line bg-paper p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.12em] font-semibold text-mute">
            {title}
          </div>

          <div className="mt-2 text-2xl font-semibold text-ink">
            {value}
          </div>
        </div>

        <div className="h-9 w-9 bg-moss-soft text-moss-dark flex items-center justify-center">
          <Icon size={16} />
        </div>
      </div>

      {detail && (
        <div className="mt-3 text-xs text-mute">
          {detail}
        </div>
      )}
    </div>
  )
}

function AlignmentBar({
  name,
  value,
}) {
  const tone = scoreTone(value)

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-ink">
          {label(name)}
        </span>

        <span className={`font-semibold ${tone.text}`}>
          {pct(value)}
        </span>
      </div>

      <div className="mt-2 h-2 bg-bone overflow-hidden">
        <div
          className={`h-full ${tone.bar} transition-all`}
          style={{
            width: `${Math.max(
              0,
              Math.min(100, value * 100)
            )}%`,
          }}
        />
      </div>
    </div>
  )
}

export function SessionDetail() {
  const { id } = useParams()

  const {
    data: s,
    error,
    loading,
  } = useApi(
    () => api.session(id),
    [id]
  )

  if (error) {
    return (
      <div className="p-5 md:p-8">
        <BackendDown />
      </div>
    )
  }

  if (loading || !s) {
    return (
      <div className="p-5 md:p-8">
        <LoadingState text="Loading session…" />
      </div>
    )
  }

  const tone = scoreTone(
    s.avg_accuracy
  )

  return (
    <div className="min-h-screen bg-bone">
      {/* Header */}
      <header className="border-b border-line bg-paper">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-7">
          <Link
            to="/sessions"
            className="inline-flex items-center gap-2 text-sm text-mute hover:text-ink transition-colors"
          >
            <ArrowLeft size={15} />
            Back to sessions
          </Link>

          <div className="mt-5 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] font-semibold text-moss-dark">
                <CalendarDays size={14} />
                Practice session
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
                {when(s.date)}
              </h1>

              {s.sample && (
                <span className="inline-flex mt-2 px-2 py-1 bg-bone text-xs text-mute">
                  Sample data
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-mute">
                  Average accuracy
                </div>

                <div className={`mt-1 text-2xl font-semibold ${tone.text}`}>
                  {pct(s.avg_accuracy)}
                </div>
              </div>

              <ScoreRing
                value={s.avg_accuracy}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 md:px-8 py-8">
        {/* Session metrics */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Metric
            icon={Clock3}
            label="Duration"
            value={fmtTime(s.duration)}
            detail="Total practice time"
          />

          <Metric
            icon={Target}
            label="Average accuracy"
            value={pct(s.avg_accuracy)}
            detail="Across detected poses"
          />

          <Metric
            icon={Activity}
            label="Poses"
            value={s.poses.length}
            detail="Detected during session"
          />
        </div>

        {/* Pose performance */}
        <Reveal>
          <section className="mt-6 border border-line bg-paper">
            <div className="px-5 md:px-6 py-5 border-b border-line">
              <div className="flex items-center gap-2">
                <Sparkles
                  size={16}
                  className="text-moss"
                />

                <h2 className="text-sm font-semibold text-ink">
                  Pose performance
                </h2>
              </div>

              <p className="mt-1 text-xs text-mute">
                Accuracy and recognition confidence for each
                detected pose.
              </p>
            </div>

            <div className="p-5 md:p-6">
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.1em] text-mute border-b border-line">
                      <th className="pb-3 font-semibold">
                        Pose
                      </th>

                      <th className="pb-3 font-semibold">
                        Time
                      </th>

                      <th className="pb-3 font-semibold">
                        Accuracy
                      </th>

                      <th className="pb-3 font-semibold">
                        Confidence
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-line">
                    {s.poses.map(p => {
                      const tone =
                        scoreTone(
                          p.accuracy
                        )

                      return (
                        <tr
                          key={p.name}
                          className="hover:bg-bone transition-colors"
                        >
                          <td className="py-4 font-medium text-ink">
                            {p.name}
                          </td>

                          <td className="py-4 text-mute">
                            {fmtTime(
                              p.seconds
                            )}
                          </td>

                          <td className="py-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold ${tone.bg} ${tone.text}`}
                            >
                              {pct(
                                p.accuracy
                              )}
                            </span>
                          </td>

                          <td className="py-4 text-mute">
                            {pct(
                              p.confidence
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-3">
                {s.poses.map(p => {
                  const tone =
                    scoreTone(
                      p.accuracy
                    )

                  return (
                    <div
                      key={p.name}
                      className="border border-line p-4"
                    >
                      <div className="font-medium text-sm text-ink">
                        {p.name}
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <div className="text-mute">
                            Time
                          </div>

                          <div className="mt-1 font-semibold text-ink">
                            {fmtTime(
                              p.seconds
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-mute">
                            Accuracy
                          </div>

                          <div className={`mt-1 font-semibold ${tone.text}`}>
                            {pct(
                              p.accuracy
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-mute">
                            Confidence
                          </div>

                          <div className="mt-1 font-semibold text-ink">
                            {pct(
                              p.confidence
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </Reveal>

        {/* Joint alignment */}
        <Reveal>
          <section className="mt-6 border border-line bg-paper">
            <div className="px-5 md:px-6 py-5 border-b border-line">
              <div className="flex items-center gap-2">
                <Activity
                  size={16}
                  className="text-moss"
                />

                <h2 className="text-sm font-semibold text-ink">
                  Joint alignment
                </h2>
              </div>

              <p className="mt-1 text-xs text-mute">
                Percentage of time each joint remained within
                its target range.
              </p>
            </div>

            <div className="p-5 md:p-6">
              <div className="max-w-2xl space-y-5">
                {Object.entries(
                  s.joints
                )
                  .sort(
                    (a, b) =>
                      a[1] - b[1]
                  )
                  .map(([j, v]) => (
                    <AlignmentBar
                      key={j}
                      name={j}
                      value={v}
                    />
                  ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* Focus area */}
        <Reveal>
          <section className="mt-6 border border-line bg-paper p-5 md:p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 shrink-0 bg-amber-soft text-amber flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>

              <div>
                <div className="text-xs uppercase tracking-[0.14em] font-semibold text-mute">
                  Focus area
                </div>

                <h2 className="mt-1 text-base font-semibold text-ink">
                  {Object.entries(
                    s.joints
                  ).length
                    ? label(
                        Object.entries(
                          s.joints
                        ).sort(
                          (a, b) =>
                            a[1] - b[1]
                        )[0][0]
                      )
                    : 'Keep practising'}
                </h2>

                <p className="mt-1.5 text-sm leading-6 text-mute max-w-2xl">
                  {Object.entries(
                    s.joints
                  ).length
                    ? `This was the joint with the lowest time within its target range during this session. Use Live Coach to focus on alignment while practising.`
                    : 'Continue practising with Live Coach to build more useful alignment data.'}
                </p>
              </div>
            </div>
          </section>
        </Reveal>
      </main>
    </div>
  )
}

export default function Sessions() {
  const auth = getAuthState()

  const {
    data,
    error,
    loading,
  } = useApi(
    api.sessions,
    [auth?.token]
  )

  if (!auth) {
    return (
      <div className="min-h-screen bg-bone">
        <div className="max-w-2xl mx-auto px-5 md:px-8 py-10">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] font-semibold text-moss-dark">
            <CalendarDays size={14} />
            Practice history
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Sessions
          </h1>

          <div className="mt-6 border border-line bg-paper p-6">
            <div className="h-11 w-11 bg-moss-soft text-moss-dark flex items-center justify-center">
              <LogIn size={19} />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-ink">
              Log in to view your sessions
            </h2>

            <p className="mt-2 text-sm leading-6 text-mute">
              Your saved Live Coach sessions will appear here
              once you're logged in.
            </p>

            <Link
              to="/login"
              className="mt-5 inline-flex items-center gap-2 bg-ink text-white px-4 py-2.5 text-sm font-semibold hover:bg-moss-dark transition-colors"
            >
              <LogIn size={15} />
              Log in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const sessions = data || []

  const averageAccuracy =
    sessions.length
      ? sessions.reduce(
          (sum, s) =>
            sum +
            (Number(
              s.avg_accuracy
            ) || 0),
          0
        ) / sessions.length
      : null

  const totalDuration =
    sessions.reduce(
      (sum, s) =>
        sum +
        (Number(
          s.duration
        ) || 0),
      0
    )

  return (
    <div className="min-h-screen bg-bone">
      {/* Header */}
      <header className="border-b border-line bg-paper">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-7">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] font-semibold text-moss-dark">
            <CalendarDays size={14} />
            Practice history
          </div>

          <div className="mt-2 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-ink">
                Your sessions
              </h1>

              <p className="mt-2 text-sm leading-6 text-mute">
                Review your previous yoga practice and see
                how your form performed in each session.
              </p>
            </div>

            {sessions.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-mute">
                <CheckCircle2
                  size={15}
                  className="text-moss"
                />
                {sessions.length} recorded{' '}
                {sessions.length === 1
                  ? 'session'
                  : 'sessions'}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 md:px-8 py-8">
        {/* Error */}
        {error && (
          <div className="border border-line bg-paper p-6">
            <BackendDown />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="border border-line bg-paper p-8">
            <LoadingState text="Loading sessions…" />
          </div>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          !sessions.length && (
            <div className="border border-line bg-paper">
              <EmptyState title="No sessions yet">
                Finish a Live Coach session and choose Save
                session.
              </EmptyState>
            </div>
          )}

        {/* Sessions */}
        {!loading &&
          !error &&
          sessions.length > 0 && (
            <>
              {/* Stats */}
              <div className="grid sm:grid-cols-3 gap-4">
                <Metric
                  icon={CalendarDays}
                  label="Sessions"
                  value={sessions.length}
                  detail="Saved practice sessions"
                />

                <Metric
                  icon={Target}
                  label="Average accuracy"
                  value={
                    averageAccuracy == null
                      ? '—'
                      : pct(
                          averageAccuracy
                        )
                  }
                  detail="Across your sessions"
                />

                <Metric
                  icon={Clock3}
                  label="Practice time"
                  value={fmtTime(
                    totalDuration
                  )}
                  detail="Total recorded duration"
                />
              </div>

              {/* Session cards */}
              <section className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-ink">
                      Recent sessions
                    </h2>

                    <p className="mt-1 text-xs text-mute">
                      Select a session to view detailed performance.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {sessions.map(s => {
                    const tone =
                      scoreTone(
                        s.avg_accuracy
                      )

                    return (
                      <Reveal
                        key={s.id}
                      >
                        <Link
                          to={`/sessions/${s.id}`}
                          className="group block border border-line bg-paper hover:border-moss/50 hover:bg-moss-soft/10 transition-all"
                        >
                          <div className="p-5 md:p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                              {/* Score */}
                              <div className="flex items-center gap-4 lg:w-64 shrink-0">
                                <ScoreRing
                                  value={
                                    s.avg_accuracy
                                  }
                                />

                                <div>
                                  <div className="text-xs uppercase tracking-[0.1em] font-semibold text-mute">
                                    Accuracy
                                  </div>

                                  <div className={`mt-1 text-lg font-semibold ${tone.text}`}>
                                    {pct(
                                      s.avg_accuracy
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Main info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <h3 className="font-semibold text-ink">
                                    {when(
                                      s.date
                                    )}
                                  </h3>

                                  {s.sample && (
                                    <span className="px-2 py-0.5 bg-bone text-[11px] text-mute">
                                      Sample
                                    </span>
                                  )}
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-mute">
                                  <span className="inline-flex items-center gap-1.5">
                                    <Clock3
                                      size={13}
                                    />
                                    {fmtTime(
                                      s.duration
                                    )}
                                  </span>

                                  <span className="inline-flex items-center gap-1.5">
                                    <Activity
                                      size={13}
                                    />
                                    {s.poses.length}{' '}
                                    {s.poses.length ===
                                    1
                                      ? 'pose'
                                      : 'poses'}
                                  </span>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {s.poses
                                    .slice(
                                      0,
                                      4
                                    )
                                    .map(
                                      pose => (
                                        <span
                                          key={
                                            pose
                                          }
                                          className="px-2.5 py-1 bg-moss-soft text-moss-dark text-[11px] font-medium"
                                        >
                                          {pose}
                                        </span>
                                      )
                                    )}

                                  {s.poses.length >
                                    4 && (
                                    <span className="px-2.5 py-1 bg-bone text-mute text-[11px]">
                                      +
                                      {s
                                        .poses
                                        .length -
                                        4}{' '}
                                      more
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Common error */}
                              <div className="lg:w-56 shrink-0 border-t lg:border-t-0 lg:border-l border-line pt-4 lg:pt-0 lg:pl-5">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.1em] font-semibold text-mute">
                                  <AlertTriangle
                                    size={13}
                                    className="text-amber"
                                  />
                                  Common issue
                                </div>

                                <div className="mt-2 text-sm text-ink">
                                  {s.common_error ||
                                    'No major issue recorded'}
                                </div>
                              </div>

                              {/* Arrow */}
                              <div className="hidden md:flex h-9 w-9 shrink-0 bg-bone items-center justify-center text-mute group-hover:bg-moss-soft group-hover:text-moss-dark transition-colors">
                                <ChevronRight size={17} />
                              </div>
                            </div>
                          </div>
                        </Link>
                      </Reveal>
                    )
                  })}
                </div>
              </section>
            </>
          )}
      </main>
    </div>
  )
}