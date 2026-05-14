'use client';

import { Phase } from '@/lib/types';

type Props = {
  phases: Phase[];
  totalWeeks: number;
};

const PHASE_COLORS: Record<string, string> = {
  Base: '#60A5FA',
  Build: '#FB923C',
  Peak: '#F87171',
  Taper: '#A3A3A3',
  Maintain: '#A3E635',
};

const PHASE_ABBREV: Record<string, string> = {
  Base: 'B',
  Build: 'Bd',
  Peak: 'P',
  Taper: 'T',
  Maintain: 'M',
};

export default function PhaseStrip({ phases, totalWeeks }: Props) {
  if (!phases || phases.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
        Phases
      </h2>
      <div className="flex w-full h-9 sm:h-10 rounded-lg overflow-hidden border border-[var(--border)]">
        {phases.map((phase, idx) => {
          const weekCount = phase.end_week - phase.start_week + 1;
          const widthPct = (weekCount / totalWeeks) * 100;
          const color = PHASE_COLORS[phase.name] ?? '#71717A';
          const fullLabel = `${phase.name} · ${phase.start_week}–${phase.end_week}`;
          const abbrevLabel = `${
            PHASE_ABBREV[phase.name] ?? phase.name.charAt(0)
          } · ${phase.start_week}-${phase.end_week}`;

          return (
            <div
              key={`${phase.name}-${idx}`}
              className="flex items-center justify-center text-[11px] sm:text-xs font-semibold relative overflow-hidden"
              style={{
                width: `${widthPct}%`,
                background: color,
                color: '#09090B',
              }}
            >
              <span className="hidden sm:inline truncate px-1">
                {fullLabel}
              </span>
              <span className="sm:hidden truncate px-0.5">{abbrevLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}