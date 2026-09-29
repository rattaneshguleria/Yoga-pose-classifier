import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Search, ArrowLeft } from 'lucide-react'
import { POSES } from '../lib/analysis.js'
import { BONES } from '../components/PoseSkeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Reveal from '../components/Reveal.jsx'

const FILTERS = ['Standing', 'Balance', 'Seated', 'Strength', 'Flexibility', 'Beginner', 'Intermediate', 'Advanced']
const IDX = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
export function RefFigure({ pose }) {
  if (!pose.ref) return <div className="aspect-square bg-paper border border-line grid place-items-center text-xs text-mute p-4 text-center">Reference skeleton not authored yet for this pose.</div>
  const full = {}; IDX.forEach((i, k) => { full[i] = pose.ref[k] })
  return <svg viewBox="0 0 100 100" className="w-full bg-paper border border-line" role="img" aria-label={`${pose.name} reference skeleton`}>
    {BONES.map(([a, b]) => <line key={a + b} x1={full[a][0] * 100} y1={full[a][1] * 100} x2={full[b][0] * 100} y2={full[b][1] * 100} stroke="#4F7458" strokeWidth="1.6" strokeLinecap="round" />)}
    {IDX.map(i => <circle key={i} cx={full[i][0] * 100} cy={full[i][1] * 100} r="1.4" fill="#22262A" />)}</svg>
}
export default function PoseLibrary() {
  const { id } = useParams(), nav = useNavigate()
  const [q, setQ] = useState(''), [on, setOn] = useState([])
  const pose = POSES.find(p => p.id === id)
  if (id && pose) return (
    <div className="p-4 md:p-8 max-w-5xl">
      <Link to="/library" className="inline-flex items-center gap-1 text-sm text-mute hover:text-ink"><ArrowLeft size={14} />Pose library</Link>
      <div className="mt-4 grid md:grid-cols-[260px_1fr] gap-8">
        <div><RefFigure pose={pose} />
          <button onClick={() => nav(`/live?pose=${encodeURIComponent(pose.name)}`)} className="press mt-4 w-full bg-moss text-white py-2.5 text-sm font-semibold hover:bg-moss-dark hover:-translate-y-0.5 hover:shadow-lg transition-all">Practice this pose</button></div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{pose.name}</h1>
          <p className="text-sm text-mute mt-1">{pose.difficulty} · {pose.category.join(', ')}</p>
          <p className="mt-4">{pose.benefits}</p><p className="mt-2 text-sm"><span className="font-medium">Target muscles:</span> {pose.muscles}</p>
          <h2 className="mt-6 font-semibold">Steps</h2><ol className="mt-2 list-decimal pl-5 space-y-1 text-sm">{pose.steps.map(s => <li key={s}>{s}</li>)}</ol>
          <h2 className="mt-6 font-semibold">Correct joint angles</h2>
          <table className="mt-2 text-sm w-full max-w-md"><tbody className="divide-y divide-line">{Object.entries(pose.rules).map(([j, [lo, hi]]) =>
            <tr key={j}><td className="py-1.5 capitalize">{j.replace('_', ' ')}</td><td className="text-right">{lo}–{hi}°</td></tr>)}</tbody></table>
          <p className="text-xs text-mute mt-1">Starting values; tune them against real practitioners.</p>
          <h2 className="mt-6 font-semibold">Common mistakes</h2><ul className="mt-2 list-disc pl-5 space-y-1 text-sm">{pose.mistakes.map(s => <li key={s}>{s}</li>)}</ul>
        </div></div></div>)
  const list = POSES.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) && on.every(f => [...p.category, p.difficulty].includes(f)))
  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">Pose library</h1>
      <div className="relative mt-4 max-w-sm"><Search size={14} className="absolute left-3 top-3 text-mute" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search poses" aria-label="Search poses" className="w-full border border-line bg-paper pl-9 pr-3 py-2 text-sm" /></div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filters">{FILTERS.map(f => <button key={f} aria-pressed={on.includes(f)} onClick={() => setOn(o => o.includes(f) ? o.filter(x => x !== f) : [...o, f])}
        className={`press px-3 py-1 text-sm border transition-colors ${on.includes(f) ? 'bg-ink text-bone border-ink scale-105' : 'border-line hover:bg-paper hover:-translate-y-0.5'}`}>{f}</button>)}</div>
      <div className="mt-6 divide-y divide-line border-y border-line">
        {list.map(p => <Reveal key={p.id}><Link to={`/library/${p.id}`} className="group flex items-center gap-4 py-3 px-1 hover:bg-paper row-hover transition-colors">
          <div className="w-14 shrink-0 transition-transform group-hover:scale-110"><RefFigure pose={p} /></div>
          <div className="flex-1"><div className="font-semibold group-hover:text-moss-dark transition-colors">{p.name}</div><div className="text-sm text-mute">{p.muscles}</div></div>
          <div className="text-sm text-mute text-right"><div>{p.difficulty}</div><div>{p.category[0]}</div></div></Link></Reveal>)}</div>
      {!list.length && <div className="mt-6"><EmptyState title="No poses match">Clear a filter or change your search.</EmptyState></div>}
    </div>)
}