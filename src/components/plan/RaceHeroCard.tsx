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

function getPhase(week: number, total: number): string {
  const pct = week / total
  if (pct <= 0.25) return 'base'
  if (pct <= 0.625) return 'build'
  if (pct <= 0.875) return 'peak'
  return 'taper'
}

const PHASE_COLOURS: Record<string, string> = {
  base: '#60A5FA', build: '#FB923C', peak: '#F87171', taper: '#A3A3A3',
}
const PHASE_LABELS: Record<string, string> = {
  base: 'Base', build: 'Build', peak: 'Peak', taper: 'Taper',
}

export default function RaceHeroCard({ block }: { block: Block }) {
  const daysToGo = block.race_date
    ? Math.max(0, differenceInDays(parseISO(block.race_date), new Date()))
    : null
  const phase = getPhase(block.current_week, block.total_weeks)
  const phaseColour = PHASE_COLOURS[phase]
  const progress = Math.round((block.current_week / block.total_weeks) * 100)

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: 'linear-gradient(135deg, #18181B 0%, #09090B 60%, #1C0A00 100%)',
      border: '1px solid #27272A',
    }}>
      <div className="px-5 pt-5 pb-4">

        {/* Block name + phase pill */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-zinc-300">{block.name}</p>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{
            backgroundColor: `${phaseColour}22`,
            color: phaseColour,
            border: `1px solid ${phaseColour}44`,
          }}>
            {PHASE_LABELS[phase]} · Week {block.current_week} of {block.total_weeks}
          </span>
        </div>

        {/* Countdown */}
        <div className="text-center my-6">
          {daysToGo !== null ? (
            <>
              <p className="text-white font-extrabold" style={{ fontSize: '5rem', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {daysToGo}
              </p>
              <p className="text-sm text-zinc-400 mt-1 tracking-widest uppercase">days to go</p>
            </>
          ) : (
            <p className="text-zinc-400 text-sm">No race date set</p>
          )}
        </div>

        {/* Est now / Race proj */}
        <div className="flex items-end justify-between mt-2">
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Est. now</p>
            <p className="text-2xl font-extrabold text-zinc-200" style={{ letterSpacing: '-0.04em' }}>
              {formatTime(block.est_now_seconds)}
            </p>
          </div>
          <div className="flex-1 mx-4">
            <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: phaseColour }} />
            </div>
            <p className="text-center text-[10px] text-zinc-600 mt-1">{progress}% complete</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 mb-0.5">Race proj.</p>
            <p className="text-2xl font-extrabold" style={{ letterSpacing: '-0.04em', color: 'var(--accent)' }}>
              {formatTime(block.race_proj_seconds)}
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}