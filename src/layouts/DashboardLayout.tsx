import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { dashboardApi } from '../api'
import type { DashboardSummary } from '../types'
import InstallAppButton from '../components/InstallAppButton'

const navItems = [
  { to: '/', label: 'Dashboard', end: true, icon: '▣' },
  { to: '/certificates/new', label: 'New Certificate', icon: '＋' },
  { to: '/certificates', label: 'All Certificates', icon: '☰' },
  { to: '/search', label: 'Search Certificate', icon: '⌕' },
  { to: '/bulk-download', label: 'Bulk Download', icon: '⬇' },
  { to: '/print-history', label: 'Print History', icon: '◷' },
  { to: '/reports', label: 'Reports', icon: '▤' },
  { to: '/templates', label: 'Templates', icon: '▦' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
  { to: '/backup', label: 'Backup', icon: '⇩' },
]

function LiveClock({ compact = false }: { compact?: boolean }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const date = now
    .toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .replace(/ /g, '-')
  const day = now.toLocaleDateString('en-GB', { weekday: 'short' })
  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  if (compact) {
    return (
      <div className="rounded-lg border border-white/20 bg-[#0d3a7a] px-2 py-1.5 text-right text-white leading-tight">
        <p className="text-[10px] font-semibold tabular-nums">{time}</p>
        <p className="text-[9px] text-blue-100">{date}</p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-[#0d3a7a] px-3 py-2 text-white shadow-inner">
      <span className="text-lg" aria-hidden>
        📅
      </span>
      <div className="leading-tight">
        <p className="text-xs font-semibold">{date}</p>
        <p className="text-[11px] text-blue-100">{day}</p>
        <p className="text-sm font-bold tabular-nums">{time}</p>
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)

  useEffect(() => {
    void dashboardApi.summary().then(setSummary).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const stats = [
    { label: 'Total Certificates', value: summary?.total_certificates ?? 0, bg: 'bg-[#1d6fd8]' },
    { label: "Today's Certificates", value: summary?.certificates_today ?? 0, bg: 'bg-[#1f9d57]' },
    { label: 'Total Printed', value: summary?.total_printed ?? 0, bg: 'bg-[#e67e22]' },
    { label: 'Pending Print', value: summary?.pending_print ?? 0, bg: 'bg-[#d94a8c]' },
  ]

  return (
    <div className="min-h-dvh bg-[#e8eef6] lg:flex">
      {/* Mobile overlay */}
      <button
        type="button"
        aria-label="Close menu"
        className={`no-print fixed inset-0 z-40 bg-slate-900/50 transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex w-[min(280px,88vw)] max-w-[280px] flex-col bg-[#0b2a5b] text-white shadow-2xl transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-[250px] lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-3 sm:px-4 sm:py-4">
          <img
            src="/lucent-logo-light.png"
            alt="Lucent Technology"
            className="h-11 w-auto object-contain sm:h-14"
          />
          <button
            type="button"
            className="rounded-md border border-white/25 px-2.5 py-1.5 text-sm font-semibold text-white lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-semibold transition ${
                  isActive
                    ? 'bg-[#1d6fd8] text-white shadow'
                    : 'text-blue-100 hover:bg-white/10'
                }`
              }
            >
              <span className="w-4 text-center opacity-90" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[13px] font-semibold text-blue-100 hover:bg-white/10"
          >
            <span className="w-4 text-center" aria-hidden>
              ⏻
            </span>
            Logout
          </button>
        </nav>

        <div className="border-t border-white/10 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-200">
            Quick Summary
          </p>
          <div className="grid grid-cols-2 gap-2">
            {stats.map((s) => (
              <div key={s.label} className={`rounded-md ${s.bg} px-2 py-2 text-center shadow`}>
                <p className="text-lg font-extrabold leading-none">
                  {String(s.value).padStart(2, '0')}
                </p>
                <p className="mt-1 text-[9px] font-semibold leading-tight text-white/95">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 truncate text-center text-[11px] text-blue-200">
            Logged in as :{' '}
            <span className="font-bold text-white">
              {user?.full_name || user?.username || 'Admin'}
            </span>
          </p>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 bg-gradient-to-r from-[#0b2a5b] via-[#123a75] to-[#1a4b96] px-3 py-2.5 text-white shadow-md sm:px-4 sm:py-3 lg:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/30 text-lg lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
            >
              ☰
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <div className="min-w-0 text-left sm:text-center lg:flex-1 lg:text-center">
                <h1 className="truncate text-sm font-extrabold tracking-[0.04em] sm:text-xl md:text-2xl lg:text-3xl">
                  LUCENT TECHNOLOGY
                </h1>
                <p className="truncate text-[9px] font-bold tracking-[0.12em] text-[#f1c40f] sm:text-xs sm:tracking-[0.18em] md:text-sm">
                  CERTIFICATE PRINTING SYSTEM
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <InstallAppButton />
              <div
                className="hidden items-center rounded-lg bg-white/10 px-2 py-1 md:flex"
                title="Certificate Printer"
              >
                <span className="text-2xl" aria-hidden>
                  🖨️
                </span>
              </div>
              <div className="sm:hidden">
                <LiveClock compact />
              </div>
              <div className="hidden sm:block">
                <LiveClock />
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
          <Outlet />
        </main>

        <footer className="no-print flex flex-wrap items-center justify-between gap-2 bg-[#0b2a5b] px-3 py-2 text-[10px] text-blue-100 sm:px-4 sm:text-[11px]">
          <span>© 2026 Lucent Technology. All Rights Reserved.</span>
          <span>Version : 1.0.0</span>
        </footer>
      </div>
    </div>
  )
}
