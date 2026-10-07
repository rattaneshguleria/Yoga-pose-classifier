import { useState, useEffect } from 'react'
import {
  NavLink,
  Outlet,
  useLocation,
  Link,
  useNavigate
} from 'react-router-dom'

import {
  LayoutDashboard,
  Video,
  ScanLine,
  Film,
  BookOpen,
  TrendingUp,
  History,
  Cpu,
  Settings,
  Camera,
  LogOut,
  LogIn,
  Sparkles,
  ChevronRight,
  MoreHorizontal,
  X
} from 'lucide-react'

import {
  api,
  clearAuthState,
  getAuthState
} from '../lib/api.js'

const NAV = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/live', 'Live Coach', Video],
  ['/analyzer', 'Pose Analyzer', ScanLine],
  ['/video', 'Video Analysis', Film],
  ['/library', 'Pose Library', BookOpen],
  ['/progress', 'Progress', TrendingUp],
  ['/sessions', 'Sessions', History],
  ['/model', 'Model Insights', Cpu],
  ['/settings', 'Settings', Settings],
]

const link = ({ isActive }) =>
  `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
    isActive
      ? 'bg-moss-soft font-semibold text-moss-dark'
      : 'text-mute hover:bg-bone hover:text-ink'
  }`

export default function Shell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const auth = getAuthState()
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  const MORE_NAV = [
    ['/video', 'Video Analysis', Film],
    ['/progress', 'Progress', TrendingUp],
    ['/sessions', 'Sessions', History],
    ['/model', 'Model Insights', Cpu],
    ['/settings', 'Settings', Settings],
  ]

  const isMoreActive = MORE_NAV.some(
    ([to]) => pathname === to || pathname.startsWith(to + '/')
  )

  const logout = async () => {
    try {
      await api.auth.logout()
    } catch {}

    clearAuthState()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-bone md:flex">

      {/* =====================================================
          DESKTOP SIDEBAR
      ===================================================== */}

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-paper md:flex">

        {/* Brand */}
        <div className="px-5 pb-5 pt-6">
          <Link
            to="/welcome"
            className="group inline-flex items-center gap-3"
          >
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-moss-soft text-moss-dark transition-transform duration-200 group-hover:scale-105">
              <Sparkles size={17} />
            </div>

            <div>
              <div className="text-[15px] font-bold tracking-tight text-ink">
                YOGAVISION
              </div>

              <div className="mt-0.5 text-[10px] tracking-wide text-mute">
                INTELLIGENT YOGA ANALYSIS
              </div>
            </div>
          </Link>
        </div>

        {/* Status */}
        <div className="mx-4 mb-4 rounded-xl border border-line bg-bone px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-mute">
              AI system
            </span>

            <span className="flex items-center gap-1.5 text-[11px] font-medium text-moss-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-moss live-dot" />
              Ready
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 space-y-1 px-3"
          aria-label="Main"
        >
          <div className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-mute/70">
            Workspace
          </div>

          {NAV.slice(0, 5).map(
            ([to, navLabel, Icon]) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={link}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-moss" />
                    )}

                    <Icon
                      size={17}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />

                    <span className="flex-1">
                      {navLabel}
                    </span>

                    {isActive && (
                      <ChevronRight
                        size={13}
                        className="text-moss-dark"
                      />
                    )}
                  </>
                )}
              </NavLink>
            )
          )}

          <div className="px-3 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-mute/70">
            Insights
          </div>

          {NAV.slice(5, 8).map(
            ([to, navLabel, Icon]) => (
              <NavLink
                key={to}
                to={to}
                className={link}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-moss" />
                    )}

                    <Icon
                      size={17}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />

                    <span className="flex-1">
                      {navLabel}
                    </span>

                    {isActive && (
                      <ChevronRight
                        size={13}
                        className="text-moss-dark"
                      />
                    )}
                  </>
                )}
              </NavLink>
            )
          )}

          <div className="px-3 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-mute/70">
            System
          </div>

          <NavLink
            to="/settings"
            className={link}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-moss" />
                )}

                <Settings
                  size={17}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />

                <span className="flex-1">
                  Settings
                </span>
              </>
            )}
          </NavLink>
        </nav>

        {/* Profile / status */}
        <div className="border-t border-line p-4">

          {auth ? (
            <div className="rounded-xl border border-line bg-bone p-3">
              <div className="flex items-center gap-3">

                <div className="grid h-9 w-9 place-items-center rounded-full bg-moss-soft text-sm font-semibold text-moss-dark">
                  {auth.user.username?.[0]?.toUpperCase() || 'U'}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-ink">
                    {auth.user.username}
                  </div>

                  <div className="mt-0.5 text-[10px] text-mute">
                    YogaVision member
                  </div>
                </div>

              </div>

              <button
                onClick={logout}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-paper py-2 text-xs text-mute transition-colors hover:bg-white hover:text-ink"
              >
                <LogOut size={12} />
                Log out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 rounded-xl border border-line bg-bone px-3 py-2.5 text-xs font-medium text-mute transition-colors hover:bg-white hover:text-ink"
            >
              <LogIn size={13} />
              Log in
            </Link>
          )}

          <div className="mt-3 flex items-center justify-between px-1 text-[10px] text-mute">
            <span className="flex items-center gap-1.5">
              <Camera size={11} />
              Camera ready
            </span>

            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-moss" />
              AI ready
            </span>
          </div>

        </div>
      </aside>

      {/* =====================================================
          MAIN CONTENT & MOBILE TOP BAR
      ===================================================== */}

      <div className="flex min-w-0 flex-1 flex-col">

        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-2.5 backdrop-blur-md md:hidden">
          <Link
            to="/welcome"
            className="flex items-center gap-2.5"
          >
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-moss-soft text-moss-dark">
              <Sparkles size={15} />
            </div>
            <div>
              <div className="text-[13px] font-bold tracking-tight text-ink leading-tight">
                YOGAVISION
              </div>
              <div className="text-[9px] font-medium tracking-wide text-mute uppercase">
                AI Coach
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-line bg-bone px-2.5 py-1 text-[10px] font-medium text-moss-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-moss live-dot" />
              AI Ready
            </span>

            {auth ? (
              <div
                className="grid h-7 w-7 place-items-center rounded-full bg-moss-soft text-xs font-semibold text-moss-dark"
                title={auth.user.username}
              >
                {auth.user.username?.[0]?.toUpperCase() || 'U'}
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded-lg border border-line bg-bone px-2.5 py-1 text-[11px] font-medium text-mute hover:bg-white hover:text-ink transition-colors"
              >
                Log in
              </Link>
            )}
          </div>
        </header>

        <main className="min-w-0 flex-1 pb-20 md:pb-0">
          <div
            key={pathname}
            className="page-in"
          >
            <Outlet />
          </div>
        </main>

      </div>

      {/* =====================================================
          MOBILE "MORE" SHEET
      ===================================================== */}

      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs transition-opacity md:hidden"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-label="More navigation"
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-line bg-paper p-5 shadow-2xl md:hidden page-in"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-mute">
                  Menu
                </div>
                <div className="text-sm font-bold text-ink">
                  More Pages
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-bone text-mute hover:text-ink"
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1">
              {MORE_NAV.map(([to, navLabel, Icon]) => {
                const isActive = pathname === to || pathname.startsWith(to + '/')
                return (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-moss-soft font-semibold text-moss-dark'
                        : 'text-mute hover:bg-bone hover:text-ink'
                    }`}
                  >
                    <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span className="flex-1">{navLabel}</span>
                    <ChevronRight size={14} className="text-mute/60" />
                  </NavLink>
                )
              })}
            </div>

            {/* User Account / Logout inside More Sheet */}
            <div className="mt-4 border-t border-line pt-4">
              {auth ? (
                <div className="flex items-center justify-between rounded-xl border border-line bg-bone p-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-moss-soft text-xs font-semibold text-moss-dark">
                      {auth.user.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="truncate text-xs font-semibold text-ink">
                        {auth.user.username}
                      </div>
                      <div className="text-[10px] text-mute">
                        YogaVision member
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setMoreOpen(false)
                      logout()
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs text-mute hover:bg-white hover:text-ink transition-colors"
                  >
                    <LogOut size={12} />
                    Log out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-line bg-bone px-3 py-2.5 text-xs font-semibold text-ink hover:bg-white transition-colors"
                >
                  <LogIn size={13} />
                  Log in to your account
                </Link>
              )}
            </div>
          </div>
        </>
      )}

      {/* =====================================================
          MOBILE BOTTOM NAV
      ===================================================== */}

      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper/95 backdrop-blur-md md:hidden"
      >
        <div className="grid grid-cols-5 px-1 py-1.5">

          {/* Primary 4 tabs */}
          {[
            ['/', 'Dashboard', LayoutDashboard],
            ['/live', 'Live Coach', Video],
            ['/analyzer', 'Analyze', ScanLine],
            ['/library', 'Library', BookOpen],
          ].map(([to, navLabel, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] transition-colors ${
                  isActive
                    ? 'font-semibold text-moss-dark'
                    : 'text-mute hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 h-0.5 w-7 rounded-full bg-moss" />
                  )}

                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />

                  <span>{navLabel}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* 5th slot: More button */}
          <button
            type="button"
            onClick={() => setMoreOpen(prev => !prev)}
            aria-expanded={moreOpen}
            className={`relative flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] transition-colors ${
              isMoreActive || moreOpen
                ? 'font-semibold text-moss-dark'
                : 'text-mute hover:text-ink'
            }`}
          >
            {(isMoreActive || moreOpen) && (
              <span className="absolute top-0 h-0.5 w-7 rounded-full bg-moss" />
            )}

            <MoreHorizontal
              size={18}
              strokeWidth={isMoreActive || moreOpen ? 2.2 : 1.8}
            />

            <span>More</span>
          </button>

        </div>
      </nav>

    </div>
  )
}