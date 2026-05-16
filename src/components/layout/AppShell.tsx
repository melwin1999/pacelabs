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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>

      {/* Desktop sidebar */}
      <aside style={{
        width: '220px', flexShrink: 0, position: 'fixed',
        top: 0, left: 0, height: '100%', zIndex: 30,
        background: '#0d0d0d',
        borderRight: '1px solid #1f1f1f',
        display: 'flex', flexDirection: 'column',
      }} className="hidden md:flex">

        {/* Logo */}
        <div style={{ padding: '28px 24px 20px' }}>
          <span style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px', color: '#f1f5f9' }}>
            Pace<span style={{
  color: '#f97316',
  textShadow: '0 0 20px rgba(249,115,22,0.5)',
  animation: 'labsGlow 2s ease-in-out infinite',
}}>Labs</span>
          </span>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 12px', flex: 1 }}>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '10px',
                fontSize: '13px', fontWeight: active ? 600 : 500,
                color: active ? '#f97316' : '#64748b',
                background: active ? 'rgba(249,115,22,0.08)' : 'transparent',
                borderLeft: active ? '2px solid #f97316' : '2px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent' }}}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* New plan button */}
        <div style={{ padding: '16px 12px 24px' }}>
          <Link href="/plan/new" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', padding: '10px', borderRadius: '10px',
            fontSize: '13px', fontWeight: 700, color: '#fff',
            background: '#f97316', textDecoration: 'none',
            boxShadow: '0 0 20px rgba(249,115,22,0.25)',
            transition: 'box-shadow 0.2s ease',
          }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 32px rgba(249,115,22,0.45)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(249,115,22,0.25)')}
          >
            <Plus size={15} strokeWidth={2.5} />
            New plan
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, paddingBottom: '80px', minHeight: '100vh', minWidth: 0, marginLeft: 0 }}
        className="md:ml-[220px] md:pb-0"
        id="pl-main">
        {children}
      </main>

      <nav className="md:hidden" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        background: 'rgba(10,10,10,0.97)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid #1f1f1f',
        height: '62px', display: 'flex', alignItems: 'center',
      }}>
        {[...NAV_ITEMS, { href: '/plan/new', label: 'New', icon: Plus }].map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '3px', height: '100%', textDecoration: 'none',
              color: active ? '#f97316' : '#2d3a50',
              position: 'relative', transition: 'color 0.15s',
            }}>
              {active && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: '20px', height: '2px',
                  background: '#f97316', borderRadius: '0 0 3px 3px',
                  boxShadow: '0 2px 8px rgba(249,115,22,0.6)',
                }} />
              )}
              <Icon size={19} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}