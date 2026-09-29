import { Link } from 'react-router-dom'
import { api, useApi } from '../lib/api.js'
import AnimatedNumber from '../components/AnimatedNumber.jsx'
import BackendDown from '../components/BackendDown.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { fmtTime, label } from '../lib/ui.js'
import Reveal from '../components/Reveal.jsx'

const avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1), pct = v => Math.round(v * 100)
const Bar = ({ name, v }) => <div><div className="flex justify-between text-sm"><span>{name}</span><span>{pct(v)}%</span></div>
  <div className="h-1.5 bg-line mt-1"><div className="h-full bg-moss transition-[width] duration-700" style={{ width: `${pct(v)}%` }} /></div></div>

export default function Dashboard() {
  const s = useApi(api.sessions), a = useApi(() => api.analytics(90))
  const hour = new Date().getHours(), hi = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const list = s.data || [], today = new Date().toISOString().slice(0, 10), todays = list.filter(x => x.date.startsWith(today))
  const latest = list[0], prev = list.slice(1, 4)
  let insight = null
  if (list.length >= 6) { const r = avg(list.slice(0, 3).map(x => x.avg_accuracy)), o = avg(list.slice(3, 6).map(x => x.avg_accuracy)), d = Math.round((r - o) * 100)
    insight = `Your last 3 sessions averaged ${pct(r)}% accuracy, ${d >= 0 ? 'up' : 'down'} ${Math.abs(d)} points from the 3 before.` }
  const top = a.data?.mistakes?.[0]
  return (
    <div className="p-4 md:p-10 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-4xl font-semibold tracking-tight">{hi}</h1><p className="text-mute mt-1">Ready for your practice?</p></div>
        <div className="flex gap-3"><Link to="/live" className="bg-moss text-white px-5 py-3 text-sm font-semibold hover:bg-moss-dark hover:-translate-y-0.5 hover:shadow-lg active:scale-95 transition-all">Start Live Session</Link>
          <Link to="/analyzer" className="border border-line px-5 py-3 text-sm font-semibold hover:bg-paper hover:-translate-y-0.5 active:scale-95 transition-all">Analyze a Pose</Link></div></div>
      {s.error ? <div className="mt-10"><BackendDown /></div> : s.loading ? <LoadingState text="Loading your sessions…" /> : !latest ? <p className="mt-10 text-mute">No sessions yet. Start a live session to build your history.</p> : <>
        {insight && <p className="mt-8 border-l-2 border-moss pl-4 text-lg max-w-3xl">{insight}{top && ` Your most frequent issue is ${top.joint.toLowerCase()} alignment.`}</p>}
        <div className="mt-10 grid lg:grid-cols-[1.2fr_1fr] gap-12">
          <section>
            <div className="text-sm text-mute">Latest session · form accuracy</div>
            <div className="text-8xl font-semibold tracking-tighter"><AnimatedNumber value={pct(latest.avg_accuracy)} /><span className="text-3xl text-mute">%</span></div>
            <LatestMetrics id={latest.id} />
            <h2 className="mt-10 font-semibold">Today</h2>
            {todays.length ? <dl className="mt-2 grid grid-cols-3 gap-4 text-sm"><div><dt className="text-mute">Practice</dt><dd className="text-xl font-semibold">{fmtTime(todays.reduce((t, x) => t + x.duration, 0))}</dd></div>
              <div><dt className="text-mute">Sessions</dt><dd className="text-xl font-semibold">{todays.length}</dd></div>
              <div><dt className="text-mute">Avg accuracy</dt><dd className="text-xl font-semibold">{pct(avg(todays.map(x => x.avg_accuracy)))}%</dd></div></dl>
              : <p className="mt-2 text-sm text-mute">No practice logged today.</p>}
          </section>
          <section>
            <h2 className="font-semibold">Most practiced poses</h2>
            <ul className="mt-2 divide-y divide-line">{(a.data?.poses || []).slice(0, 6).map(p => <Reveal as="li" key={p.name}><Link to="/library" className="flex justify-between py-2 text-sm hover:bg-paper row-hover transition-colors px-1"><span>{p.name}</span><span className="text-mute">{p.count} sessions</span></Link></Reveal>)}</ul>
          </section></div>
        <h2 className="mt-12 font-semibold">Recent sessions</h2>
        <table className="mt-2 w-full text-sm"><tbody className="divide-y divide-line border-y border-line">{list.slice(0, 5).map((x, i) => { const p = list[i + 1], d = p ? pct(x.avg_accuracy - p.avg_accuracy) : 0
          return <Reveal as="tr" key={x.id} className="hover:bg-paper row-hover transition-colors"><td className="py-3"><Link to={`/sessions/${x.id}`} className="font-medium hover:underline">{new Date(x.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Link></td>
            <td>{fmtTime(x.duration)}</td><td className="text-mute hidden md:table-cell">{x.poses.slice(0, 3).join(', ')}</td><td className="font-medium">{pct(x.avg_accuracy)}%</td>
            <td className={`text-right ${d > 0 ? 'text-moss-dark' : d < 0 ? 'text-clay' : 'text-mute'}`}>{d > 0 ? '▲' : d < 0 ? '▼' : '–'} {Math.abs(d)}</td></Reveal> })}</tbody></table>
        {list.some(x => x.sample) && <p className="mt-3 text-xs text-mute">Some sessions are sample data seeded for first run.</p>}
      </>}
    </div>)
}
function LatestMetrics({ id }) {
  const { data } = useApi(() => api.session(id), [id])
  if (!data) return null
  const m = data.metrics
  return <div className="mt-6 space-y-3 max-w-sm"><Bar name="Alignment" v={m.alignment} /><Bar name="Stability" v={m.stability} /><Bar name="Pose confidence" v={m.confidence} /></div>
}