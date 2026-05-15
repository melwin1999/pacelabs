'use client'

export default function StatsStrip({ plannedKm, doneKm, sessionCount, completedCount }: {
  plannedKm: number
  doneKm: number
  sessionCount: number
  completedCount: number
}) {
  const stats = [
    { label: 'Planned', value: plannedKm.toFixed(1), unit: 'km', colour: 'var(--text)' },
    { label: 'Done',    value: doneKm.toFixed(1),    unit: 'km', colour: doneKm > 0 ? '#10b981' : 'var(--text)' },
    { label: 'Sessions', value: `${completedCount}/${sessionCount}`, unit: null, colour: 'var(--text)' },
    { label: 'Readiness', value: '—', unit: null, colour: 'var(--text-muted)' },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      background: '#111111',
      border: '1px solid #1f1f1f',
      borderRadius: '16px',
      overflow: 'hidden',
    }}>
      {stats.map((stat, i) => (
        <div key={stat.label} style={{
          padding: '14px 6px',
          textAlign: 'center',
          borderRight: i < 3 ? '1px solid #1f1f1f' : 'none',
          transition: 'background 0.18s ease',
          cursor: 'default',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <p style={{
            fontSize: '9px', fontWeight: 700, letterSpacing: '1.2px',
            textTransform: 'uppercase', color: '#2d3a50', marginBottom: '6px',
          }}>{stat.label}</p>
          <p style={{
            fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px',
            color: stat.colour, lineHeight: 1,
          }}>
            {stat.value}
            {stat.unit && <span style={{ fontSize: '10px', color: '#2d3a50', fontWeight: 600, marginLeft: '2px' }}>{stat.unit}</span>}
          </p>
        </div>
      ))}
    </div>
  )
}