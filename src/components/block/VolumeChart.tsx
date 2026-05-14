'use client';

import { Phase } from '@/lib/types';

type WeekSummary = {
  weekNumber: number;
  plannedKm: number;
  completedKm: number;
  sessionsTotal: number;
  sessionsDone: number;
};

type Props = {
  weekSummaries: WeekSummary[];
  phases: Phase[];
  currentWeek: number;
  totalWeeks: number;
};

const PHASE_COLORS: Record<string, string> = {
  Base: '#60A5FA',
  Build: '#FB923C',
  Peak: '#F87171',
  Taper: '#A3A3A3',
  Maintain: '#A3E635',
};

const SUCCESS_COLOR = '#22C55E';

function phaseColorForWeek(weekNum: number, phases: Phase[]): string {
  const p = phases.find(
    (ph) => weekNum >= ph.start_week && weekNum <= ph.end_week
  );
  if (!p) return '#71717A';
  return PHASE_COLORS[p.name] ?? '#71717A';
}

export default function VolumeChart({
  weekSummaries,
  phases,
  currentWeek,
  totalWeeks,
}: Props) {
  const maxPlanned = Math.max(
    1,
    ...weekSummaries.map((w) => Math.max(w.plannedKm, w.completedKm))
  );

  const chartHeight = 180;
  const labelHeight = 24;

  return (
    <div className="w-full">
      <div className="relative">
        <div className="relative" style={{ height: chartHeight }}>
          {/* 100% line */}
          <div
            className="absolute left-0 right-0 border-t border-dashed pointer-events-none"
            style={{ borderColor: 'var(--border)', top: 0 }}
          />
          {/* 50% line */}
          <div
            className="absolute left-0 right-0 border-t border-dashed pointer-events-none"
            style={{ borderColor: 'var(--border)', top: chartHeight / 2 }}
          />
          {/* Baseline */}
          <div
            className="absolute left-0 right-0 border-t pointer-events-none"
            style={{ borderColor: 'var(--border)', bottom: 0 }}
          />

          {/* Y-axis labels */}
          <div
            className="absolute -left-1 text-[10px] text-[var(--text-muted)] -translate-y-1/2"
            style={{ top: 0 }}
          >
            {Math.round(maxPlanned)}
          </div>
          <div
            className="absolute -left-1 text-[10px] text-[var(--text-muted)] -translate-y-1/2"
            style={{ top: chartHeight / 2 }}
          >
            {Math.round(maxPlanned / 2)}
          </div>

          {/* Bars */}
          <div
            className="absolute inset-0 flex items-end justify-between"
            style={{ paddingLeft: 18, gap: totalWeeks > 16 ? 2 : 4 }}
          >
            {weekSummaries.map((w) => {
              const plannedH =
                w.plannedKm > 0
                  ? Math.max(2, (w.plannedKm / maxPlanned) * chartHeight)
                  : 0;
              const completedH =
                w.completedKm > 0
                  ? Math.max(2, (w.completedKm / maxPlanned) * chartHeight)
                  : 0;
              const phaseColor = phaseColorForWeek(w.weekNumber, phases);
              const isCurrent = w.weekNumber === currentWeek;

              return (
                <div
                  key={w.weekNumber}
                  className="flex-1 flex items-end justify-center h-full relative group"
                  style={{ minWidth: 0 }}
                >
                  {isCurrent && (
                    <div
                      className="absolute inset-x-0 rounded-md pointer-events-none"
                      style={{
                        border: '1.5px solid var(--accent)',
                        bottom: -4,
                        top: -4,
                      }}
                    />
                  )}
                  <div
                    className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                  >
                    W{w.weekNumber}: {w.plannedKm.toFixed(1)}km plan ·{' '}
                    {w.completedKm.toFixed(1)}km done
                  </div>
                  <div
                    className="flex items-end justify-center w-full h-full"
                    style={{ gap: 1 }}
                  >
                    <div
                      className="flex-1 rounded-t-sm transition-opacity"
                      style={{
                        height: plannedH,
                        background: phaseColor,
                        opacity: 0.85,
                        maxWidth: 12,
                      }}
                    />
                    <div
                      className="flex-1 rounded-t-sm"
                      style={{
                        height: completedH,
                        background: SUCCESS_COLOR,
                        maxWidth: 12,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Week number labels */}
        <div
          className="flex justify-between mt-2"
          style={{
            paddingLeft: 18,
            height: labelHeight,
            gap: totalWeeks > 16 ? 2 : 4,
          }}
        >
          {weekSummaries.map((w) => {
            const isCurrent = w.weekNumber === currentWeek;
            const showLabel =
              totalWeeks <= 16
                ? true
                : w.weekNumber === 1 ||
                  w.weekNumber === totalWeeks ||
                  w.weekNumber % 2 === 0 ||
                  isCurrent;
            return (
              <div
                key={w.weekNumber}
                className="flex-1 text-center text-[10px] font-medium"
                style={{
                  minWidth: 0,
                  color: isCurrent ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: isCurrent ? 700 : 500,
                }}
              >
                {showLabel ? w.weekNumber : ''}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-[var(--text-muted)] flex-wrap">
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: '#71717A', opacity: 0.85 }}
            />
            <span>Planned (phase colour)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: SUCCESS_COLOR }}
            />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ border: '1.5px solid var(--accent)' }}
            />
            <span>Current week</span>
          </div>
        </div>
      </div>
    </div>
  );
}