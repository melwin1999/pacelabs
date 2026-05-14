import { supabase } from '@/lib/supabase';
import { Block, Workout, Phase } from '@/lib/types';
import VolumeChart from '@/components/block/VolumeChart';
import PhaseStrip from '@/components/block/PhaseStrip';
import WeekRow from '@/components/block/WeekRow';

export const dynamic = 'force-dynamic';

export default async function BlockPage() {
  // Fetch active block
  const { data: blockData, error: blockError } = await supabase
    .from('blocks')
    .select('*')
    .eq('status', 'active')
    .single();

  if (blockError || !blockData) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6">
        <div className="max-w-5xl mx-auto pt-12">
          <h1 className="text-3xl font-bold mb-2">Block</h1>
          <p className="text-[var(--text-muted)]">No active training block found.</p>
        </div>
      </div>
    );
  }

  const block = blockData as Block;

  // Fetch all workouts for the block, ordered
  const { data: workoutsData } = await supabase
    .from('workouts')
    .select('*')
    .eq('block_id', block.id)
    .order('week_number', { ascending: true })
    .order('day_of_week', { ascending: true });

  const workouts = (workoutsData ?? []) as Workout[];

  // Group workouts by week
  const workoutsByWeek = new Map<number, Workout[]>();
  for (let w = 1; w <= block.total_weeks; w++) {
    workoutsByWeek.set(w, []);
  }
  for (const wo of workouts) {
    const arr = workoutsByWeek.get(wo.week_number) ?? [];
    arr.push(wo);
    workoutsByWeek.set(wo.week_number, arr);
  }

  // Compute per-week aggregates
  const weekSummaries = Array.from({ length: block.total_weeks }, (_, i) => {
    const weekNum = i + 1;
    const weekWorkouts = workoutsByWeek.get(weekNum) ?? [];
    const plannedKm = weekWorkouts
      .filter((w) => !w.skipped)
      .reduce((sum, w) => sum + (Number(w.distance_km) || 0), 0);
    const completedKm = weekWorkouts
      .filter((w) => w.is_complete && !w.skipped)
      .reduce((sum, w) => sum + (Number(w.distance_km) || 0), 0);
    const sessionsTotal = weekWorkouts.filter(
      (w) => w.type !== 'rest' && !w.skipped
    ).length;
    const sessionsDone = weekWorkouts.filter(
      (w) => w.is_complete && !w.skipped && w.type !== 'rest'
    ).length;
    return {
      weekNumber: weekNum,
      plannedKm,
      completedKm,
      sessionsTotal,
      sessionsDone,
      workouts: weekWorkouts,
    };
  });

  const phases: Phase[] = block.phases ?? [];

  // Helper to find phase for a week
  const phaseForWeek = (weekNum: number): Phase | null => {
    return (
      phases.find((p) => weekNum >= p.start_week && weekNum <= p.end_week) ?? null
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-3xl sm:text-4xl font-extrabold tracking-tight"
            style={{ letterSpacing: '-0.04em' }}
          >
            Block
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            {block.name} · Week {block.current_week} of {block.total_weeks}
          </p>
        </div>

        {/* Volume chart */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
            Volume
          </h2>
          <VolumeChart
            weekSummaries={weekSummaries}
            phases={phases}
            currentWeek={block.current_week}
            totalWeeks={block.total_weeks}
          />
        </div>

        {/* Phase strip */}
        <div className="mb-8">
          <PhaseStrip phases={phases} totalWeeks={block.total_weeks} />
        </div>

        {/* All weeks list */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
            All weeks
          </h2>
          <div className="space-y-2">
            {weekSummaries.map((ws) => {
              const phase = phaseForWeek(ws.weekNumber);
              return (
                <WeekRow
                  key={ws.weekNumber}
                  weekNumber={ws.weekNumber}
                  plannedKm={ws.plannedKm}
                  completedKm={ws.completedKm}
                  sessionsTotal={ws.sessionsTotal}
                  sessionsDone={ws.sessionsDone}
                  workouts={ws.workouts}
                  phaseName={phase?.name ?? null}
                  isCurrent={ws.weekNumber === block.current_week}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}