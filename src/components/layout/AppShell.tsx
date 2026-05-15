'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, LayoutGrid, Activity, BarChart3, MessageCircle, Settings, Plus } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/',         label: 'Plan',     icon: Calendar      },
  { href: '/block',    label: 'Block',    icon: LayoutGrid    },
  { href: '/runs',     label: 'Runs',     icon: Activity      },
  { href: '/stats',    label: 'Stats',    icon: BarChart3     },
  { href: '/coach',    label: 'Coach',    icon: MessageCircle },
  { href: '/settings', label: 'Settings', icon: Settings      },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-56 shrink-0 fixed top-0 left-0 h-full z-30"
        style={{
          background: 'var(--bg-subtle)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Logo */}
        <div className="px-6 py-7">
          <span className="text-xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
            Pace<span style={{
              color: 'var(--accent)',
              textShadow: '0 0 20px rgba(249,115,22,0.5)',
            }}>Labs</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-3 flex-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: active ? 'var(--accent-dim)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                }}
              >
                <Icon size={17} strokeWidth={active ? 2.5 : 1.8} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* New plan */}
        <div className="px-3 py-5">
          <Link
            href="/plan/new"
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold w-full transition-all duration-200 pulse-glow"
            style={{
              background: 'var(--accent)',
              color: '#fff',
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            New plan
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-56 pb-20 md:pb-0 min-h-screen overflow-x-hidden">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30"
        style={{
          background: 'rgba(10, 14, 23, 0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center justify-around h-16 px-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
                style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {active && (
                  <span style={{
                    position: 'absolute',
                    marginTop: '-28px',
                    width: '32px',
                    height: '2px',
                    background: 'var(--accent)',
                    borderRadius: '0 0 4px 4px',
                    boxShadow: '0 0 8px var(--accent-glow)',
                  }} />
                )}
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
          <Link
            href="/plan/new"
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
            style={{ color: pathname.startsWith('/plan/new') ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <Plus size={20} strokeWidth={2} />
            <span className="text-[10px] font-medium">New</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}