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

export default function RaceHeroCard({ block }: { block: Block }) {
  const daysToGo = block.race_date
    ? Math.max(0, differenceInDays(parseISO(block.race_date), new Date()))
    : null

  const estNow = formatTime(block.est_now_seconds)
  const raceProj = formatTime(block.race_proj_seconds)

  return (
    <div style={{
      background: '#111111',
      border: '1px solid #1f1f1f',
      borderRadius: '20px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Glow orbs */}
      <div style={{
        position: 'absolute', top: '-80px', right: '-60px',
        width: '280px', height: '280px',
        background: 'radial-gradient(circle, rgba(180,60,10,0.32) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-70px', left: '-40px',
        width: '200px', height: '200px',
        background: 'radial-gradient(circle, rgba(30,60,120,0.2) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '22px 22px 18px' }}>
        {/* Eyebrow */}
        <p style={{
          fontSize: '10px', fontWeight: 700, letterSpacing: '1.8px',
          color: '#f97316', textTransform: 'uppercase', marginBottom: '14px',
        }}>
          {block.name} · {block.race_distance_km ?? '42.2'} km
          {block.race_date ? ` · ${new Date(block.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
        </p>

        {/* Big countdown */}
        {daysToGo !== null ? (
          <>
            <p style={{
              fontSize: '86px', fontWeight: 900, lineHeight: 0.9,
              letterSpacing: '-4px', marginBottom: '4px',
              background: 'linear-gradient(160deg, #ffffff 30%, #6b7a96 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {daysToGo}
            </p>
            <p style={{ fontSize: '15px', fontWeight: 500, color: '#475569', marginBottom: '22px', letterSpacing: '-0.2px' }}>
              days to go · Week {block.current_week}/{block.total_weeks}
            </p>
          </>
        ) : (
          <p style={{ fontSize: '15px', color: '#475569', marginBottom: '22px' }}>No race date set</p>
        )}

        {/* Time cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid #1a2130',
            borderRadius: '14px', padding: '14px 16px',
          }}>
            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>Est. now</p>
            <p style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>{estNow}</p>
<p style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>if you raced today</p>
          </div>
          <div style={{
            background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)',
            borderRadius: '14px', padding: '14px 16px',
          }}>
            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(249,115,22,0.6)', marginBottom: '6px' }}>Race proj.</p>
            <p style={{ fontSize: '22px', fontWeight: 800, color: '#f97316', letterSpacing: '-0.5px' }}>{raceProj}</p>
            <p style={{ fontSize: '11px', color: '#334155', marginTop: '3px' }}>
              {block.race_date ? `on ${new Date(block.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {block.est_now_seconds && block.race_proj_seconds && (
          <>
            <div style={{ height: '3px', background: '#1f1f1f', borderRadius: '10px', position: 'relative', marginBottom: '4px' }}>
              <div style={{
                height: '3px', borderRadius: '10px', position: 'relative',
                width: `${Math.min(100, Math.max(5, Math.round((block.current_week / block.total_weeks) * 100)))}%`,
                background: 'linear-gradient(90deg, #c2410c, #f97316)',
              }}>
                <div style={{
                  width: '11px', height: '11px', background: '#f97316',
                  borderRadius: '50%', position: 'absolute', right: '-5px', top: '-4px',
                  boxShadow: '0 0 10px rgba(249,115,22,0.7)',
                }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '6px' }}>
              <span style={{ color: '#64748b' }}>Est. now {estNow}</span>
              <span style={{ color: '#f97316', fontWeight: 600 }}>Race proj. {raceProj}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}