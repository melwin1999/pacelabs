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

async function autoActivateQueued() {
  // Check if any queued block's start_date has arrived and activate it
  const today = new Date().toISOString().split('T')[0];
  const { data: queued } = await supabaseAdmin
    .from('blocks')
    .select('*')
    .eq('status', 'queued')
    .lte('start_date', today)
    .order('start_date', { ascending: true })
    .limit(1);

  if (queued && queued.length > 0) {
    const next = queued[0];
    await supabaseAdmin.from('blocks').update({ status: 'archived' }).eq('status', 'active');
    await supabaseAdmin.from('blocks').update({ status: 'active', current_week: 1 }).eq('id', next.id);
  }
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  // Auto-activate any queued block whose start date has arrived
  await autoActivateQueued();

  const { data: blocks } = await supabaseAdmin
    .from("blocks")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  const block = blocks?.[0] as Block | undefined;

  // Check for queued upcoming block
  const { data: queuedBlocks } = await supabaseAdmin
    .from('blocks')
    .select('*')
    .eq('status', 'queued')
    .order('start_date', { ascending: true })
    .limit(1);
  const queuedBlock = queuedBlocks?.[0] as Block | undefined;

  if (!block) {
    return (
      <AppShell>
        {queuedBlock ? (
          <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
            <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Upcoming plan</p>
              <p className="text-xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>{queuedBlock.name}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Starts {queuedBlock.start_date ? new Date(queuedBlock.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'soon'} · {queuedBlock.total_weeks} weeks
              </p>
              <div className="h-px" style={{ background: 'var(--border)' }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Your current block has ended. This plan will activate automatically on its start date.</p>
            </div>
            <EmptyState />
          </div>
        ) : (
          <EmptyState />
        )}
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
        {queuedBlock && (
          <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Next up</p>
              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{queuedBlock.name}</p>
            </div>
            <p className="text-xs" style={{ color: 'var(--accent)' }}>
              Starts {queuedBlock.start_date ? new Date(queuedBlock.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'soon'}
            </p>
          </div>
        )}
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
        <CoachNudge />
        <QuickQuestions />
        <PushToGarminButton />
      </div>
    </AppShell>
  );
}