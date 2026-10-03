import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Video, ScanLine, Film, BookOpen, TrendingUp, History, Cpu, Settings, Camera, LogOut, LogIn } from 'lucide-react'
import { api, clearAuthState, getAuthState } from '../lib/api.js'
const NAV = [
  ['/', 'Dashboard', LayoutDashboard], ['/live', 'Live Coach', Video], ['/analyzer', 'Pose Analyzer', ScanLine],
  ['/video', 'Video Analysis', Film], ['/library', 'Pose Library', BookOpen], ['/progress', 'Progress', TrendingUp],
  ['/sessions', 'Sessions', History], ['/model', 'Model Insights', Cpu], ['/settings', 'Settings', Settings],
]
const link = ({ isActive }) => `flex items-center gap-3 px-3 py-2 text-sm border-l-2 transition-all duration-200 ${isActive ? 'border-moss bg-moss-soft font-semibold text-moss-dark translate-x-0' : 'border-transparent text-mute hover:text-ink hover:bg-paper hover:translate-x-1'}`
export default function Shell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const auth = getAuthState()
  const logout = async () => {
    try { await api.auth.logout() } catch {}
    clearAuthState()
    navigate('/login')
  }
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex md:w-60 shrink-0 flex-col border-r border-line bg-paper sticky top-0 h-screen">
        <div className="px-5 py-6"><NavLink to="/welcome" className="font-bold tracking-tight text-lg hover:text-moss-dark transition-colors inline-block hover:-translate-y-px" style={{ transition: "transform .15s ease, color .15s ease" }}>YOGAVISION</NavLink>
          <div className="text-xs text-mute">Intelligent Yoga Analysis</div></div>
        <nav className="flex-1" aria-label="Main">{NAV.map(([to, label, Icon]) =>
          <NavLink key={to} to={to} end={to === '/'} className={link}><Icon size={16} />{label}</NavLink>)}</nav>
        <div className="border-t border-line p-4 text-xs text-mute space-y-2">
          <div className="text-ink font-medium">Your profile</div>
          {auth ? (
            <>
              <div className="text-ink font-medium">{auth.user.username}</div>
              <button onClick={logout} className="inline-flex items-center gap-1 text-mute hover:text-ink"><LogOut size={12} />Log out</button>
            </>
          ) : (
            <Link to="/login" className="inline-flex items-center gap-1 text-mute hover:text-ink"><LogIn size={12} />Log in</Link>
          )}
          <div className="flex items-center gap-2"><Camera size={12} />Camera idle</div>
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-moss live-dot" />Mock inference</div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 pb-16 md:pb-0"><div key={pathname} className="page-in"><Outlet /></div></main>
      <nav aria-label="Mobile" className="md:hidden fixed bottom-0 inset-x-0 flex bg-paper border-t border-line">
        {NAV.slice(0, 5).map(([to, label, Icon]) =>
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex-1 flex flex-col items-center py-2 text-[11px] ${isActive ? 'text-moss-dark font-semibold' : 'text-mute'}`}>
            <Icon size={18} />{label.split(' ')[0]}</NavLink>)}
      </nav>
    </div>
  )
}