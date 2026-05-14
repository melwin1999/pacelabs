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
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 fixed top-0 left-0 h-full z-30"
        style={{ backgroundColor: 'var(--bg-card)', borderRight: '1px solid var(--border)' }}>
        <div className="px-6 py-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
            Pace<span style={{ color: 'var(--accent)' }}>Labs</span>
          </span>
        </div>
        <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: active ? 'var(--accent)' : 'transparent',
                  color: active ? '#fff' : 'var(--text-muted)',
                }}>
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="px-3 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <Link
            href="/plan/new"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full"
            style={{
              backgroundColor: pathname.startsWith('/plan/new') ? 'var(--accent)' : 'transparent',
              color: pathname.startsWith('/plan/new') ? '#fff' : 'var(--text-muted)',
            }}
          >
            <Plus size={18} />
            New plan
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-60 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30"
        style={{ backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center justify-around h-16 px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
                style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
          <Link
            href="/plan/new"
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
            style={{ color: pathname.startsWith('/plan/new') ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <Plus size={20} strokeWidth={pathname.startsWith('/plan/new') ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">New</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}