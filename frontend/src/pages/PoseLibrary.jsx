import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Search,
  ArrowLeft,
  ArrowUpRight,
  Play,
  Target,
  Dumbbell,
  CircleCheck,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react'

import { POSES } from '../lib/analysis.js'
import { BONES } from '../components/PoseSkeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Reveal from '../components/Reveal.jsx'

const FILTERS = [
  'Standing',
  'Balance',
  'Seated',
  'Strength',
  'Flexibility',
  'Beginner',
  'Intermediate',
  'Advanced',
]

const IDX = [
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
]

export function RefFigure({ pose }) {
  if (!pose.ref) {
    return (
      <div className="grid aspect-square place-items-center rounded-2xl border border-line bg-bone p-4 text-center text-xs text-mute">
        Reference skeleton not authored yet for this pose.
      </div>
    )
  }

  const full = {}

  IDX.forEach((i, k) => {
    full[i] = pose.ref[k]
  })

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#F7F8F4]">
      <svg
        viewBox="0 0 100 100"
        className="aspect-square w-full"
        role="img"
        aria-label={`${pose.name} reference skeleton`}
      >
        {BONES.map(([a, b]) => (
          <line
            key={a + b}
            x1={full[a][0] * 100}
            y1={full[a][1] * 100}
            x2={full[b][0] * 100}
            y2={full[b][1] * 100}
            stroke="#4F7458"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        ))}

        {IDX.map(i => (
          <circle
            key={i}
            cx={full[i][0] * 100}
            cy={full[i][1] * 100}
            r="1.45"
            fill="#22262A"
          />
        ))}
      </svg>
    </div>
  )
}

function DifficultyBadge({ difficulty }) {
  const styles = {
    Beginner: 'bg-moss-soft text-moss-dark',
    Intermediate: 'bg-amber-soft text-amber',
    Advanced: 'bg-clay-soft text-clay',
  }

  return (
    <span
      className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
        styles[difficulty] ||
        'bg-bone text-mute'
      }`}
    >
      {difficulty}
    </span>
  )
}

export default function PoseLibrary() {
  const { id } = useParams()
  const nav = useNavigate()

  const [q, setQ] = useState('')
  const [on, setOn] = useState([])

  const pose = POSES.find(p => p.id === id)

  /* ---------------- DETAIL PAGE ---------------- */

  if (id && pose) {
    return (
      <main className="min-h-screen bg-[#F5F5F1] p-4 md:p-8 lg:p-10">
        <div className="mx-auto max-w-6xl">

          <Link
            to="/library"
            className="inline-flex items-center gap-2 text-sm font-medium text-mute transition hover:text-ink"
          >
            <ArrowLeft size={15} />
            Pose library
          </Link>

          <Reveal>
            <section className="mt-6 grid gap-7 lg:grid-cols-[430px_1fr]">

              {/* LEFT */}
              <div>
                <div className="overflow-hidden rounded-[28px] border border-line bg-paper p-4">
                  <RefFigure pose={pose} />

                  <button
                    onClick={() =>
                      nav(
                        `/live?pose=${encodeURIComponent(
                          pose.name
                        )}`
                      )
                    }
                    className="press mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-sm font-semibold text-white transition hover:bg-[#34393D]"
                  >
                    <Play
                      size={15}
                      fill="currentColor"
                    />
                    Practice this pose
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-line bg-paper p-4">
                    <div className="flex items-center gap-2 text-mute">
                      <Target size={15} />
                      <span className="text-xs">
                        Level
                      </span>
                    </div>

                    <div className="mt-2">
                      <DifficultyBadge
                        difficulty={
                          pose.difficulty
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-line bg-paper p-4">
                    <div className="flex items-center gap-2 text-mute">
                      <Dumbbell size={15} />
                      <span className="text-xs">
                        Category
                      </span>
                    </div>

                    <div className="mt-2 text-sm font-semibold">
                      {pose.category[0]}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div className="rounded-[28px] border border-line bg-paper p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.15em] text-moss">
                      Pose guide
                    </div>

                    <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
                      {pose.name}
                    </h1>
                  </div>

                  <DifficultyBadge
                    difficulty={
                      pose.difficulty
                    }
                  />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {pose.category.map(category => (
                    <span
                      key={category}
                      className="rounded-full border border-line bg-bone px-3 py-1.5 text-xs text-mute"
                    >
                      {category}
                    </span>
                  ))}
                </div>

                <p className="mt-7 max-w-2xl text-base leading-7 text-mute">
                  {pose.benefits}
                </p>

                <div className="mt-6 rounded-2xl bg-moss-soft p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-moss-dark">
                    Target muscles
                  </div>

                  <p className="mt-2 text-sm leading-6 text-ink">
                    {pose.muscles}
                  </p>
                </div>

                {/* STEPS */}
                <section className="mt-8">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-white text-xs font-bold">
                      01
                    </div>

                    <h2 className="text-lg font-semibold">
                      How to perform it
                    </h2>
                  </div>

                  <ol className="mt-4 space-y-3">
                    {pose.steps.map(
                      (step, index) => (
                        <li
                          key={step}
                          className="flex gap-3 rounded-xl border border-line bg-bone p-4"
                        >
                          <span className="shrink-0 text-xs font-semibold text-moss">
                            {String(
                              index + 1
                            ).padStart(2, '0')}
                          </span>

                          <span className="text-sm leading-5">
                            {step}
                          </span>
                        </li>
                      )
                    )}
                  </ol>
                </section>

                {/* JOINT ANGLES */}
                <section className="mt-8">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-moss-soft text-moss">
                      <Target size={15} />
                    </div>

                    <h2 className="text-lg font-semibold">
                      Target joint angles
                    </h2>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-line">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-line">
                        {Object.entries(
                          pose.rules
                        ).map(
                          ([j, [lo, hi]]) => (
                            <tr
                              key={j}
                              className="hover:bg-bone"
                            >
                              <td className="px-4 py-3 font-medium capitalize">
                                {j.replace(
                                  '_',
                                  ' '
                                )}
                              </td>

                              <td className="px-4 py-3 text-right font-semibold text-moss-dark">
                                {lo}–{hi}°
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-mute">
                    Starting values used by YogaVision's
                    pose rules. Tune them against real
                    practitioners when validating the system.
                  </p>
                </section>

                {/* MISTAKES */}
                <section className="mt-8">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-soft text-amber">
                      !
                    </div>

                    <h2 className="text-lg font-semibold">
                      Common mistakes
                    </h2>
                  </div>

                  <ul className="mt-4 space-y-2">
                    {pose.mistakes.map(
                      mistake => (
                        <li
                          key={mistake}
                          className="flex gap-3 rounded-xl bg-amber-soft/70 px-4 py-3 text-sm leading-5"
                        >
                          <AlertDot />
                          <span>{mistake}</span>
                        </li>
                      )
                    )}
                  </ul>
                </section>
              </div>
            </section>
          </Reveal>

          {/* CTA */}
          <Reveal delay={120}>
            <section className="mt-7 overflow-hidden rounded-[28px] bg-[#18201C] p-7 text-white md:p-9">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.15em] text-[#A8C3A0]">
                    Ready to practice?
                  </div>

                  <h2 className="mt-2 text-2xl font-semibold">
                    Try {pose.name} with your AI coach.
                  </h2>

                  <p className="mt-2 text-sm text-white/50">
                    Get real-time alignment feedback while
                    you practice.
                  </p>
                </div>

                <button
                  onClick={() =>
                    nav(
                      `/live?pose=${encodeURIComponent(
                        pose.name
                      )}`
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#A8C3A0] px-5 py-3 text-sm font-semibold text-[#18201C] transition hover:bg-white"
                >
                  <Play
                    size={15}
                    fill="currentColor"
                  />
                  Start practice
                  <ArrowUpRight size={15} />
                </button>
              </div>
            </section>
          </Reveal>
        </div>
      </main>
    )
  }

  /* ---------------- LIBRARY ---------------- */

  const list = POSES.filter(
    p =>
      p.name
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      on.every(f =>
        [
          ...p.category,
          p.difficulty,
        ].includes(f)
      )
  )

  return (
    <main className="min-h-screen bg-[#F5F5F1] p-4 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <Reveal>
          <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-moss">
                <Target size={14} />
                Yoga library
              </div>

              <h1 className="mt-2 text-4xl font-semibold tracking-tight">
                Find your pose.
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-mute">
                Explore supported yoga poses, learn the correct
                form, and practice them with your AI coach.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-paper px-4 py-3 text-right">
              <div className="text-xs text-mute">
                Available poses
              </div>

              <div className="mt-0.5 text-xl font-semibold">
                {POSES.length}
              </div>
            </div>
          </section>
        </Reveal>

        {/* SEARCH */}
        <Reveal delay={70}>
          <section className="mt-8 rounded-[24px] border border-line bg-paper p-4 md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-mute"
                />

                <input
                  value={q}
                  onChange={e =>
                    setQ(e.target.value)
                  }
                  placeholder="Search poses by name..."
                  aria-label="Search poses"
                  className="w-full rounded-xl border border-line bg-bone py-3 pl-11 pr-4 text-sm outline-none transition focus:border-moss focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-mute">
                <SlidersHorizontal size={15} />
                Filter by
              </div>

              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Filters"
              >
                {FILTERS.map(f => (
                  <button
                    key={f}
                    aria-pressed={on.includes(
                      f
                    )}
                    onClick={() =>
                      setOn(o =>
                        o.includes(f)
                          ? o.filter(
                              x => x !== f
                            )
                          : [...o, f]
                      )
                    }
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                      on.includes(f)
                        ? 'border-ink bg-ink text-white'
                        : 'border-line bg-bone text-mute hover:border-moss hover:text-ink'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* RESULT COUNT */}
        <div className="mt-7 flex items-center justify-between">
          <p className="text-sm text-mute">
            Showing{' '}
            <span className="font-semibold text-ink">
              {list.length}
            </span>{' '}
            {list.length === 1
              ? 'pose'
              : 'poses'}
          </p>

          {(q || on.length > 0) && (
            <button
              onClick={() => {
                setQ('')
                setOn([])
              }}
              className="text-xs font-semibold text-moss hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* POSE GRID */}
        {list.length ? (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((p, index) => (
              <Reveal
                key={p.id}
                delay={index * 45}
              >
                <Link
                  to={`/library/${p.id}`}
                  className="group block overflow-hidden rounded-[24px] border border-line bg-paper transition duration-200 hover:-translate-y-1 hover:border-moss/40 hover:shadow-xl"
                >
                  {/* FIGURE */}
                  <div className="relative bg-[#F7F8F4] p-4">
                    <RefFigure pose={p} />

                    <div className="absolute left-7 top-7">
                      <DifficultyBadge
                        difficulty={
                          p.difficulty
                        }
                      />
                    </div>

                    <div className="absolute bottom-7 right-7 grid h-9 w-9 place-items-center rounded-xl bg-white/90 text-mute opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100">
                      <ArrowUpRight size={16} />
                    </div>
                  </div>

                  {/* INFO */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight transition group-hover:text-moss-dark">
                          {p.name}
                        </h2>

                        <p className="mt-1 text-xs text-mute">
                          {p.category.join(' · ')}
                        </p>
                      </div>

                      <ChevronRight
                        size={17}
                        className="mt-1 shrink-0 text-mute transition group-hover:translate-x-1 group-hover:text-moss"
                      />
                    </div>

                    <p className="mt-4 line-clamp-2 text-sm leading-5 text-mute">
                      {p.benefits}
                    </p>

                    <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                      <div className="text-xs text-mute">
                        <span className="font-medium text-ink">
                          Muscles
                        </span>{' '}
                        · {p.muscles}
                      </div>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState title="No poses match">
              Clear a filter or change your search.
            </EmptyState>
          </div>
        )}
      </div>
    </main>
  )
}

function AlertDot() {
  return (
    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber" />
  )
}