'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Workout } from '@/lib/types';

type Props = {
  weekNumber: number;
  plannedKm: number;
  completedKm: number;
  sessionsTotal: number;
  sessionsDone: number;
  workouts: Workout[];
  phaseName: string | null;
  isCurrent: boolean;
};

const PHASE_COLORS: Record<string, string> = {
  Base: '#60A5FA', Build: '#FB923C', Peak: '#F87171', Taper: '#F97316', Maintain: '#A3E635',
};
const PHASE_BG: Record<string, string> = {
  Base: 'rgba(96,165,250,0.1)', Build: 'rgba(251,146,60,0.1)',
  Peak: 'rgba(248,113,113,0.1)', Taper: 'rgba(249,115,22,0.08)', Maintain: 'rgba(163,230,53,0.08)',
};
const WORKOUT_COLORS: Record<string, string> = {
  easy: '#86EFAC', long: '#FCD34D', tempo: '#FB923C', threshold: '#F87171',
  intervals: '#C084FC', recovery: '#93C5FD', race: '#F97316', rest: '#3F3F46',
  strides: '#86EFAC', fartlek: '#67E8F9', progression: '#A3E635', custom: '#A3A3A3',
};

export default function WeekRow({
  weekNumber, plannedKm, completedKm, sessionsTotal, sessionsDone,
  workouts, phaseName, isCurrent,
}: Props) {
  const [open, setOpen] = useState(isCurrent);
  const [hovered, setHovered] = useState(false);

  const phaseColor = phaseName ? (PHASE_COLORS[phaseName] ?? '#71717a') : '#71717a';
  const phaseBg = phaseName ? (PHASE_BG[phaseName] ?? 'transparent') : 'transparent';
  const upcoming = completedKm === 0 && sessionsDone === 0 && weekNumber > 1;

  const nonRest = workouts
    .filter(w => w.type !== 'rest' && !w.skipped)
    .sort((a, b) => a.day_of_week - b.day_of_week);

  const statusText = isCurrent ? 'in progress' : completedKm > 0 ? 'done' : 'upcoming';
  const statusColor = isCurrent ? '#F97316' : completedKm > 0 ? '#10b981' : '#3f3f46';

  return (
    <div
      style={{
        borderRadius: '7px',
        background: isCurrent ? 'rgba(249,115,22,0.04)' : hovered && !open ? '#111' : '#111',
        border: isCurrent ? '1px solid rgba(249,115,22,0.18)' : '1px solid #1a1a1a',
        marginBottom: '3px',
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header row */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
          padding: '9px 12px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ width: '3px', borderRadius: '2px', alignSelf: 'stretch', minHeight: '24px', flexShrink: 0, background: phaseColor, opacity: upcoming ? 0.3 : 1 }} />

        <span style={{ fontSize: '11px', fontWeight: 700, color: isCurrent ? '#F97316' : upcoming ? '#52525b' : '#f5f5f5', minWidth: '60px' }}>
          Week {weekNumber}{isCurrent ? ' ←' : ''}
        </span>

        {phaseName && (
          <span style={{
            fontSize: '9px', padding: '2px 7px', borderRadius: '10px', fontWeight: 600,
            color: phaseColor, background: phaseBg, flexShrink: 0,
          }}>
            {phaseName}
          </span>
        )}

        <span style={{ fontSize: '11px', color: upcoming ? '#52525b' : '#a1a1aa', flex: 1, textAlign: 'right' }}>
          {plannedKm.toFixed(0)} km
        </span>

        <span style={{ fontSize: '10px', color: statusColor, minWidth: '64px', textAlign: 'right', flexShrink: 0 }}>
          {statusText}
        </span>

        <span style={{
          fontSize: '12px', color: '#3f3f46', flexShrink: 0,
          transition: 'transform 0.2s',
          display: 'inline-block',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>▾</span>
      </button>

      {/* Expanded content */}
      {open && (
        <div style={{ borderTop: '1px solid #1a1a1a', padding: '10px 12px 12px' }}>
          {/* Summary strip */}
          <div style={{ display: 'flex', gap: '16px', paddingBottom: '8px', borderBottom: '1px solid #1a1a1a', marginBottom: '8px' }}>
            {[
              { label: 'Total', value: `${plannedKm.toFixed(0)} km` },
              { label: 'Done', value: `${completedKm.toFixed(0)} km`, color: completedKm > 0 ? '#10b981' : undefined },
              { label: 'Sessions', value: `${sessionsDone}/${sessionsTotal}` },
              { label: 'Phase', value: phaseName ?? '—', color: phaseColor },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span style={{ fontSize: '9px', color: '#52525b' }}>{label}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: color ?? '#f5f5f5' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Mini workout list */}
          {nonRest.map(w => (
            <div key={w.id} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '5px 8px', borderRadius: '5px', background: '#0d0d0d',
              marginBottom: '2px',
              opacity: upcoming ? 0.6 : 1,
              transition: 'background 0.12s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#161616')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0d0d0d')}
            >
              <div style={{ width: '3px', borderRadius: '2px', alignSelf: 'stretch', minHeight: '20px', flexShrink: 0, background: WORKOUT_COLORS[w.type] ?? '#71717a' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#f5f5f5', flex: 1 }}>{w.name}</span>
              <span style={{ fontSize: '10px', color: '#71717a' }}>
                {w.distance_km ? `${Number(w.distance_km).toFixed(0)} km` : ''}
                {w.pace_min_seconds ? ` · ${Math.floor(w.pace_min_seconds / 60)}:${String(w.pace_min_seconds % 60).padStart(2, '0')}/km` : ''}
              </span>
              {w.is_complete && (
                <span style={{ fontSize: '10px', color: '#10b981' }}>✓</span>
              )}
            </div>
          ))}

          <Link
            href={`/?week=${weekNumber}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              marginTop: '10px', padding: '5px 12px', borderRadius: '6px',
              fontSize: '11px', fontWeight: 600,
              background: '#F97316', color: '#000', textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Open in Plan →
          </Link>
        </div>
      )}
    </div>
  );
}