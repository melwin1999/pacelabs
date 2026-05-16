'use client';

import { useState } from 'react';
import { Workout, WorkoutStructureStep } from '@/lib/types';

const TYPE_COLORS: Record<string, string> = {
  easy: '#86EFAC', long: '#FCD34D', tempo: '#FB923C', threshold: '#F87171',
  intervals: '#C084FC', recovery: '#93C5FD', race: '#F97316', rest: '#3F3F46',
  strides: '#86EFAC', fartlek: '#67E8F9', progression: '#A3E635', custom: '#A3A3A3',
};

function fmtPace(s: number | null | undefined) {
  if (!s) return '—';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}/km`;
}

function StructureSegments({ steps }: { steps: WorkoutStructureStep[] }) {
  const DOT: Record<string, string> = {
    warmup: '#93C5FD', cooldown: '#86EFAC', interval: '#C084FC',
    rest: '#3F3F46', steady: '#FCD34D', main: '#FB923C',
  };
  return (
    <>
      {steps.map((step, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          padding: '8px 0', borderBottom: i < steps.length - 1 ? '1px solid #1a1a1a' : 'none',
        }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50', flexShrink: 0, marginTop: '4px',
            background: DOT[step.type] ?? '#F97316',
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#f5f5f5' }}>
                {step.type}{step.reps ? ` × ${step.reps}` : ''}
              </span>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                {step.km && <div style={{ fontSize: '12px', color: '#a1a1aa' }}>{step.reps ? `${step.km} km each` : `${step.km} km`}</div>}
                {step.pace && <div style={{ fontSize: '11px', color: '#52525b' }}>{step.pace}</div>}
              </div>
            </div>
            {step.notes && <p style={{ fontSize: '12px', color: '#71717a', marginTop: '2px', lineHeight: 1.4 }}>{step.notes}</p>}
            {step.rest_seconds && (
              <p style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>
                Recovery: {step.rest_seconds}s {step.rest_type ?? ''}
              </p>
            )}
            {step.segments?.map((seg, j) => (
              <p key={j} style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>
                {seg.km}km @ {seg.pace}{seg.notes ? ` — ${seg.notes}` : ''}
              </p>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function SingleView({ workout, onClose, onMarkComplete }: {
  workout: Workout;
  onClose: () => void;
  onMarkComplete?: (id: string) => void;
}) {
  const color = TYPE_COLORS[workout.type] ?? '#A3A3A3';
  const steps = workout.structure ?? [];

  return (
    <div style={{
      background: '#111', border: '1px solid #2e2e2e', borderRadius: '14px',
      width: '100%', maxWidth: '480px', maxHeight: '85vh',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      animation: 'modalIn 0.2s cubic-bezier(0.34,1.20,0.64,1)',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #1f1f1f', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 600, color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {workout.type}
            </p>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f5f5f5', margin: '3px 0 2px', letterSpacing: '-0.5px' }}>
              {workout.name}
            </h2>
            <p style={{ fontSize: '12px', color: '#71717a' }}>
              {workout.scheduled_date
                ? new Date(workout.scheduled_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                : `Week ${workout.week_number}`}
              {' · Week '}{workout.week_number}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: '32px', height: '32px', borderRadius: '50%', background: '#1a1a1a',
            border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: '16px', color: '#a1a1aa', lineHeight: 1 }}>×</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
        {workout.description && (
          <div style={{
            fontSize: '13px', color: '#a1a1aa', lineHeight: 1.5,
            background: '#0d0d0d', borderLeft: '3px solid #2e2e2e',
            borderRadius: '0 8px 8px 0', padding: '10px 12px', marginBottom: '14px',
          }}>
            {workout.description}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '14px' }}>
          {[
            { label: 'Distance', value: workout.distance_km ? `${Number(workout.distance_km).toFixed(0)} km` : '—' },
            { label: 'Pace', value: workout.pace_min_seconds ? fmtPace(workout.pace_min_seconds) : '—' },
            { label: 'HR zone', value: workout.hr_zone ?? '—' },
            { label: 'Primary', value: workout.primary_metric ?? '—', accent: true },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{ background: '#0d0d0d', border: '1px solid #1f1f1f', borderRadius: '8px', padding: '8px 10px' }}>
              <p style={{ fontSize: '9px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
              <p style={{ fontSize: '14px', fontWeight: 700, color: accent ? '#F97316' : '#f5f5f5', marginTop: '2px' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Fuelling */}
        {workout.fuelling_note && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '8px',
            background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
            borderRadius: '8px', padding: '10px 12px', marginBottom: '14px',
          }}>
            <span style={{ fontSize: '14px', flexShrink: 0 }}>🔥</span>
            <p style={{ fontSize: '12px', color: '#a1a1aa', lineHeight: 1.4 }}>{workout.fuelling_note}</p>
          </div>
        )}

        {/* Structure */}
        {steps.length > 0 && (
          <>
            <p style={{ fontSize: '10px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Session structure
            </p>
            <StructureSegments steps={steps} />
          </>
        )}
      </div>

      {/* Footer */}
      {onMarkComplete && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid #1f1f1f', flexShrink: 0 }}>
          <button
            onClick={() => { onMarkComplete(workout.id); onClose(); }}
            style={{
              width: '100%', background: workout.is_complete ? '#1a1a1a' : '#10b981',
              border: workout.is_complete ? '1px solid #2e2e2e' : 'none',
              borderRadius: '10px', padding: '13px',
              color: workout.is_complete ? '#52525b' : '#fff',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            {workout.is_complete ? '✓ Completed' : '◎ Mark as complete'}
          </button>
        </div>
      )}
    </div>
  );
}

function CompareView({ workouts, onClose }: { workouts: Workout[]; onClose: () => void }) {
  return (
    <div style={{
      background: '#111', border: '1px solid #2e2e2e', borderRadius: '14px',
      width: '100%', maxWidth: '780px', maxHeight: '85vh',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      animation: 'modalIn 0.2s cubic-bezier(0.34,1.20,0.64,1)',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#f5f5f5' }}>Comparing {workouts.length} runs</p>
          <p style={{ fontSize: '11px', color: '#71717a', marginTop: '1px' }}>Planned workouts · tap any column to open full detail</p>
        </div>
        <button onClick={onClose} style={{
          width: '30px', height: '30px', borderRadius: '50%', background: '#1a1a1a',
          border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '16px', color: '#a1a1aa', lineHeight: 1 }}>×</span>
        </button>
      </div>

      {/* Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${workouts.length}, 1fr)`, flex: 1, overflowY: 'auto' }}>
        {workouts.map((w, colIdx) => {
          const color = TYPE_COLORS[w.type] ?? '#A3A3A3';
          const steps = w.structure ?? [];
          return (
            <div key={w.id} style={{
              borderRight: colIdx < workouts.length - 1 ? '1px solid #1a1a1a' : 'none',
              padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              {/* Identity */}
              <div>
                <p style={{ fontSize: '9px', fontWeight: 600, color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{w.type}</p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#f5f5f5', margin: '2px 0', lineHeight: 1.2 }}>{w.name}</p>
                <p style={{ fontSize: '11px', color: '#71717a' }}>Week {w.week_number}</p>
              </div>

              <div style={{ height: '1px', background: '#1a1a1a' }} />

              {/* Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {[
                  { label: 'Distance', value: w.distance_km ? `${Number(w.distance_km).toFixed(0)} km` : '—' },
                  { label: 'Pace range', value: w.pace_min_seconds ? `${fmtPace(w.pace_min_seconds)}${w.pace_max_seconds ? `–${fmtPace(w.pace_max_seconds)}` : ''}` : '—' },
                  { label: 'HR zone', value: w.hr_zone ?? '—' },
                  { label: 'Primary', value: w.primary_metric ?? '—', accent: true },
                ].map(({ label, value, accent }) => (
                  <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#0d0d0d', border: '1px solid #1f1f1f', borderRadius: '7px', padding: '6px 9px',
                  }}>
                    <span style={{ fontSize: '10px', color: '#52525b' }}>{label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: accent ? '#F97316' : '#f5f5f5' }}>{value}</span>
                  </div>
                ))}
              </div>

              <div style={{ height: '1px', background: '#1a1a1a' }} />

              {/* Structure */}
              {steps.length > 0 ? (
                <div>
                  <p style={{ fontSize: '9px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Structure</p>
                  <StructureSegments steps={steps} />
                </div>
              ) : (
                <p style={{ fontSize: '11px', color: '#3f3f46', fontStyle: 'italic' }}>No structure defined</p>
              )}

              {/* Fuelling */}
              {w.fuelling_note && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '6px',
                  background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.18)',
                  borderRadius: '7px', padding: '7px 9px',
                }}>
                  <span style={{ fontSize: '12px', flexShrink: 0 }}>🔥</span>
                  <p style={{ fontSize: '10px', color: '#a1a1aa', lineHeight: 1.4 }}>{w.fuelling_note}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type ModalMode =
  | { type: 'single'; workout: Workout; onMarkComplete?: (id: string) => void }
  | { type: 'compare'; workouts: Workout[] };

export default function WorkoutModal({ mode, onClose }: { mode: ModalMode; onClose: () => void }) {
  return (
    <>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
          animation: 'overlayIn 0.15s ease',
        }}
      >
        <div onClick={e => e.stopPropagation()}>
          {mode.type === 'single'
            ? <SingleView workout={mode.workout} onClose={onClose} onMarkComplete={mode.onMarkComplete} />
            : <CompareView workouts={mode.workouts} onClose={onClose} />
          }
        </div>
      </div>
    </>
  );
}