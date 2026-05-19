'use client';

import { useState, useRef, useEffect } from 'react';
import { Workout } from '@/lib/types';
import WorkoutModal, { ModalMode } from './WorkoutModal';

type Props = {
  weekNumber: number;
  plannedKm: number;
  completedKm: number;
  sessionsTotal: number;
  sessionsDone: number;
  workouts: Workout[];
  phaseName: string | null;
  isCurrent: boolean;
  allWorkouts: Workout[];
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

function fmtPace(s: number | null | undefined) {
  if (!s) return null;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}/km`;
}

export default function WeekRow({
  weekNumber, plannedKm, completedKm, sessionsTotal, sessionsDone,
  workouts, phaseName, isCurrent, allWorkouts,
}: Props) {
  const [open, setOpen] = useState(isCurrent);
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    new Set(workouts.filter(w => w.is_complete).map(w => w.id))
  )

  async function handleToggleComplete(workoutId: string) {
    const nowComplete = !completedIds.has(workoutId)
    setCompletedIds(prev => { const n = new Set(prev); nowComplete ? n.add(workoutId) : n.delete(workoutId); return n })
    try {
      await fetch('/api/workouts/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId, isComplete: nowComplete }),
      })
    } catch {
      setCompletedIds(prev => { const n = new Set(prev); nowComplete ? n.delete(workoutId) : n.add(workoutId); return n })
    }
  }
  const [hovered, setHovered] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

  const phaseColor = phaseName ? (PHASE_COLORS[phaseName] ?? '#71717a') : '#71717a';
  const phaseBg = phaseName ? (PHASE_BG[phaseName] ?? 'transparent') : 'transparent';
  const upcoming = completedKm === 0 && sessionsDone === 0 && weekNumber > 1;

  const nonRest = workouts
    .filter(w => w.type !== 'rest' && !w.skipped)
    .sort((a, b) => a.day_of_week - b.day_of_week);

  const progressPct = sessionsTotal > 0 ? Math.round((sessionsDone / sessionsTotal) * 100) : 0;
  const statusText = isCurrent ? 'in progress' : completedKm > 0 ? 'done' : 'upcoming';
  const statusColor = isCurrent ? '#F97316' : completedKm > 0 ? '#10b981' : '#3f3f46';

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [open, compareMode, nonRest.length]);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); }
      else if (next.size < 3) { next.add(id); }
      return next;
    });
  }

  function openCompare() {
    const selectedWorkouts = nonRest.filter(w => selected.has(w.id));
    if (selectedWorkouts.length === 0) return;
    const types = selectedWorkouts.map(w => w.type);
    const crossWeek = allWorkouts.filter(w =>
      w.week_number !== weekNumber &&
      types.includes(w.type) &&
      w.type !== 'rest' &&
      !w.skipped
    );
    const toCompare = [...selectedWorkouts, ...crossWeek].slice(0, 3);
    setModal({ type: 'compare', workouts: toCompare });
    setCompareMode(false);
    setSelected(new Set());
  }

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <>
      {modal && <WorkoutModal mode={modal} onClose={() => setModal(null)} />}

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: '8px',
          background: isCurrent
            ? 'rgba(249,115,22,0.04)'
            : hovered ? 'rgba(255,255,255,0.02)' : '#111',
          border: isCurrent
            ? '1px solid rgba(249,115,22,0.18)'
            : hovered ? '1px solid #2e2e2e' : '1px solid #1a1a1a',
          marginBottom: '4px',
          overflow: 'hidden',
          transition: 'border-color 0.2s, background 0.2s',
          transform: hovered && !open ? 'translateX(2px)' : 'translateX(0)',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 14px' }}>
          <button
            onClick={() => setOpen(!open)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 0, display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0,
            }}
          >
            {/* Colour bar */}
            <div style={{
              width: '3px', borderRadius: '2px', alignSelf: 'stretch', minHeight: '28px',
              flexShrink: 0, background: phaseColor, opacity: upcoming ? 0.3 : 1,
              boxShadow: isCurrent ? `0 0 6px ${phaseColor}80` : hovered ? `0 0 8px ${phaseColor}60` : 'none',
              transition: 'box-shadow 0.2s',
            }} />

            {/* Week label */}
            <span style={{
              fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
              minWidth: '64px',
              color: isCurrent ? '#F97316' : upcoming ? '#52525b' : '#f5f5f5',
            }}>
              Week {weekNumber}{isCurrent ? <span style={{ fontSize: '10px', color: '#52525b', fontWeight: 400 }}> · now</span> : ''}
            </span>

            {/* Phase pill */}
            {phaseName && (
              <span style={{
                fontSize: '9px', padding: '2px 7px', borderRadius: '10px', fontWeight: 600,
                color: phaseColor, background: phaseBg, flexShrink: 0, whiteSpace: 'nowrap',
              }}>
                {phaseName}
              </span>
            )}

            {/* km */}
            <span style={{
              fontSize: '12px', color: upcoming ? '#52525b' : '#a1a1aa',
              flex: 1, textAlign: 'right', whiteSpace: 'nowrap',
            }}>
              {plannedKm.toFixed(0)} km
            </span>

            {/* Status */}
            <span style={{ fontSize: '11px', color: statusColor, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {statusText}
            </span>

            {/* Chevron */}
            <span style={{
              fontSize: '12px', color: '#3f3f46', flexShrink: 0,
              transition: 'transform 0.3s ease', display: 'inline-block',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}>▾</span>
          </button>

          {/* Compare button */}
          {open && nonRest.length > 1 && (
            <button
              onClick={() => { setCompareMode(!compareMode); setSelected(new Set()); }}
              style={{
                padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 600,
                background: compareMode ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.06)',
                border: compareMode ? '1px solid rgba(249,115,22,0.4)' : '1px solid rgba(249,115,22,0.2)',
                color: '#F97316', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {compareMode ? 'Cancel' : 'Compare'}
            </button>
          )}
        </div>

        {/* Animated expand/collapse wrapper */}
        <div style={{
          maxHeight: open ? `${contentHeight || 2000}px` : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.35s ease',
        }}>
          <div ref={contentRef} style={{ borderTop: '1px solid #1a1a1a', padding: '12px 14px 14px' }}>

            {/* Summary strip */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: '0',
              paddingBottom: '10px', borderBottom: '1px solid #1a1a1a', marginBottom: '10px',
            }}>
              {[
                { label: 'Total', value: `${plannedKm.toFixed(0)} km` },
                { label: 'Done', value: `${completedKm.toFixed(0)} km`, color: completedKm > 0 ? '#10b981' : undefined },
                { label: 'Sessions', value: `${sessionsDone}/${sessionsTotal}` },
                { label: 'Phase', value: phaseName ?? '—', color: phaseColor },
              ].map(({ label, value, color }, idx, arr) => (
                <div key={label} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                  flex: 1, textAlign: 'center',
                  borderRight: idx < arr.length - 1 ? '1px solid #1f1f1f' : 'none',
                  padding: '0 8px',
                }}>
                  <span style={{ fontSize: '9px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: color ?? '#f5f5f5' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ height: '3px', background: '#1f1f1f', borderRadius: '2px', marginBottom: '12px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '2px',
                width: `${progressPct}%`,
                background: '#10b981',
                transition: 'width 0.6s ease',
              }} />
            </div>

            {/* Compare mode hint */}
            {compareMode && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between',
                background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)',
                borderRadius: '8px', padding: '8px 12px', marginBottom: '10px',
              }}>
                <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0 }}>
                  Select runs — comparing across all weeks by type
                </p>
                {selected.size >= 1 && (
                  <button
                    onClick={openCompare}
                    style={{
                      padding: '5px 14px', borderRadius: '7px', fontSize: '11px', fontWeight: 700,
                      background: '#F97316', border: 'none', color: '#000', cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    Compare ({selected.size})
                  </button>
                )}
              </div>
            )}

            {/* Workout cards */}
            {nonRest.map((w, idx) => {
              const wColor = WORKOUT_COLORS[w.type] ?? '#71717a';
              const isSelected = selected.has(w.id);
              const pace = fmtPace(w.pace_min_seconds);
              const dayName = w.day_of_week !== null && w.day_of_week !== undefined
                ? DAY_NAMES[w.day_of_week] : '';

              return (
                <div
                  key={w.id}
                  onClick={() => {
                    if (compareMode) { toggleSelect(w.id); }
                    else { setModal({ type: 'single', workout: w }); }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '11px 12px', borderRadius: '8px',
                    background: isSelected ? 'rgba(249,115,22,0.08)' : '#0d0d0d',
                    border: isSelected ? '1px solid rgba(249,115,22,0.35)' : '1px solid #1f1f1f',
                    marginBottom: idx < nonRest.length - 1 ? '6px' : '0',
                    cursor: 'pointer', transition: 'all 0.15s',
                    opacity: upcoming ? 0.65 : 1,
                    animation: `fadeIn 0.2s ease ${idx * 40}ms both`,
                  }}
                  onMouseEnter={e => { if (!compareMode) { e.currentTarget.style.background = '#161616'; e.currentTarget.style.borderColor = '#2e2e2e'; }}}
                  onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(249,115,22,0.08)' : '#0d0d0d'; e.currentTarget.style.borderColor = isSelected ? 'rgba(249,115,22,0.35)' : '#1f1f1f'; }}
                >
                  {compareMode && (
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                      border: isSelected ? '2px solid #F97316' : '1.5px solid #2e2e2e',
                      background: isSelected ? 'rgba(249,115,22,0.2)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isSelected && <span style={{ fontSize: '11px', color: '#F97316' }}>✓</span>}
                    </div>
                  )}

                  <div style={{ width: '4px', borderRadius: '2px', alignSelf: 'stretch', minHeight: '36px', flexShrink: 0, background: wColor }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#f5f5f5', margin: 0 }}>{w.name}</p>
                    <p style={{ fontSize: '11px', color: '#71717a', margin: '2px 0 0' }}>
                      {dayName}{w.description ? ` · ${w.description.slice(0, 60)}${w.description.length > 60 ? '…' : ''}` : ''}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#f5f5f5', margin: 0 }}>
                      {w.distance_km ? `${Number(w.distance_km).toFixed(0)} km` : ''}
                    </p>
                    {pace && <p style={{ fontSize: '11px', color: '#71717a', margin: '1px 0 0' }}>{pace}</p>}
                  </div>

                  {!compareMode && (
                    <button
                      onClick={e => { e.stopPropagation(); handleToggleComplete(w.id) }}
                      style={{
                        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                        border: completedIds.has(w.id) ? '1.5px solid #10b981' : '1.5px solid #2e2e2e',
                        background: completedIds.has(w.id) ? 'rgba(16,185,129,0.12)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: '13px',
                        color: completedIds.has(w.id) ? '#10b981' : '#52525b',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      {completedIds.has(w.id) ? '✓' : '○'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}