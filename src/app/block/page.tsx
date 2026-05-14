import { createServerClient } from "@/lib/supabase";
import { Block, Workout } from "@/lib/types";
import AppShell from "@/components/layout/AppShell";
import VolumeChart from "@/components/block/VolumeChart";
import PhaseStrip from "@/components/block/PhaseStrip";
import WeekRow from "@/components/block/WeekRow";
import EmptyState from "@/components/plan/EmptyState";

export const dynamic = "force-dynamic";

export default async function BlockPage() {
  const supabase = createServerClient();
  const { data: blocks } = await supabase
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

  const { data: workouts } = await supabase
    .from("workouts")
    .select("*")
    .eq("block_id", block.id)
    .order("week_number", { ascending: true })
    .order("day_of_week", { ascending: true });

  const allWorkouts = (workouts ?? []) as Workout[];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
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

        <VolumeChart block={block} workouts={allWorkouts} />
        <PhaseStrip block={block} />

        <div className="space-y-2">
          {Array.from({ length: block.total_weeks }, (_, i) => i + 1).map(
            (weekNum) => (
              <WeekRow
                key={weekNum}
                block={block}
                weekNumber={weekNum}
                workouts={allWorkouts.filter((w) => w.week_number === weekNum)}
              />
            )
          )}
        </div>
      </div>
    </AppShell>
  );
}