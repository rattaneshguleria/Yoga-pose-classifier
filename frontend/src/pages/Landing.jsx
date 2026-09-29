import { useState } from 'react'
import { Link } from 'react-router-dom'
import { POSES } from '../lib/analysis.js'
import { BONES } from '../components/PoseSkeleton.jsx'
import Pipeline from '../components/Pipeline.jsx'
import Reveal from '../components/Reveal.jsx'
const IDX = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
const W2 = POSES.find(p => p.id === 'warrior-ii').ref, P = {}; IDX.forEach((i, k) => { P[i] = W2[k] })
// Hero = the product's real output: skeleton plus joint measurements, drawn from the Warrior II reference.
const CALL = { 25: ['Left knee', '92°', 'target 85–110°', 'ok'], 26: ['Right knee', '172°', 'target 165–180°', 'ok'], 13: ['Left elbow', '158°', 'target 165–180°', 'warn'] }
export default function Landing() {
  const [on, setOn] = useState(13)
  return (
    <div className="min-h-screen bg-bone">
      <header className="flex items-center justify-between px-6 md:px-12 py-5"><span className="font-bold tracking-tight">YOGAVISION</span>
        <nav className="flex gap-6 text-sm"><a href="#how" className="hover:underline">How it works</a><a href="#poses" className="hover:underline">Poses</a><a href="#tech" className="hover:underline">Architecture</a><a href="#privacy" className="hover:underline">Privacy</a></nav></header>
      <section className="px-6 md:px-12 pt-8 pb-20 grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
        <div><h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">Computer Vision for Better Yoga Form.</h1>
          <p className="mt-5 text-lg text-mute max-w-md">Analyze your posture, detect alignment errors and improve your practice with real-time pose intelligence.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link to="/live" className="press bg-moss text-white px-6 py-3 font-semibold hover:bg-moss-dark hover:-translate-y-0.5 hover:shadow-lg transition-all">Start Live Analysis</Link>
            <Link to="/library" className="press border border-ink px-6 py-3 font-semibold hover:bg-ink hover:text-bone hover:-translate-y-0.5 transition-all">Explore Pose Library</Link></div></div>
        <div className="relative bg-ink aspect-square float-slow"><svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" role="img" aria-label="Warrior II skeleton with joint measurements">
          {BONES.map(([a, b]) => <line key={a + b} x1={P[a][0] * 100} y1={P[a][1] * 100} x2={P[b][0] * 100} y2={P[b][1] * 100} stroke="#F5F5F1" strokeOpacity=".85" strokeWidth="1" strokeLinecap="round" />)}
          {IDX.map(i => CALL[i] ? <g key={i} tabIndex={0} onMouseEnter={() => setOn(i)} onFocus={() => setOn(i)} style={{ cursor: 'pointer' }}>
            <circle cx={P[i][0] * 100} cy={P[i][1] * 100} r={on === i ? 4 : 3} fill={CALL[i][3] === 'warn' ? '#E0A63A' : '#6FA57B'} fillOpacity=".3" style={{ transition: 'r .15s' }} className={i === on ? 'live-dot' : ''} /><circle cx={P[i][0] * 100} cy={P[i][1] * 100} r="1.5" fill={CALL[i][3] === 'warn' ? '#E0A63A' : '#6FA57B'} /></g>
            : <circle key={i} cx={P[i][0] * 100} cy={P[i][1] * 100} r="1.1" fill="#F5F5F1" />)}</svg>
          <div className="absolute left-3 bottom-3 right-3 bg-ink/90 text-bone p-3 text-sm" aria-live="polite"><div className="text-xs text-bone/60">Example measurement</div><div className="font-semibold">{CALL[on][0]} {CALL[on][1]}</div><div className="text-bone/70">{CALL[on][2]}</div></div></div></section>
      <section id="how" className="bg-paper border-y border-line px-6 md:px-12 py-16"><div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">
        {[['Pose detection', 'MediaPipe finds 33 body landmarks on every frame from your camera, a photo or a recorded video.'], ['Real-time feedback', 'Joint angles are measured against each pose\u2019s target range, and every miss becomes a specific correction.'], ['Progress tracking', 'Save a session to see accuracy, time in range per joint and your most frequent mistakes over weeks.']].map(([t, d]) =>
          <Reveal key={t}><h2 className="text-xl font-semibold">{t}</h2><p className="mt-2 text-mute">{d}</p></Reveal>)}</div></section>
      <section id="poses" className="px-6 md:px-12 py-16 max-w-6xl mx-auto"><h2 className="text-3xl font-semibold tracking-tight">Supported poses</h2>
        <ul className="mt-6 grid sm:grid-cols-2 md:grid-cols-4 gap-x-8 divide-y sm:divide-y-0">{POSES.map(p => <Reveal as="li" key={p.id} className="border-t border-line"><Link to={`/library/${p.id}`} className="block py-3 hover:bg-paper hover:translate-x-1 transition-all"><div className="font-medium">{p.name}</div><div className="text-sm text-mute">{p.difficulty}</div></Link></Reveal>)}</ul></section>
      <section id="tech" className="px-6 md:px-12 py-16 bg-paper border-y border-line"><div className="max-w-6xl mx-auto"><h2 className="text-3xl font-semibold tracking-tight mb-8">Technical architecture</h2><Pipeline /></div></section>
      <section id="privacy" className="px-6 md:px-12 py-16 max-w-3xl mx-auto"><h2 className="text-3xl font-semibold tracking-tight">Privacy</h2>
        <p className="mt-4 text-mute leading-relaxed">Pose detection runs in your browser, so camera frames and uploaded images are not sent to a server. Nothing is stored unless you choose Save session, which stores scores and joint statistics, never video.</p></section>
      <section className="px-6 md:px-12 py-16 text-center border-t border-line"><h2 className="text-3xl font-semibold tracking-tight">Check your form now</h2>
        <Link to="/live" className="press inline-block mt-6 bg-moss text-white px-6 py-3 font-semibold hover:bg-moss-dark hover:-translate-y-0.5 hover:shadow-lg transition-all">Start Live Analysis</Link></section>
    </div>)
}