'use client'

export default function StatsStrip({ plannedKm, doneKm, sessionCount, completedCount }: {
  plannedKm: number
  doneKm: number
  sessionCount: number
  completedCount: number
}) {
  const stats = [
    { label: 'Planned', value: plannedKm.toFixed(1), unit: 'km', colour: '#f5f5f5' },
    { label: 'Done',    value: doneKm.toFixed(1),    unit: 'km', colour: doneKm > 0 ? '#10b981' : '#f5f5f5' },
    { label: 'Sessions', value: `${completedCount}`, unit: `/ ${sessionCount}`, colour: '#f5f5f5' },
    { label: 'Readiness', value: '—', unit: 'connect garmin', colour: '#52525b' },
  ]

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      background: '#111111', border: '1px solid #1f1f1f',
      borderRadius: '16px', overflow: 'hidden',
    }}>
      {stats.map((stat, i) => (
        <div key={stat.label}
          style={{
            padding: '16px 8px', textAlign: 'center',
            borderRight: i < 3 ? '1px solid #1f1f1f' : 'none',
            transition: 'background 0.15s', cursor: 'default',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#3f3f46', marginBottom: '8px' }}>
            {stat.label}
          </p>
          <p style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-1px', color: stat.colour, lineHeight: 1 }}>
            {stat.value}
            {stat.label === 'Sessions' && <span style={{ fontSize: '14px', color: '#3f3f46', fontWeight: 700 }}>{stat.unit}</span>}
          </p>
          {stat.label !== 'Sessions' && (
            <p style={{ fontSize: '10px', color: '#3f3f46', fontWeight: 600, marginTop: '3px' }}>{stat.unit}</p>
          )}
        </div>
      ))}
    </div>
  )
}