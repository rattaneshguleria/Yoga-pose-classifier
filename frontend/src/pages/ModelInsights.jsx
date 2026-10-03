import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { apiUrl, useApi } from '../lib/api.js'
import ConfusionMatrix from '../components/ConfusionMatrix.jsx'
import Pipeline from '../components/Pipeline.jsx'
import LoadingState from '../components/LoadingState.jsx'
import EmptyState from '../components/EmptyState.jsx'
const get = async () => { const r = await fetch(apiUrl('/api/model/metrics')); if (r.status === 404) return { untrained: true }; if (!r.ok) throw new Error(r.status); return r.json() }
const f = v => v == null ? '–' : v.toFixed(3), ax = { tick: { fontSize: 10, fill: '#6B7177' }, tickLine: false, axisLine: { stroke: '#DCDCD5' } }
const H = ({ children }) => <h2 className="mt-10 mb-2 text-xs font-mono uppercase tracking-wide text-mute border-b border-ink pb-1">{children}</h2>

export default function ModelInsights() {
  const { data: m, error, loading } = useApi(get)
  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">Model insights</h1>
      <H>System pipeline</H><Pipeline />
      <H>Evaluation</H>
      {loading ? <LoadingState text="Loading metrics…" /> : error ? <EmptyState title="Backend not reachable">Start the API to load evaluation results.</EmptyState>
        : m.untrained ? <EmptyState title="Model not trained yet">Run <code>ml/train.py</code> (phase 6). It writes <code>backend/models/metrics.json</code>, and every number here is read from that file. Nothing is shown until it exists.</EmptyState> : <Metrics m={m} />}
    </div>)
}
function Metrics({ m }) {
  const acc = m.confusion.map((r, i) => ({ name: m.classes[i], acc: r[i] / (r.reduce((a, b) => a + b, 0) || 1) }))
  const hist = m.confidence_hist.bins.slice(0, -1).map((b, i) => ({ bin: b.toFixed(2), n: m.confidence_hist.counts[i] }))
  return <>
    <table className="w-full text-sm font-mono border-y border-line"><tbody className="divide-x divide-line">
      <tr className="text-mute text-xs">{['Train acc', 'Val acc', 'Test acc', 'Precision', 'Recall', 'F1', 'Classes'].map(h => <td key={h} className="px-3 pt-2">{h}</td>)}</tr>
      <tr className="text-xl">{[m.train_accuracy, m.val_accuracy, m.test_accuracy, m.macro.precision, m.macro.recall, m.macro.f1].map((v, i) => <td key={i} className="px-3 pb-2">{f(v)}</td>)}<td className="px-3 pb-2">{m.classes.length}</td></tr></tbody></table>
    <p className="mt-1 text-xs text-mute">Precision, recall and F1 are macro-averaged on the held-out test set.</p>
    <div className="mt-8 grid md:grid-cols-2 gap-10">
      <div><H>Architecture</H><ol className="text-sm font-mono divide-y divide-line">{m.architecture.map((l, i) => <li key={i} className="flex justify-between py-1.5"><span>{l.layer}</span><span className="text-mute">{l.detail}</span></li>)}</ol></div>
      <div><H>Dataset</H><dl className="text-sm font-mono divide-y divide-line">{[['Name', m.dataset.name], ['Licence', m.dataset.licence], ['Samples', m.dataset.samples], ['Train / val / test', `${m.dataset.train} / ${m.dataset.val} / ${m.dataset.test}`]].map(([k, v]) => <div key={k} className="flex justify-between py-1.5"><dt className="text-mute">{k}</dt><dd>{v}</dd></div>)}</dl></div></div>
    <H>Confusion matrix</H><ConfusionMatrix classes={m.classes} matrix={m.confusion} />
    <H>Classification report</H>
    <div className="overflow-x-auto"><table className="w-full text-sm font-mono min-w-[480px]"><thead className="text-left text-mute text-xs"><tr><th className="py-1 font-normal">Class</th><th className="font-normal">Precision</th><th className="font-normal">Recall</th><th className="font-normal">F1</th><th className="font-normal">Support</th></tr></thead>
      <tbody className="divide-y divide-line">{m.classes.map(c => { const r = m.report[c]; return <tr key={c}><td className="py-1.5 font-sans">{c}</td><td>{f(r.precision)}</td><td>{f(r.recall)}</td><td>{f(r.f1)}</td><td>{r.support}</td></tr> })}</tbody></table></div>
    <div className="mt-2 grid md:grid-cols-2 gap-10">
      <div><H>Per-class accuracy</H><div className="h-64"><ResponsiveContainer><BarChart data={acc} layout="vertical"><CartesianGrid stroke="#ECECE6" horizontal={false} /><XAxis type="number" domain={[0, 1]} {...ax} /><YAxis type="category" dataKey="name" width={100} {...ax} /><Tooltip formatter={v => v.toFixed(3)} /><Bar dataKey="acc" fill="#4F7458" /></BarChart></ResponsiveContainer></div></div>
      <div><H>Confidence distribution</H><div className="h-64"><ResponsiveContainer><BarChart data={hist}><CartesianGrid stroke="#ECECE6" vertical={false} /><XAxis dataKey="bin" {...ax} /><YAxis {...ax} /><Tooltip /><Bar dataKey="n" fill="#22262A" /></BarChart></ResponsiveContainer></div></div></div>
  </>
}
