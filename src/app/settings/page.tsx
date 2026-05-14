import { supabase } from "@/lib/supabase";
import { PlanChange } from "@/lib/types";
import SettingsClient from "@/components/plan/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { data: block } = await supabase
    .from("blocks")
    .select("id, name, adaptation_aggressiveness")
    .eq("status", "active")
    .single();

  let changes: PlanChange[] = [];
  if (block) {
    const { data } = await supabase
      .from("plan_changes")
      .select("*")
      .eq("block_id", block.id)
      .order("created_at", { ascending: false })
      .limit(200);
    changes = (data ?? []) as PlanChange[];
  }

  const workoutIds = Array.from(
    new Set(changes.map((c) => c.workout_id).filter((x): x is string => !!x))
  );
  let workoutsById: Record<string, { name: string }> = {};
  if (workoutIds.length > 0) {
    const { data: workouts } = await supabase
      .from("workouts")
      .select("id, name")
      .in("id", workoutIds);
    if (workouts) {
      workoutsById = Object.fromEntries(workouts.map((w) => [w.id, { name: w.name }]));
    }
  }

  return (
    <SettingsClient
      blockName={block?.name ?? ""}
      aggressiveness={block?.adaptation_aggressiveness ?? "conservative"}
      changes={changes}
      workoutsById={workoutsById}
    />
  );
}