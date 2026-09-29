import { useState } from 'react'
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { api, useApi } from '../lib/api.js'
import BackendDown from '../components/BackendDown.jsx'
import LoadingState from '../components/LoadingState.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Reveal from '../components/Reveal.jsx'
const ax = { tick: { fontSize: 11, fill: '#6B7177' }, axisLine: { stroke: '#DCDCD5' }, tickLine: false }
const Box = ({ title, children }) => <section><h2 className="text-sm font-semibold mb-2">{title}</h2><div className="h-52">{children}</div></section>
export function firstLast(series, key) { const v = series.map(s => s[key]).filter(x => x != null); return v.length > 1 ? [v[0], v[v.length - 1]] : null }

export default function Progress() {
  const [days, setDays] = useState(30), { data, error, loading } = useApi(() => api.analytics(days), [days])
  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
        <div role="group" aria-label="Range" className="flex border border-line">{[7, 30, 90].map(d => <button key={d} aria-pressed={days === d} onClick={() => setDays(d)} className={`press px-3 py-1.5 text-sm transition-colors ${days === d ? 'bg-ink text-bone' : 'hover:bg-paper'}`}>{d} days</button>)}</div></div>
      {error ? <div className="mt-6"><BackendDown /></div> : loading && !data ? <LoadingState text="Loading analytics…" /> : !data.series.length ? <div className="mt-6"><EmptyState title="No sessions in this range">Practice in Live Coach, or pick a longer range.</EmptyState></div> : <>
        {(() => { const a = firstLast(data.series, 'accuracy'), top = data.mistakes[0]
          return <p className="mt-4 text-sm border-l-2 border-moss pl-3">{a && `Average form accuracy moved from ${Math.round(a[0] * 100)}% to ${Math.round(a[1] * 100)}% across ${data.series.length} sessions.`}{top && ` Most frequent issue: ${top.joint.toLowerCase()} alignment.`}</p> })()}
        <div className="mt-8 grid lg:grid-cols-2 gap-x-10 gap-y-8">
          <Reveal><Box title="Form accuracy"><ResponsiveContainer><LineChart data={data.series}><CartesianGrid stroke="#ECECE6" vertical={false} /><XAxis dataKey="date" {...ax} /><YAxis domain={[0.4, 1]} tickFormatter={v => Math.round(v * 100) + '%'} {...ax} /><Tooltip formatter={v => Math.round(v * 100) + '%'} /><Line dataKey="accuracy" stroke="#4F7458" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></Box></Reveal>
          <Reveal><Box title="Session duration (minutes)"><ResponsiveContainer><BarChart data={data.series}><CartesianGrid stroke="#ECECE6" vertical={false} /><XAxis dataKey="date" {...ax} /><YAxis {...ax} /><Tooltip /><Bar dataKey="duration" fill="#8AA58F" /></BarChart></ResponsiveContainer></Box></Reveal>
          <Reveal><Box title="Pose confidence"><ResponsiveContainer><LineChart data={data.series}><CartesianGrid stroke="#ECECE6" vertical={false} /><XAxis dataKey="date" {...ax} /><YAxis domain={[0.7, 1]} tickFormatter={v => Math.round(v * 100) + '%'} {...ax} /><Tooltip formatter={v => Math.round(v * 100) + '%'} /><Line dataKey="confidence" stroke="#22262A" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></Box></Reveal>
          <Reveal><Box title="Joint alignment trends"><ResponsiveContainer><LineChart data={data.series}><CartesianGrid stroke="#ECECE6" vertical={false} /><XAxis dataKey="date" {...ax} /><YAxis domain={[0.4, 1]} tickFormatter={v => Math.round(v * 100) + '%'} {...ax} /><Tooltip formatter={v => Math.round(v * 100) + '%'} /><Legend iconType="plainline" wrapperStyle={{ fontSize: 11 }} />
            <Line dataKey="left_knee" name="Left knee" stroke="#A6462E" dot={false} strokeWidth={2} /><Line dataKey="spine" name="Spine" stroke="#B7791F" dot={false} strokeWidth={2} /><Line dataKey="shoulders" name="Shoulders" stroke="#4F7458" dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer></Box></Reveal>
          <Reveal><Box title="Most practiced poses (sessions)"><ResponsiveContainer><BarChart data={data.poses} layout="vertical"><XAxis type="number" {...ax} /><YAxis type="category" dataKey="name" width={100} {...ax} /><Tooltip /><Bar dataKey="count" fill="#4F7458" /></BarChart></ResponsiveContainer></Box></Reveal>
          <Reveal><Box title="Common mistakes (weighted by time out of range)"><ResponsiveContainer><BarChart data={data.mistakes} layout="vertical"><XAxis type="number" hide /><YAxis type="category" dataKey="joint" width={100} {...ax} /><Tooltip /><Bar dataKey="score" fill="#B7791F" /></BarChart></ResponsiveContainer></Box></Reveal>
        </div></>}
    </div>)
}