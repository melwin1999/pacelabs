'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
  Base: '#60A5FA',
  Build: '#FB923C',
  Peak: '#F87171',
  Taper: '#A3A3A3',
  Maintain: '#A3E635',
};

const WORKOUT_TYPE_COLORS: Record<string, string> = {
  easy: '#86EFAC',
  long: '#FCD34D',
  tempo: '#FB923C',
  threshold: '#F87171',
  intervals: '#C084FC',
  recovery: '#93C5FD',
  race: '#F97316',
  rest: '#3F3F46',
  strides: '#86EFAC',
  fartlek: '#67E8F9',
  progression: '#A3E635',
  custom: '#A3A3A3',
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeekRow({
  weekNumber,
  plannedKm,
  completedKm,
  sessionsTotal,
  sessionsDone,
  workouts,
  phaseName,
  isCurrent,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const phaseColor = phaseName ? PHASE_COLORS[phaseName] ?? '#71717A' : '#71717A';

  const sortedWorkouts = [...workouts].sort(
    (a, b) => a.day_of_week - b.day_of_week
  );

  const workoutsByDay = new Map<number, Workout>();
  for (const w of sortedWorkouts) {
    if (!workoutsByDay.has(w.day_of_week)) {
      workoutsByDay.set(w.day_of_week, w);
    }
  }

  const sessionDots = sortedWorkouts.filter(
    (w) => w.type !== 'rest' && !w.skipped
  );

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: 'var(--bg-card)',
        border: isCurrent
          ? '1.5px solid var(--accent)'
          : '1px solid var(--border)',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-stretch text-left hover:bg-white/[0.02] transition-colors"
      >
        <div
          className="w-1 flex-shrink-0"
          style={{ background: phaseColor }}
        />

        <div className="flex-1 flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 min-w-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="text-[var(--text-muted)] flex-shrink-0">
              {expanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </div>

            <div className="flex-shrink-0 min-w-0">
              <div
                className="font-semibold text-sm sm:text-base"
                style={{
                  color: isCurrent ? 'var(--accent)' : 'var(--text)',
                }}
              >
                Week {weekNumber}
              </div>
              {phaseName && (
                <div className="text-[11px] text-[var(--text-muted)] hidden sm:block">
                  {phaseName}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 ml-auto sm:ml-4">
              {sessionDots.map((w) => (
                <div
                  key={w.id}
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background: WORKOUT_TYPE_COLORS[w.type] ?? '#A3A3A3',
                    opacity: w.is_complete ? 1 : 0.55,
                  }}
                  title={`${w.name} (${w.type})`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 ml-3 flex-shrink-0">
            <div className="text-right">
              <div
                className="text-sm sm:text-base font-bold tabular-nums"
                style={{ letterSpacing: '-0.02em' }}
              >
                {plannedKm.toFixed(1)}
                <span className="text-[var(--text-muted)] font-normal text-xs">
                  {' '}
                  km
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-[var(--text-muted)]">
                {sessionsDone}/{sessionsTotal} done
              </div>
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div
          className="border-t px-4 py-4 sm:px-6 sm:py-5"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-5">
            {DAY_LABELS.map((dayLabel, dayIdx) => {
              const wo = workoutsByDay.get(dayIdx);
              const typeColor = wo
                ? WORKOUT_TYPE_COLORS[wo.type] ?? '#A3A3A3'
                : '#3F3F46';
              return (
                <div
                  key={dayIdx}
                  className="rounded-lg p-2 sm:p-2.5 min-h-[64px] sm:min-h-[72px] flex flex-col"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background: typeColor,
                        opacity: wo?.is_complete ? 1 : 0.6,
                      }}
                    />
                    <div className="text-[10px] sm:text-[11px] text-[var(--text-muted)] font-medium">
                      {dayLabel}
                    </div>
                  </div>
                  {wo ? (
                    <>
                      <div
                        className="text-[11px] sm:text-xs font-medium leading-tight truncate"
                        style={{
                          color:
                            wo.skipped || wo.type === 'rest'
                              ? 'var(--text-muted)'
                              : 'var(--text)',
                          textDecoration: wo.skipped ? 'line-through' : 'none',
                        }}
                        title={wo.name}
                      >
                        {wo.name}
                      </div>
                      {wo.type !== 'rest' && (
                        <div className="text-[10px] sm:text-[11px] text-[var(--text-muted)] mt-auto tabular-nums">
                          {Number(wo.distance_km).toFixed(1)}km
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-[11px] text-[var(--text-muted)] opacity-50">
                      —
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 p-3 sm:p-4 rounded-lg"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)',
            }}
          >
            <div>
              <div className="text-[10px] sm:text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                Planned
              </div>
              <div
                className="text-base sm:text-lg font-bold tabular-nums"
                style={{ letterSpacing: '-0.02em' }}
              >
                {plannedKm.toFixed(1)}
                <span className="text-xs text-[var(--text-muted)] font-normal">
                  {' '}km
                </span>
              </div>
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                Done
              </div>
              <div
                className="text-base sm:text-lg font-bold tabular-nums"
                style={{
                  letterSpacing: '-0.02em',
                  color: completedKm > 0 ? 'var(--success)' : 'var(--text)',
                }}
              >
                {completedKm.toFixed(1)}
                <span className="text-xs text-[var(--text-muted)] font-normal">
                  {' '}km
                </span>
              </div>
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                Avg easy pace
              </div>
              <div
                className="text-base sm:text-lg font-bold tabular-nums text-[var(--text-muted)]"
                style={{ letterSpacing: '-0.02em' }}
              >
                —
              </div>
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                Avg easy HR
              </div>
              <div
                className="text-base sm:text-lg font-bold tabular-nums text-[var(--text-muted)]"
                style={{ letterSpacing: '-0.02em' }}
              >
                —
              </div>
            </div>
          </div>

          <Link
            href={`/?week=${weekNumber}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: 'var(--accent)',
              color: '#09090B',
            }}
          >
            Open this week in Plan →
          </Link>
        </div>
      )}
    </div>
  );
}