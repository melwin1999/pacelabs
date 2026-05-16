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

function getPhaseProgress(block: Block): {
  phases: { label: string; color: string; startPct: number; endPct: number }[]
  currentPct: number
} {
  const currentPct = Math.min(100, Math.max(2, Math.round((block.current_week / block.total_weeks) * 100)))
  const phaseColors: Record<string, string> = {
    Base: '#60A5FA', Build: '#FB923C', Peak: '#F87171', Taper: '#F97316',
  }
  const rawPhases = block.phases ?? []
  if (rawPhases.length > 0) {
    const uniqueNames = Array.from(new Set(rawPhases.map((p: { name: string }) => p.name))) as string[]
    const phases = uniqueNames.map((name) => {
      const phaseWeeks = rawPhases.filter((p: { name: string }) => p.name === name)
      const startWeek = Math.min(...phaseWeeks.map((p: { start_week: number }) => p.start_week))
      const endWeek = Math.max(...phaseWeeks.map((p: { end_week: number }) => p.end_week))
      return {
        label: name,
        color: phaseColors[name] ?? '#71717a',
        startPct: Math.round(((startWeek - 1) / block.total_weeks) * 100),
        endPct: Math.round((endWeek / block.total_weeks) * 100),
      }
    })
    return { phases, currentPct }
  }
  return {
    phases: [
      { label: 'Base', color: '#60A5FA', startPct: 0, endPct: 25 },
      { label: 'Build', color: '#FB923C', startPct: 25, endPct: 62 },
      { label: 'Peak', color: '#F87171', startPct: 62, endPct: 87 },
      { label: 'Taper', color: '#F97316', startPct: 87, endPct: 100 },
    ],
    currentPct,
  }
}

function getCurrentPhaseLabel(
  phases: { label: string; startPct: number; endPct: number }[],
  currentPct: number
): string {
  return phases.find(p => currentPct >= p.startPct && currentPct <= p.endPct)?.label
    ?? phases[phases.length - 1]?.label ?? ''
}

export default function RaceHeroCard({
  block,
  queuedBlock,
}: {
  block: Block
  queuedBlock?: Block
}) {
  const daysToGo = block.race_date
    ? Math.max(0, differenceInDays(parseISO(block.race_date), new Date()))
    : null

  const estNow = formatTime(block.est_now_seconds)
  const raceProj = formatTime(block.race_proj_seconds)
  const { phases, currentPct } = getPhaseProgress(block)
  const currentPhase = getCurrentPhaseLabel(phases, currentPct)

  const paceDiffSeconds = block.est_now_seconds && block.race_proj_seconds
    ? block.est_now_seconds - block.race_proj_seconds : null
  const paceImprovement = paceDiffSeconds !== null
    ? `−${Math.floor(paceDiffSeconds / 60)} min` : '—'

  return (
    <>
      <style>{`
        @keyframes plPulse {
          0%, 100% { box-shadow: 0 0 4px 2px rgba(249,115,22,0.5); }
          50% { box-shadow: 0 0 16px 7px rgba(249,115,22,0.95), 0 0 30px 12px rgba(249,115,22,0.3); }
        }
        @keyframes labsGlow {
          0%, 100% { text-shadow: none; opacity: 0.85; }
          50% { text-shadow: 0 0 12px rgba(249,115,22,0.9), 0 0 24px rgba(249,115,22,0.5); opacity: 1; }
        }
        .pl-track-dot { animation: plPulse 2s ease-in-out infinite; }
        @keyframes trackFillGrow {
          from { width: 0%; }
          to   { width: var(--target-width); }
        }
        .pl-track-fill { width: 0%; animation: trackFillGrow 1.1s ease-out 0.1s forwards; }
      `}</style>

      <div style={{ position: 'relative', padding: '28px 0 24px' }}>
        {/* Orbs */}
        <div style={{
          position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.24) 0%, rgba(249,115,22,0.07) 38%, transparent 65%)',
          top: '-210px', right: '-110px', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: '220px', height: '220px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.09) 0%, transparent 65%)',
          bottom: '-90px', left: '-40px', pointerEvents: 'none',
        }} />

        {/* Content constrained to 820px */}
        <div id="pl-hero-content">

          {/* Eyebrow */}
          <p style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
            color: 'rgba(249,115,22,0.85)', textTransform: 'uppercase', marginBottom: '10px',
          }}>
            Next race · {block.race_distance_km ?? '42.2'} km
            {block.race_date
              ? ` · ${new Date(block.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : ''}
          </p>

          {/* Race name */}
          <h1 style={{
            fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#f5f5f5',
            lineHeight: 1.0, letterSpacing: '-1.5px', marginBottom: '16px',
          }}>
            {block.name}
          </h1>

          {/* Countdown */}
          {daysToGo !== null && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', marginBottom: '18px' }}>
              <span style={{ fontSize: 'clamp(64px, 8vw, 96px)', fontWeight: 900, color: '#f5f5f5', lineHeight: 1, letterSpacing: '-6px' }}>
                {daysToGo}
              </span>
              <span style={{ fontSize: '16px', color: '#71717a', paddingBottom: '10px' }}>days to go</span>
            </div>
          )}

          {/* Race track bar */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ height: '6px', borderRadius: '3px', background: '#1a1a1a', position: 'relative', overflow: 'visible' }}>
              <div className="pl-track-fill" style={{
              height: '100%', borderRadius: '3px', position: 'relative',
              background: 'linear-gradient(90deg, #60A5FA 0%, #FB923C 45%, #F87171 72%, #F97316 100%)',
              ['--target-width' as string]: `${currentPct}%`,
            }}>
                <div className="pl-track-dot" style={{
                  position: 'absolute', right: '-7px', top: '-5px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: '#F97316', border: '2px solid #0a0a0a',
                }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
              {phases.map((p) => (
                <span key={p.label} style={{
                  fontSize: '9px',
                  color: p.label === currentPhase ? p.color : '#52525b',
                  fontWeight: p.label === currentPhase ? 700 : 400,
                }}>
                  {p.label}{p.label === currentPhase ? ' (you)' : ''}
                </span>
              ))}
            </div>
          </div>

          {/* Meta row */}
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingTop: '18px' }}>
            {[
              { label: 'Est. Now', value: estNow, color: '#f5f5f5' },
              { label: 'Race Proj.', value: raceProj, color: '#F97316' },
              { label: 'Week', value: `${block.current_week} / ${block.total_weeks}`, color: '#F97316' },
              { label: 'Improvement', value: paceImprovement, color: '#10b981' },
            ].map((item, i, arr) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                  <span style={{ fontSize: '9px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: item.color }}>
                    {item.value}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ width: '1px', height: '28px', background: '#1f1f1f', flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>

          {/* Queued block banner */}
          {queuedBlock && (
            <div style={{
              marginTop: '20px', padding: '9px 14px',
              background: 'rgba(249,115,22,0.05)',
              border: '1px solid rgba(249,115,22,0.12)',
              borderRadius: '8px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: '9px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Next up</p>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#f5f5f5' }}>{queuedBlock.name}</p>
              </div>
              <p style={{ fontSize: '12px', color: '#F97316', fontWeight: 600 }}>
                Starts {queuedBlock.start_date
                  ? new Date(queuedBlock.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                  : 'soon'}
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  )
}