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
  const today = new Date().toISOString().split('T')[0];
  const { data: queued } = await supabaseAdmin
    .from('blocks').select('*').eq('status', 'queued')
    .lte('start_date', today).order('start_date', { ascending: true }).limit(1);
  if (queued && queued.length > 0) {
    const next = queued[0];
    await supabaseAdmin.from('blocks').update({ status: 'archived' }).eq('status', 'active');
    await supabaseAdmin.from('blocks').update({ status: 'active', current_week: 1 }).eq('id', next.id);
  }
}

const wrap: React.CSSProperties = {
  width: '100%',
  maxWidth: '680px',
  margin: '0 auto',
  padding: '20px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await autoActivateQueued();

  const { data: blocks } = await supabaseAdmin
    .from("blocks").select("*").eq("status", "active")
    .order("created_at", { ascending: false }).limit(1);
  const block = blocks?.[0] as Block | undefined;

  const { data: queuedBlocks } = await supabaseAdmin
    .from('blocks').select('*').eq('status', 'queued')
    .order('start_date', { ascending: true }).limit(1);
  const queuedBlock = queuedBlocks?.[0] as Block | undefined;

  if (!block) {
    return (
      <AppShell>
        <div style={wrap}>
          {queuedBlock ? (
            <div style={{ background: '#0d1117', border: '1px solid #161c28', borderRadius: '16px', padding: '20px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Upcoming plan</p>
              <p style={{ fontSize: '20px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.04em', marginBottom: '4px' }}>{queuedBlock.name}</p>
              <p style={{ fontSize: '13px', color: '#475569' }}>
                Starts {queuedBlock.start_date ? new Date(queuedBlock.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'soon'} · {queuedBlock.total_weeks} weeks
              </p>
            </div>
          ) : null}
          <EmptyState />
        </div>
      </AppShell>
    );
  }

  const params = await searchParams;
  const weekOverride = params.week ? parseInt(params.week, 10) : null;
  const displayWeek =
    weekOverride && weekOverride >= 1 && weekOverride <= block.total_weeks
      ? weekOverride : block.current_week;

  const { data: workouts } = await supabaseAdmin
    .from("workouts").select("*").eq("block_id", block.id)
    .eq("week_number", displayWeek).order("day_of_week", { ascending: true });

  const { data: drafts } = await supabaseAdmin
    .from("adapt_drafts").select("*").eq("block_id", block.id)
    .eq("status", "pending").order("created_at", { ascending: false }).limit(1);

  const pendingDraft = drafts?.[0] as AdaptDraft | undefined;
  const w = (workouts ?? []) as Workout[];
  const nonRest = w.filter((x) => x.type !== "rest" && !x.skipped);
  const plannedKm = nonRest.reduce((sum, x) => sum + (x.distance_km ?? 0), 0);
  const doneKm = nonRest.filter((x) => x.is_complete).reduce((sum, x) => sum + (x.distance_km ?? 0), 0);
  const sessionCount = nonRest.length;
  const completedCount = nonRest.filter((x) => x.is_complete).length;

  return (
    <AppShell>
      <div style={wrap}>
        {queuedBlock && (
          <div style={{
            background: '#0d1117', border: '1px solid #161c28',
            borderRadius: '12px', padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Next up</p>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>{queuedBlock.name}</p>
            </div>
            <p style={{ fontSize: '12px', color: '#f97316', fontWeight: 600 }}>
              Starts {queuedBlock.start_date
                ? new Date(queuedBlock.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                : 'soon'}
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