'use client'

export default function StatsStrip({ plannedKm, doneKm, sessionCount, completedCount }: {
  plannedKm: number
  doneKm: number
  sessionCount: number
  completedCount: number
}) {
  const stats = [
    { label: 'Planned km', value: plannedKm.toFixed(1), unit: 'km', highlight: false },
    { label: 'Done km',    value: doneKm.toFixed(1),    unit: 'km', highlight: doneKm > 0 },
    { label: 'Sessions',   value: `${completedCount}/${sessionCount}`, unit: null, highlight: false },
    { label: 'Readiness',  value: '—', unit: null, highlight: false, muted: true },
  ]

  return (
    <div className="grid grid-cols-4 rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
      {stats.map((stat, i) => (
        <div key={stat.label}
          className="flex flex-col items-center justify-center py-3 px-1"
          style={{ borderRight: i < 3 ? '1px solid var(--border)' : undefined }}>
          <p className="font-extrabold text-xl" style={{
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color: stat.muted ? 'var(--text-muted)' : stat.highlight ? 'var(--success)' : 'var(--text)',
          }}>
            {stat.value}
            {stat.unit && <span className="text-xs font-medium ml-0.5" style={{ color: 'var(--text-muted)' }}>{stat.unit}</span>}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
        </div>
      ))}
    </div>
  )
}