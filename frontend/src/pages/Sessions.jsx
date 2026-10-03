import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, LogIn } from 'lucide-react'
import { api, getAuthState, useApi } from '../lib/api.js'
import BackendDown from '../components/BackendDown.jsx'
import LoadingState from '../components/LoadingState.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { fmtTime, label } from '../lib/ui.js'
import Reveal from '../components/Reveal.jsx'
const pct = v => Math.round(v * 100) + '%', when = d => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export function SessionDetail() {
  const { id } = useParams(), { data: s, error, loading } = useApi(() => api.session(id), [id])
  if (error) return <div className="p-8"><BackendDown /></div>
  if (loading || !s) return <div className="p-8"><LoadingState text="Loading session…" /></div>
  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link to="/sessions" className="inline-flex items-center gap-1 text-sm text-mute hover:text-ink"><ArrowLeft size={14} />Sessions</Link>
      <h1 className="text-2xl font-semibold mt-3">{when(s.date)} {s.sample ? <span className="text-xs font-normal text-mute">sample data</span> : null}</h1>
      <p className="text-sm text-mute">{fmtTime(s.duration)} · average accuracy {pct(s.avg_accuracy)}</p>
      <h2 className="mt-8 font-semibold">Poses</h2>
      <table className="w-full text-sm mt-2"><thead className="text-left text-mute"><tr><th className="py-1 font-normal">Pose</th><th className="font-normal">Time</th><th className="font-normal">Accuracy</th><th className="font-normal">Confidence</th></tr></thead>
        <tbody className="divide-y divide-line">{s.poses.map(p => <tr key={p.name}><td className="py-2">{p.name}</td><td>{fmtTime(p.seconds)}</td><td>{pct(p.accuracy)}</td><td>{pct(p.confidence)}</td></tr>)}</tbody></table>
      <h2 className="mt-8 font-semibold">Joint alignment (time within target range)</h2>
      <ul className="mt-2 space-y-3 max-w-md">{Object.entries(s.joints).sort((a, b) => a[1] - b[1]).map(([j, v]) => <li key={j}>
        <div className="flex justify-between text-sm"><span>{label(j)}</span><span>{pct(v)}</span></div>
        <div className="h-1.5 bg-line mt-1"><div className={`h-full ${v > .85 ? 'bg-moss' : v > .7 ? 'bg-amber' : 'bg-clay'}`} style={{ width: pct(v) }} /></div></li>)}</ul>
    </div>)
}
export default function Sessions() {
  const auth = getAuthState()
  const { data, error, loading } = useApi(api.sessions, [auth?.token])

  if (!auth) {
    return (
      <div className="p-4 md:p-8 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
        <div className="mt-6 rounded border border-line bg-paper p-6 text-sm text-mute">
          <p className="mb-3">Log in to view and manage your saved analysis history.</p>
          <Link to="/login" className="inline-flex items-center gap-2 rounded bg-moss px-4 py-2 font-medium text-white hover:bg-moss-dark">
            <LogIn size={16} />Log in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
      {error ? <div className="mt-6"><BackendDown /></div> : loading ? <LoadingState text="Loading sessions…" /> : !data.length ? <div className="mt-6"><EmptyState title="No sessions yet">Finish a Live Coach session and choose Save session.</EmptyState></div> :
        <div className="overflow-x-auto"><table className="mt-4 w-full text-sm min-w-[640px]"><thead className="text-left text-mute"><tr>{['Date', 'Duration', 'Poses', 'Accuracy', 'Common error'].map(h => <th key={h} className="py-2 font-normal">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line border-y border-line">{data.map(s => <Reveal as="tr" key={s.id} className="hover:bg-paper row-hover transition-colors">
            <td className="py-3"><Link to={`/sessions/${s.id}`} className="font-medium hover:underline">{when(s.date)}</Link>{s.sample ? <span className="ml-2 text-xs text-mute">sample</span> : null}</td>
            <td>{fmtTime(s.duration)}</td><td className="text-mute">{s.poses.slice(0, 3).join(', ')}{s.poses.length > 3 ? ` +${s.poses.length - 3}` : ''}</td>
            <td className="font-medium">{pct(s.avg_accuracy)}</td><td>{s.common_error}</td></Reveal>)}</tbody></table></div>}
    </div>)
}