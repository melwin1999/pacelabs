import { supabaseAdmin } from "@/lib/supabase";
import { Block, Workout, Phase } from "@/lib/types";
import AppShell from "@/components/layout/AppShell";
import VolumeChart from "@/components/block/VolumeChart";
import PhaseStrip from "@/components/block/PhaseStrip";
import WeekRow from "@/components/block/WeekRow";
import EmptyState from "@/components/plan/EmptyState";

export const dynamic = "force-dynamic";

function getPhaseForWeek(phases: Phase[], weekNum: number): string | null {
  const phase = phases.find(
    (p) => weekNum >= p.start_week && weekNum <= p.end_week
  );
  return phase?.name ?? null;
}

export default async function BlockPage() {
  const { data: blocks } = await supabaseAdmin
    .from("blocks")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  const block = blocks?.[0] as Block | undefined;

  if (!block) {
    return (
      <AppShell>
        <EmptyState />
      </AppShell>
    );
  }

  const { data: workouts } = await supabaseAdmin
    .from("workouts")
    .select("*")
    .eq("block_id", block.id)
    .order("week_number", { ascending: true })
    .order("day_of_week", { ascending: true });

  const allWorkouts = (workouts ?? []) as Workout[];
  const phases = block.phases ?? [];

  const weekSummaries = Array.from({ length: block.total_weeks }, (_, i) => {
    const weekNum = i + 1;
    const weekWorkouts = allWorkouts.filter((w) => w.week_number === weekNum);
    const nonRest = weekWorkouts.filter((w) => w.type !== "rest" && !w.skipped);
    return {
      weekNumber: weekNum,
      plannedKm: nonRest.reduce((sum, w) => sum + (w.distance_km ?? 0), 0),
      completedKm: nonRest
        .filter((w) => w.is_complete)
        .reduce((sum, w) => sum + (w.distance_km ?? 0), 0),
      sessionsTotal: nonRest.length,
      sessionsDone: nonRest.filter((w) => w.is_complete).length,
    };
  });

  return (
    <AppShell>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h1
            className="text-2xl mb-1"
            style={{ color: "var(--text)", fontWeight: 800, letterSpacing: "-0.04em" }}
          >
            {block.name}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Week {block.current_week} of {block.total_weeks} ·{" "}
            {block.adaptation_aggressiveness}
          </p>
        </div>

        <VolumeChart
          weekSummaries={weekSummaries}
          phases={phases}
          currentWeek={block.current_week}
          totalWeeks={block.total_weeks}
        />

        <PhaseStrip
          phases={phases}
          totalWeeks={block.total_weeks}
        />

        <div className="space-y-2">
          {Array.from({ length: block.total_weeks }, (_, i) => {
            const weekNum = i + 1;
            const summary = weekSummaries[i];
            const weekWorkouts = allWorkouts.filter((w) => w.week_number === weekNum);
            return (
              <WeekRow
                key={weekNum}
                weekNumber={weekNum}
                plannedKm={summary.plannedKm}
                completedKm={summary.completedKm}
                sessionsTotal={summary.sessionsTotal}
                sessionsDone={summary.sessionsDone}
                workouts={weekWorkouts}
                phaseName={getPhaseForWeek(phases, weekNum)}
                isCurrent={weekNum === block.current_week}
              />
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}