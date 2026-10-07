import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  Clock3,
  Target,
  Activity,
  CalendarDays,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react'

import { api, useApi } from '../lib/api.js'
import BackendDown from '../components/BackendDown.jsx'
import LoadingState from '../components/LoadingState.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Reveal from '../components/Reveal.jsx'

const ax = {
  tick: {
    fontSize: 11,
    fill: '#6B7177',
  },
  axisLine: {
    stroke: '#DCDCD5',
  },
  tickLine: false,
}

const tooltipStyle = {
  backgroundColor: '#FBFBF9',
  border: '1px solid #DCDCD5',
  borderRadius: '8px',
  fontSize: 12,
}

export function firstLast(series, key) {
  const v = series
    .map(s => s[key])
    .filter(x => x != null)

  return v.length > 1
    ? [v[0], v[v.length - 1]]
    : null
}

function average(series, key) {
  const values = series
    .map(s => s[key])
    .filter(x => x != null)

  if (!values.length) return null

  return (
    values.reduce((a, b) => a + b, 0) /
    values.length
  )
}

function percent(value) {
  return value == null
    ? '—'
    : `${Math.round(value * 100)}%`
}

function total(series, key) {
  return series.reduce(
    (sum, item) =>
      sum + (Number(item[key]) || 0),
    0
  )
}

export default function Progress() {
  const [days, setDays] = useState(30)

  const {
    data,
    error,
    loading,
  } = useApi(
    () => api.analytics(days),
    [days]
  )

  const series = data?.series || []
  const poses = data?.poses || []
  const mistakes = data?.mistakes || []

  const avgAccuracy = average(
    series,
    'accuracy'
  )

  const avgConfidence = average(
    series,
    'confidence'
  )

  const totalMinutes = total(
    series,
    'duration'
  )

  const accuracyChange = firstLast(
    series,
    'accuracy'
  )

  const improvement =
    accuracyChange &&
    accuracyChange[0] != null &&
    accuracyChange[1] != null
      ? accuracyChange[1] -
        accuracyChange[0]
      : null

  return (
    <div className="min-h-screen bg-bone">
      {/* Header */}
      <header className="border-b border-line bg-paper">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-7">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-moss-dark">
                <TrendingUp size={14} />
                Performance
              </div>

              <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-ink">
                Your progress
              </h1>

              <p className="mt-2 text-sm leading-6 text-mute max-w-2xl">
                Track how your form, practice consistency and
                alignment change over time.
              </p>
            </div>

            <div
              role="group"
              aria-label="Progress range"
              className="inline-flex self-start lg:self-auto border border-line bg-paper"
            >
              {[7, 30, 90].map(d => (
                <button
                  key={d}
                  aria-pressed={days === d}
                  onClick={() =>
                    setDays(d)
                  }
                  className={`
                    px-4 py-2 text-sm font-semibold
                    transition-colors
                    ${
                      days === d
                        ? 'bg-ink text-white'
                        : 'text-mute hover:bg-bone hover:text-ink'
                    }
                  `}
                >
                  {d} days
                </button>
              ))}
            </div>
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
        {loading && !data && (
          <div className="border border-line bg-paper p-8">
            <LoadingState text="Loading analytics…" />
          </div>
        )}

        {/* Empty */}
        {data && !series.length && (
          <div className="border border-line bg-paper">
            <EmptyState title="No sessions in this range">
              Practice in Live Coach, or pick a longer range.
            </EmptyState>
          </div>
        )}

        {/* Analytics */}
        {data && series.length > 0 && (
          <>
            {/* Summary */}
            <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                icon={Target}
                label="Average form"
                value={percent(avgAccuracy)}
                detail={
                  improvement != null
                    ? `${improvement >= 0 ? '+' : ''}${Math.round(
                        improvement * 100
                      )}% across period`
                    : 'Based on recorded sessions'
                }
                positive={
                  improvement != null &&
                  improvement >= 0
                }
              />

              <StatCard
                icon={CalendarDays}
                label="Sessions"
                value={series.length}
                detail={`Last ${days} days`}
              />

              <StatCard
                icon={Clock3}
                label="Practice time"
                value={`${Math.round(
                  totalMinutes
                )} min`}
                detail="Total recorded duration"
              />

              <StatCard
                icon={Activity}
                label="Pose confidence"
                value={percent(
                  avgConfidence
                )}
                detail="Average recognition confidence"
              />
            </section>

            {/* Insight */}
            <Reveal>
              <section className="mt-6 border border-line bg-paper p-5 md:p-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 shrink-0 bg-moss-soft text-moss-dark flex items-center justify-center">
                    <Sparkles size={18} />
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.14em] font-semibold text-moss-dark">
                      Progress snapshot
                    </div>

                    <p className="mt-1.5 text-sm leading-6 text-ink">
                      {accuracyChange
                        ? `Your average form accuracy moved from ${Math.round(
                            accuracyChange[0] * 100
                          )}% to ${Math.round(
                            accuracyChange[1] * 100
                          )}% across ${series.length} sessions.`
                        : 'Keep practising to build a clearer progress trend.'}

                      {mistakes[0] && (
                        <>
                          {' '}
                          Your most frequent issue is{' '}
                          <span className="font-semibold">
                            {mistakes[0].joint.toLowerCase()}
                            {' '}alignment
                          </span>
                          .
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </section>
            </Reveal>

            {/* Main charts */}
            <div className="mt-6 grid xl:grid-cols-2 gap-6">
              <ChartCard
                title="Form accuracy"
                subtitle="How your average form has changed"
                icon={Target}
              >
                <ResponsiveContainer>
                  <LineChart data={series}>
                    <CartesianGrid
                      stroke="#ECECE6"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="date"
                      {...ax}
                    />

                    <YAxis
                      domain={[0.4, 1]}
                      tickFormatter={v =>
                        `${Math.round(
                          v * 100
                        )}%`
                      }
                      {...ax}
                    />

                    <Tooltip
                      formatter={v =>
                        `${Math.round(
                          v * 100
                        )}%`
                      }
                      contentStyle={
                        tooltipStyle
                      }
                    />

                    <Line
                      dataKey="accuracy"
                      stroke="#4F7458"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{
                        r: 5,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Session duration"
                subtitle="Minutes spent practising"
                icon={Clock3}
              >
                <ResponsiveContainer>
                  <BarChart data={series}>
                    <CartesianGrid
                      stroke="#ECECE6"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="date"
                      {...ax}
                    />

                    <YAxis {...ax} />

                    <Tooltip
                      contentStyle={
                        tooltipStyle
                      }
                    />

                    <Bar
                      dataKey="duration"
                      fill="#8AA58F"
                      radius={[
                        4,
                        4,
                        0,
                        0,
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Pose confidence"
                subtitle="How consistently poses were recognised"
                icon={Activity}
              >
                <ResponsiveContainer>
                  <LineChart data={series}>
                    <CartesianGrid
                      stroke="#ECECE6"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="date"
                      {...ax}
                    />

                    <YAxis
                      domain={[0.7, 1]}
                      tickFormatter={v =>
                        `${Math.round(
                          v * 100
                        )}%`
                      }
                      {...ax}
                    />

                    <Tooltip
                      formatter={v =>
                        `${Math.round(
                          v * 100
                        )}%`
                      }
                      contentStyle={
                        tooltipStyle
                      }
                    />

                    <Line
                      dataKey="confidence"
                      stroke="#22262A"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{
                        r: 5,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Joint alignment"
                subtitle="Alignment quality across key areas"
                icon={Activity}
              >
                <ResponsiveContainer>
                  <LineChart data={series}>
                    <CartesianGrid
                      stroke="#ECECE6"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="date"
                      {...ax}
                    />

                    <YAxis
                      domain={[0.4, 1]}
                      tickFormatter={v =>
                        `${Math.round(
                          v * 100
                        )}%`
                      }
                      {...ax}
                    />

                    <Tooltip
                      formatter={v =>
                        `${Math.round(
                          v * 100
                        )}%`
                      }
                      contentStyle={
                        tooltipStyle
                      }
                    />

                    <Legend
                      iconType="plainline"
                      wrapperStyle={{
                        fontSize: 11,
                      }}
                    />

                    <Line
                      dataKey="left_knee"
                      name="Left knee"
                      stroke="#A6462E"
                      dot={false}
                      strokeWidth={2}
                    />

                    <Line
                      dataKey="spine"
                      name="Spine"
                      stroke="#B7791F"
                      dot={false}
                      strokeWidth={2}
                    />

                    <Line
                      dataKey="shoulders"
                      name="Shoulders"
                      stroke="#4F7458"
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Breakdown */}
            <div className="mt-6 grid xl:grid-cols-2 gap-6">
              <ChartCard
                title="Most practised poses"
                subtitle="Number of sessions containing each pose"
                icon={Sparkles}
              >
                {poses.length ? (
                  <ResponsiveContainer>
                    <BarChart
                      data={poses}
                      layout="vertical"
                      margin={{
                        left: 10,
                        right: 10,
                      }}
                    >
                      <XAxis
                        type="number"
                        {...ax}
                      />

                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        {...ax}
                      />

                      <Tooltip
                        contentStyle={
                          tooltipStyle
                        }
                      />

                      <Bar
                        dataKey="count"
                        fill="#4F7458"
                        radius={[
                          0,
                          4,
                          4,
                          0,
                        ]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart text="No pose data available." />
                )}
              </ChartCard>

              <ChartCard
                title="Common mistakes"
                subtitle="Weighted by time spent out of range"
                icon={AlertTriangle}
              >
                {mistakes.length ? (
                  <ResponsiveContainer>
                    <BarChart
                      data={mistakes}
                      layout="vertical"
                      margin={{
                        left: 10,
                        right: 10,
                      }}
                    >
                      <XAxis
                        type="number"
                        hide
                      />

                      <YAxis
                        type="category"
                        dataKey="joint"
                        width={110}
                        {...ax}
                      />

                      <Tooltip
                        contentStyle={
                          tooltipStyle
                        }
                      />

                      <Bar
                        dataKey="score"
                        fill="#B7791F"
                        radius={[
                          0,
                          4,
                          4,
                          0,
                        ]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart text="No common mistakes recorded." />
                )}
              </ChartCard>
            </div>

            {/* Bottom cards */}
            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <section className="border border-line bg-paper p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-moss-soft text-moss-dark flex items-center justify-center">
                    <CheckCircle2 size={18} />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-ink">
                      Keep building consistency
                    </div>

                    <p className="mt-0.5 text-xs text-mute">
                      Every recorded session contributes to
                      your progress trends.
                    </p>
                  </div>
                </div>
              </section>

              <section className="border border-line bg-paper p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-bone text-ink flex items-center justify-center">
                    <ArrowUpRight size={18} />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-ink">
                      Focus on your weak points
                    </div>

                    <p className="mt-0.5 text-xs text-mute">
                      Use Live Coach to get real-time feedback
                      while practising.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  positive,
}) {
  return (
    <section className="border border-line bg-paper p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.12em] font-semibold text-mute">
            {label}
          </div>

          <div className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            {value}
          </div>
        </div>

        <div className="h-10 w-10 shrink-0 bg-moss-soft text-moss-dark flex items-center justify-center">
          <Icon size={18} />
        </div>
      </div>

      <div
        className={`mt-4 text-xs ${
          positive
            ? 'text-moss-dark'
            : 'text-mute'
        }`}
      >
        {detail}
      </div>
    </section>
  )
}

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
}) {
  return (
    <Reveal>
      <section className="border border-line bg-paper p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Icon
                size={16}
                className="text-moss"
              />

              <h2 className="text-sm font-semibold text-ink">
                {title}
              </h2>
            </div>

            <p className="mt-1 text-xs text-mute">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="mt-5 h-56">
          {children}
        </div>
      </section>
    </Reveal>
  )
}

function EmptyChart({ text }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-mute">
      {text}
    </div>
  )
}