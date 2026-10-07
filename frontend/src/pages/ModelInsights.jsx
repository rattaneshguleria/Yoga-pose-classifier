import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'

import {
  Cpu,
  Database,
  Layers3,
  ShieldCheck,
  Activity,
  BrainCircuit,
  Sparkles
} from 'lucide-react'

import { apiUrl, useApi } from '../lib/api.js'
import ConfusionMatrix from '../components/ConfusionMatrix.jsx'
import Pipeline from '../components/Pipeline.jsx'
import LoadingState from '../components/LoadingState.jsx'
import EmptyState from '../components/EmptyState.jsx'

const get = async () => {
  const r = await fetch(
    apiUrl('/api/model/metrics')
  )

  if (r.status === 404) {
    return {
      untrained: true
    }
  }

  if (!r.ok) {
    throw new Error(r.status)
  }

  return r.json()
}

const f = v =>
  v == null
    ? '—'
    : v.toFixed(3)

const pct = v =>
  v == null
    ? '—'
    : `${Math.round(v * 100)}%`

const ax = {
  tick: {
    fontSize: 10,
    fill: '#6B7177'
  },
  tickLine: false,
  axisLine: {
    stroke: '#DCDCD5'
  }
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon
}) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">

      <div className="grid h-10 w-10 place-items-center rounded-xl bg-moss-soft text-moss-dark">
        <Icon size={18} />
      </div>

      <div className="mt-5 text-xs uppercase tracking-wider text-mute">
        {title}
      </div>

      <div className="mt-1 text-3xl font-semibold tracking-tight">
        {value}
      </div>

      {description && (
        <p className="mt-1 text-xs text-mute">
          {description}
        </p>
      )}

    </div>
  )
}

function Section({
  icon: Icon,
  title,
  description,
  children
}) {
  return (
    <section className="mt-6 rounded-2xl border border-line bg-paper p-5 md:p-6">

      <div className="flex items-start gap-3">

        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bone text-moss-dark">
          <Icon size={17} />
        </div>

        <div>
          <h2 className="font-semibold">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-xs leading-5 text-mute">
              {description}
            </p>
          )}
        </div>

      </div>

      <div className="mt-5">
        {children}
      </div>

    </section>
  )
}

export default function ModelInsights() {

  const {
    data: m,
    error,
    loading
  } = useApi(get)

  return (
    <div className="min-h-screen bg-bone">

      <div className="mx-auto max-w-7xl p-4 md:p-8">

        {/* Header */}

        <header>

          <div className="flex items-center gap-2 text-sm font-medium text-moss-dark">
            <BrainCircuit size={15} />
            Computer vision model
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Model insights.
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">
            Technical evaluation of the pose classification
            system powering YogaVision.
          </p>

        </header>


        {/* Pipeline */}

        <Section
          icon={Layers3}
          title="System pipeline"
          description="The stages involved in turning movement into pose feedback."
        >
          <div className="overflow-x-auto">
            <Pipeline />
          </div>
        </Section>


        {/* Evaluation */}

        <Section
          icon={Activity}
          title="Model evaluation"
          description="Performance metrics returned by the trained model."
        >

          {loading ? (

            <LoadingState text="Loading model metrics…" />

          ) : error ? (

            <EmptyState title="Backend not reachable">
              Start the API to load model evaluation
              results.
            </EmptyState>

          ) : m?.untrained ? (

            <EmptyState title="Model metrics unavailable">
              No trained-model metrics were returned
              by the existing API.
            </EmptyState>

          ) : (

            <Metrics m={m} />

          )}

        </Section>

      </div>

    </div>
  )
}


function Metrics({ m }) {

  const acc =
    m.confusion.map(
      (row, i) => ({
        name:
          m.classes[i],
        acc:
          row[i] /
          (
            row.reduce(
              (a, b) =>
                a + b,
              0
            ) || 1
          )
      })
    )

  const hist =
    m.confidence_hist.bins
      .slice(0, -1)
      .map(
        (b, i) => ({
          bin:
            b.toFixed(2),
          n:
            m.confidence_hist
              .counts[i]
        })
      )

  return (
    <>

      {/* Main metrics */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <MetricCard
          icon={Activity}
          title="Test accuracy"
          value={pct(
            m.test_accuracy
          )}
          description="Held-out test set"
        />

        <MetricCard
          icon={ShieldCheck}
          title="Precision"
          value={f(
            m.macro.precision
          )}
          description="Macro averaged"
        />

        <MetricCard
          icon={TargetIcon}
          title="Recall"
          value={f(
            m.macro.recall
          )}
          description="Macro averaged"
        />

        <MetricCard
          icon={Sparkles}
          title="F1 score"
          value={f(
            m.macro.f1
          )}
          description="Macro averaged"
        />

      </div>


      {/* Training summary */}

      <div className="mt-5 overflow-x-auto rounded-xl border border-line">

        <table className="w-full min-w-[680px] text-sm">

          <thead className="bg-bone text-left text-xs uppercase tracking-wider text-mute">

            <tr>

              {[
                'Train accuracy',
                'Validation accuracy',
                'Test accuracy',
                'Precision',
                'Recall',
                'F1',
                'Classes'
              ].map(
                h => (
                  <th
                    key={h}
                    className="px-4 py-3 font-medium"
                  >
                    {h}
                  </th>
                )
              )}

            </tr>

          </thead>

          <tbody>

            <tr className="divide-x divide-line">

              <td className="px-4 py-4 font-semibold">
                {pct(
                  m.train_accuracy
                )}
              </td>

              <td className="px-4 py-4 font-semibold">
                {pct(
                  m.val_accuracy
                )}
              </td>

              <td className="px-4 py-4 font-semibold">
                {pct(
                  m.test_accuracy
                )}
              </td>

              <td className="px-4 py-4">
                {f(
                  m.macro.precision
                )}
              </td>

              <td className="px-4 py-4">
                {f(
                  m.macro.recall
                )}
              </td>

              <td className="px-4 py-4">
                {f(
                  m.macro.f1
                )}
              </td>

              <td className="px-4 py-4">
                {m.classes.length}
              </td>

            </tr>

          </tbody>

        </table>

      </div>


      <p className="mt-2 text-xs text-mute">
        Precision, recall and F1 are macro-averaged
        on the held-out test set.
      </p>


      {/* Architecture + Dataset */}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">

        <div className="rounded-2xl border border-line bg-paper p-5">

          <div className="flex items-center gap-2 text-sm font-semibold">
            <Cpu
              size={16}
              className="text-moss-dark"
            />
            Architecture
          </div>

          <div className="mt-4 divide-y divide-line">

            {m.architecture.map(
              (layer, i) => (

                <div
                  key={i}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >

                  <span className="text-sm font-medium">
                    {layer.layer}
                  </span>

                  <span className="text-xs text-mute">
                    {layer.detail}
                  </span>

                </div>

              )
            )}

          </div>

        </div>


        <div className="rounded-2xl border border-line bg-paper p-5">

          <div className="flex items-center gap-2 text-sm font-semibold">
            <Database
              size={16}
              className="text-moss-dark"
            />
            Dataset
          </div>

          <dl className="mt-4 divide-y divide-line">

            {[
              [
                'Name',
                m.dataset.name
              ],
              [
                'Licence',
                m.dataset.licence
              ],
              [
                'Samples',
                m.dataset.samples
              ],
              [
                'Train / val / test',
                `${m.dataset.train} / ${m.dataset.val} / ${m.dataset.test}`
              ]
            ].map(
              ([key, value]) => (

                <div
                  key={key}
                  className="flex items-center justify-between gap-5 py-3"
                >

                  <dt className="text-sm text-mute">
                    {key}
                  </dt>

                  <dd className="text-right text-sm font-medium">
                    {value}
                  </dd>

                </div>

              )
            )}

          </dl>

        </div>

      </div>


      {/* Confusion matrix */}

      <div className="mt-6 rounded-2xl border border-line bg-paper p-5 md:p-6">

        <h2 className="text-sm font-semibold">
          Confusion matrix
        </h2>

        <p className="mt-1 text-xs text-mute">
          Predicted classes compared with the actual
          test-set labels.
        </p>

        <div className="mt-5 overflow-x-auto">
          <ConfusionMatrix
            classes={m.classes}
            matrix={m.confusion}
          />
        </div>

      </div>


      {/* Classification report */}

      <div className="mt-6 rounded-2xl border border-line bg-paper p-5 md:p-6">

        <h2 className="text-sm font-semibold">
          Classification report
        </h2>

        <p className="mt-1 text-xs text-mute">
          Per-class precision, recall, F1 and support.
        </p>

        <div className="mt-5 overflow-x-auto">

          <table className="w-full min-w-[620px] text-sm">

            <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-mute">

              <tr>

                <th className="pb-3 font-medium">
                  Class
                </th>

                <th className="pb-3 font-medium">
                  Precision
                </th>

                <th className="pb-3 font-medium">
                  Recall
                </th>

                <th className="pb-3 font-medium">
                  F1
                </th>

                <th className="pb-3 font-medium">
                  Support
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-line">

              {m.classes.map(
                c => {

                  const r =
                    m.report[c]

                  return (
                    <tr
                      key={c}
                      className="hover:bg-bone"
                    >

                      <td className="py-3 font-medium">
                        {c}
                      </td>

                      <td>
                        {f(
                          r.precision
                        )}
                      </td>

                      <td>
                        {f(
                          r.recall
                        )}
                      </td>

                      <td>
                        {f(
                          r.f1
                        )}
                      </td>

                      <td>
                        {r.support}
                      </td>

                    </tr>
                  )
                }
              )}

            </tbody>

          </table>

        </div>

      </div>


      {/* Charts */}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">

        <div className="rounded-2xl border border-line bg-paper p-5">

          <h2 className="text-sm font-semibold">
            Per-class accuracy
          </h2>

          <p className="mt-1 text-xs text-mute">
            Accuracy calculated from the confusion matrix.
          </p>

          <div className="mt-5 h-72">

            <ResponsiveContainer>
              <BarChart
                data={acc}
                layout="vertical"
                margin={{
                  left: 10,
                  right: 20
                }}
              >

                <CartesianGrid
                  stroke="#ECECE6"
                  horizontal={false}
                />

                <XAxis
                  type="number"
                  domain={[
                    0,
                    1
                  ]}
                  tickFormatter={
                    v =>
                      `${Math.round(
                        v * 100
                      )}%`
                  }
                  {...ax}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={105}
                  {...ax}
                />

                <Tooltip
                  formatter={
                    v =>
                      `${Math.round(
                        v * 100
                      )}%`
                  }
                />

                <Bar
                  dataKey="acc"
                  fill="#4F7458"
                  radius={[
                    0,
                    5,
                    5,
                    0
                  ]}
                />

              </BarChart>
            </ResponsiveContainer>

          </div>

        </div>


        <div className="rounded-2xl border border-line bg-paper p-5">

          <h2 className="text-sm font-semibold">
            Confidence distribution
          </h2>

          <p className="mt-1 text-xs text-mute">
            Distribution of model confidence scores.
          </p>

          <div className="mt-5 h-72">

            <ResponsiveContainer>
              <BarChart
                data={hist}
              >

                <CartesianGrid
                  stroke="#ECECE6"
                  vertical={false}
                />

                <XAxis
                  dataKey="bin"
                  {...ax}
                />

                <YAxis
                  {...ax}
                />

                <Tooltip />

                <Bar
                  dataKey="n"
                  fill="#22262A"
                  radius={[
                    5,
                    5,
                    0,
                    0
                  ]}
                />

              </BarChart>
            </ResponsiveContainer>

          </div>

        </div>

      </div>

    </>

  )
}


/*
 * Reuse the same icon-card system above while
 * keeping the actual metric data unchanged.
 */
function TargetIcon(props) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <circle
        cx="12"
        cy="12"
        r="5"
      />
      <circle
        cx="12"
        cy="12"
        r="1"
      />
    </svg>
  )
}