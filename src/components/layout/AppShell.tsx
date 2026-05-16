'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Calendar, LayoutGrid, Activity, BarChart3, MessageCircle, Settings, Plus, X } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/',       label: 'Plan',  icon: Calendar      },
  { href: '/block',  label: 'Block', icon: LayoutGrid    },
  { href: '/runs',   label: 'Runs',  icon: Activity      },
  { href: '/stats',  label: 'Stats', icon: BarChart3     },
  { href: '/coach',  label: 'Coach', icon: MessageCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const MOBILE_NAV = [
  { href: '/',       label: 'Plan',  icon: Calendar      },
  { href: '/block',  label: 'Block', icon: LayoutGrid    },
  { href: '/runs',   label: 'Runs',  icon: Activity      },
  { href: '/stats',  label: 'Stats', icon: BarChart3     },
  { href: '/coach',  label: 'Coach', icon: MessageCircle },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [fabOpen, setFabOpen] = useState(false)
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>

      {/* Desktop sidebar — unchanged */}
      <aside className="hidden md:flex" style={{
        width: '220px', flexShrink: 0, position: 'fixed',
        top: 0, left: 0, height: '100%', zIndex: 30,
        background: '#0d0d0d', borderRight: '1px solid #1f1f1f',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '28px 24px 20px' }}>
          <span style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px', color: '#f1f5f9' }}>
            Pace<span style={{ color: '#f97316', animation: 'labsGlow 2s ease-in-out infinite' }}>Labs</span>
          </span>
        </div>

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
                textDecoration: 'none', transition: 'all 0.15s ease',
              }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent' }}}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '16px 12px 24px' }}>
          <Link href="/plan/new" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', padding: '10px', borderRadius: '10px',
            fontSize: '13px', fontWeight: 700, color: '#fff',
            background: '#f97316', textDecoration: 'none', transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <Plus size={15} strokeWidth={2.5} />
            New plan
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main id="pl-main" style={{ flex: 1, minWidth: 0, paddingBottom: '72px', minHeight: '100vh' }}>
        {children}
      </main>

      {/* FAB overlay — tap outside to close */}
      {fabOpen && (
        <div
          onClick={() => setFabOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 38,
            background: 'rgba(0,0,0,0.55)',
          }}
        />
      )}

      {/* FAB menu items — mobile only */}
      {fabOpen && (
        <div id="pl-fab-menu" style={{
          position: 'fixed', bottom: '134px', right: '16px', zIndex: 40,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px',
        }}>
          {/* Settings */}
          <Link
            href="/settings"
            onClick={() => setFabOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none',
              animation: 'fabItemIn 0.18s ease 0.04s both',
            }}
          >
            <div style={{
              background: '#1a1a1a', border: '1px solid #2e2e2e',
              borderRadius: '20px', padding: '7px 14px',
            }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f5f5f5' }}>Settings</span>
            </div>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: '#1a1a1a', border: '1px solid #2e2e2e',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Settings size={20} color="#a1a1aa" strokeWidth={1.8} />
            </div>
          </Link>

          {/* New plan */}
          <Link
            href="/plan/new"
            onClick={() => setFabOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none',
              animation: 'fabItemIn 0.18s ease 0s both',
            }}
          >
            <div style={{
              background: '#1a1a1a', border: '1px solid #2e2e2e',
              borderRadius: '20px', padding: '7px 14px',
            }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f5f5f5' }}>New plan</span>
            </div>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: '#F97316', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 0 14px rgba(249,115,22,0.5)',
            }}>
              <Plus size={20} color="#fff" strokeWidth={2.5} />
            </div>
          </Link>
        </div>
      )}

      {/* FAB button — mobile only */}
      <button
        id="pl-fab"
        onClick={() => setFabOpen(!fabOpen)}
        style={{
          position: 'fixed', bottom: '74px', right: '16px', zIndex: 41,
          width: '48px', height: '48px', borderRadius: '50%',
          background: '#F97316', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: fabOpen
            ? '0 4px 20px rgba(249,115,22,0.7)'
            : '0 4px 16px rgba(249,115,22,0.45)',
          transition: 'box-shadow 0.2s, transform 0.2s',
          transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      >
        {fabOpen
          ? <X size={20} color="#fff" strokeWidth={2.5} />
          : <Plus size={20} color="#fff" strokeWidth={2.5} />
        }
      </button>

      {/* Mobile bottom nav — 5 tabs */}
      <nav id="pl-mobile-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        background: 'rgba(10,10,10,0.97)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid #1f1f1f',
        height: '62px', display: 'flex', alignItems: 'center',
      }}>
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '3px', height: '100%', textDecoration: 'none',
              color: active ? '#f97316' : '#3d4f63',
              position: 'relative', transition: 'color 0.15s',
            }}>
              {active && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: '20px', height: '2px',
                  background: '#f97316', borderRadius: '0 0 3px 3px',
                }} />
              )}
              <Icon size={19} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase' }}>{label}</span>
            </Link>
          )
        })}
      </nav>

      <style>{`
        @keyframes fabItemIn {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}