'use client'

import { Block } from '@/lib/types'
import { differenceInDays, parseISO } from 'date-fns'

function formatTime(seconds: number | null): string {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getPhases(block: Block): { label: string; done: boolean; active: boolean }[] {
  const pct = block.current_week / block.total_weeks
  const phases = block.phases ?? []

  if (phases.length > 0) {
    const uniqueNames = Array.from(new Set(phases.map((p: { name: string }) => p.name)))
    return uniqueNames.map((name) => {
      const phaseWeeks = phases.filter((p: { name: string }) => p.name === name)
      const lastWeek = Math.max(...phaseWeeks.map((p: { end_week: number }) => p.end_week))
      const firstWeek = Math.min(...phaseWeeks.map((p: { start_week: number }) => p.start_week))
      const done = block.current_week > lastWeek
      const active = block.current_week >= firstWeek && block.current_week <= lastWeek
      return { label: name, done, active }
    })
  }

  const derived = [
    { label: 'Base', threshold: 0.25 },
    { label: 'Build', threshold: 0.625 },
    { label: 'Peak', threshold: 0.875 },
    { label: 'Taper', threshold: 1 },
  ]
  return derived.map((p, i) => {
    const prevThreshold = i === 0 ? 0 : derived[i - 1].threshold
    const done = pct > p.threshold
    const active = pct > prevThreshold && pct <= p.threshold
    return { label: p.label, done, active }
  })
}

export default function RaceHeroCard({ block }: { block: Block }) {
  const daysToGo = block.race_date
    ? Math.max(0, differenceInDays(parseISO(block.race_date), new Date()))
    : null

  const estNow = formatTime(block.est_now_seconds)
  const raceProj = formatTime(block.race_proj_seconds)
  const phases = getPhases(block)
  const progress = Math.min(100, Math.max(5, Math.round((block.current_week / block.total_weeks) * 100)))

  // Phase bar: first dot at left edge, last dot at right edge
  // We do this by making the outer div NOT use flex:1 centering
  // Instead we use a plain horizontal line with absolute dots

  return (
    <div style={{
      background: '#111111',
      border: '1px solid #1f1f1f',
      borderRadius: '22px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: '-100px', right: '-80px',
        width: '340px', height: '340px',
        background: 'radial-gradient(circle, rgba(200,70,10,0.38) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-80px', left: '-60px',
        width: '220px', height: '220px',
        background: 'radial-gradient(circle, rgba(20,20,20,0.4) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '24px' }}>

        {/* Eyebrow */}
        <p style={{
          fontSize: '10px', fontWeight: 700, letterSpacing: '2px',
          color: '#f97316', textTransform: 'uppercase', marginBottom: '16px', opacity: 0.9,
        }}>
          {block.name} · {block.race_distance_km ?? '42.2'} km
          {block.race_date ? ` · ${new Date(block.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
        </p>

        {/* Big number + week badge */}
        {daysToGo !== null ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <p style={{
                fontSize: '100px', fontWeight: 900, lineHeight: 1,
                letterSpacing: '-6px',
                background: 'linear-gradient(160deg, #ffffff 20%, #71717a 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {daysToGo}
              </p>
              <p style={{ fontSize: '18px', fontWeight: 600, color: '#52525b', letterSpacing: '-0.3px' }}>days to go</p>
            </div>
            <span style={{
              fontSize: '12px', fontWeight: 700, color: '#f97316',
              background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
              padding: '4px 10px', borderRadius: '100px', display: 'inline-block', marginTop: '8px',
            }}>
              Week {block.current_week}/{block.total_weeks}
            </span>
          </div>
        ) : (
          <p style={{ fontSize: '15px', color: '#52525b', marginBottom: '20px' }}>No race date set</p>
        )}

        {/* Phase journey — dots pinned to left/right edges, line connecting them */}
        <div style={{ position: 'relative', marginBottom: '20px', height: '36px' }}>
          {/* Background line — full width */}
          <div style={{
            position: 'absolute', top: '5px', left: '5px', right: '5px', height: '2px',
            background: '#1f1f1f',
          }} />
          {/* Dots + labels */}
          {phases.map((phase, i) => {
            const leftPct = i === 0 ? 0 : i === phases.length - 1 ? 100 : (i / (phases.length - 1)) * 100
            return (
              <div key={phase.label} style={{
                position: 'absolute',
                left: `${leftPct}%`,
                transform: i === 0 ? 'none' : i === phases.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              }}>
                {/* Coloured line segment — from this dot to the next */}
                {i < phases.length - 1 && (phase.done || phase.active) && (
                  <div style={{
                    position: 'absolute', top: '5px',
                    left: phase.active ? '50%' : '5px',
                    width: phase.active
                      ? `${(1 / (phases.length - 1)) * 100 * (progress / 100) * (phases.length - 1)}px`
                      : `calc(${100 / (phases.length - 1)}% )`,
                    height: '2px',
                    background: '#10b981',
                    zIndex: 0,
                  }} />
                )}
                <div style={{
                  width: phase.active ? '13px' : '10px',
                  height: phase.active ? '13px' : '10px',
                  borderRadius: '50%',
                  background: phase.active ? '#f97316' : phase.done ? '#10b981' : '#1f1f1f',
                  border: `2px solid ${phase.active ? '#f97316' : phase.done ? '#10b981' : '#2e2e2e'}`,
                  boxShadow: phase.active ? '0 0 10px rgba(249,115,22,0.6)' : 'none',
                  position: 'relative', zIndex: 1, flexShrink: 0,
                }} />
                <p style={{
                  fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px',
                  textTransform: 'uppercase', whiteSpace: 'nowrap',
                  color: phase.active ? '#f97316' : phase.done ? '#10b981' : '#3f3f46',
                }}>
                  {phase.label}
                </p>
              </div>
            )
          })}
        </div>

        {/* Time cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid #1f1f1f',
            borderRadius: '14px', padding: '14px 16px', minWidth: 0,
          }}>
            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#52525b', marginBottom: '6px' }}>Est. now</p>
            <p style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>{estNow}</p>
            <p style={{ fontSize: '11px', color: '#52525b', marginTop: '3px' }}>if you raced today</p>
          </div>
          <div style={{
            background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)',
            borderRadius: '14px', padding: '14px 16px', minWidth: 0,
          }}>
            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(249,115,22,0.6)', marginBottom: '6px' }}>Race proj.</p>
            <p style={{ fontSize: '22px', fontWeight: 800, color: '#f97316', letterSpacing: '-0.5px' }}>{raceProj}</p>
            <p style={{ fontSize: '11px', color: '#52525b', marginTop: '3px' }}>
              {block.race_date ? `on ${new Date(block.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
            </p>
          </div>
        </div>

        {/* Progress bar — same left/right bounds as phase bar (left:5px, right:5px) */}
        {block.est_now_seconds && block.race_proj_seconds && (
          <>
            <div style={{
              marginLeft: '5px', marginRight: '5px',
              height: '3px', background: '#1f1f1f', borderRadius: '10px',
              position: 'relative', marginBottom: '4px',
            }}>
              <div style={{
                height: '3px', borderRadius: '10px', position: 'relative',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #c2410c, #f97316)',
              }}>
                <div style={{
                  width: '11px', height: '11px', background: '#f97316',
                  borderRadius: '50%', position: 'absolute', right: '-5px', top: '-4px',
                  boxShadow: '0 0 10px rgba(249,115,22,0.7)',
                }} />
              </div>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '10px', marginTop: '6px',
              marginLeft: '5px', marginRight: '5px',
            }}>
              <span style={{ color: '#52525b' }}>Est. now {estNow}</span>
              <span style={{ color: '#f97316', fontWeight: 600 }}>Race proj. {raceProj}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}