import { supabaseAdmin } from "@/lib/supabase";
import { Block, Workout, AdaptDraft } from "@/lib/types";
import AppShell from "@/components/layout/AppShell";
import RaceHeroCard from "@/components/plan/RaceHeroCard";
import StatsStrip from "@/components/plan/StatsStrip";
import WeekView from "@/components/plan/WeekView";
import CoachNudge from "@/components/plan/CoachNudge";
import QuickQuestions from "@/components/plan/QuickQuestions";
import PushToGarminButton from "@/components/plan/PushToGarminButton";
import AdaptBanner from "@/components/plan/AdaptBanner";
import EmptyState from "@/components/plan/EmptyState";

export const dynamic = "force-dynamic";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
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

  const params = await searchParams;
  const weekOverride = params.week ? parseInt(params.week, 10) : null;
  const displayWeek =
    weekOverride && weekOverride >= 1 && weekOverride <= block.total_weeks
      ? weekOverride
      : block.current_week;

  const { data: workouts } = await supabaseAdmin
    .from("workouts")
    .select("*")
    .eq("block_id", block.id)
    .eq("week_number", displayWeek)
    .order("day_of_week", { ascending: true });

  const { data: drafts } = await supabaseAdmin
    .from("adapt_drafts")
    .select("*")
    .eq("block_id", block.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);

  const pendingDraft = drafts?.[0] as AdaptDraft | undefined;

  const w = (workouts ?? []) as Workout[];
  const nonRest = w.filter((x) => x.type !== "rest" && !x.skipped);
  const plannedKm = nonRest.reduce((sum, x) => sum + (x.distance_km ?? 0), 0);
  const doneKm = nonRest.filter((x) => x.is_complete).reduce((sum, x) => sum + (x.distance_km ?? 0), 0);
  const sessionCount = nonRest.length;
  const completedCount = nonRest.filter((x) => x.is_complete).length;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <RaceHeroCard block={block} />
        <StatsStrip
          plannedKm={plannedKm}
          doneKm={doneKm}
          sessionCount={sessionCount}
          completedCount={completedCount}
        />
        {pendingDraft && <AdaptBanner draft={pendingDraft} />}
        <WeekView
          workouts={w}
          weekNumber={displayWeek}
          blockId={block.id}
          totalWeeks={block.total_weeks}
        />
        <CoachNudge block={block} />
        <QuickQuestions />
        <PushToGarminButton blockId={block.id} weekNumber={displayWeek} />
      </div>
    </AppShell>
  );
}