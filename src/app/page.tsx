import { supabaseAdmin } from "@/lib/supabase";
import { Block, Workout, AdaptDraft } from "@/lib/types";
import AppShell from "@/components/layout/AppShell";
import RaceHeroCard from "@/components/plan/RaceHeroCard";
import WeekView from "@/components/plan/WeekView";
import CoachNudge from "@/components/plan/CoachNudge";
import QuickQuestions from "@/components/plan/QuickQuestions";
import PushToGarminButton from "@/components/plan/PushToGarminButton";
import AdaptBanner from "@/components/plan/AdaptBanner";
import EmptyState from "@/components/plan/EmptyState";

export const dynamic = "force-dynamic";

async function autoActivateQueued() {
  const today = new Date().toISOString().split("T")[0];
  const { data: queued } = await supabaseAdmin
    .from("blocks").select("*").eq("status", "queued")
    .lte("start_date", today).order("start_date", { ascending: true }).limit(1);
  if (queued && queued.length > 0) {
    const next = queued[0];
    await supabaseAdmin.from("blocks").update({ status: "archived" }).eq("status", "active");
    await supabaseAdmin.from("blocks").update({ status: "active", current_week: 1 }).eq("id", next.id);
  }
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
    .from("blocks").select("*").eq("status", "queued")
    .order("start_date", { ascending: true }).limit(1);
  const queuedBlock = queuedBlocks?.[0] as Block | undefined;

  if (!block) {
    return (
      <AppShell>
        <div style={{ padding: "20px 24px" }}><EmptyState /></div>
      </AppShell>
    );
  }

  const params = await searchParams;
  const weekOverride = params.week ? parseInt(params.week, 10) : null;
  const displayWeek = weekOverride && weekOverride >= 1 && weekOverride <= block.total_weeks
    ? weekOverride : block.current_week;

  const { data: workouts } = await supabaseAdmin
    .from("workouts").select("*").eq("block_id", block.id)
    .eq("week_number", displayWeek).order("day_of_week", { ascending: true });

  // Load: fetch previous week workouts for comparison
  const { data: prevWorkouts } = await supabaseAdmin
    .from("workouts").select("*").eq("block_id", block.id)
    .eq("week_number", displayWeek - 1);

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

  // Load vs last week
  const prevNonRest = (prevWorkouts ?? []).filter((x: Workout) => x.type !== "rest" && !x.skipped);
  const prevPlannedKm = prevNonRest.reduce((sum: number, x: Workout) => sum + (x.distance_km ?? 0), 0);
  let loadStr = "—";
  let loadColor = "#a1a1aa";
  if (prevPlannedKm > 0 && plannedKm > 0) {
    const pct = Math.round(((plannedKm - prevPlannedKm) / prevPlannedKm) * 100);
    if (pct > 0) { loadStr = `↑${pct}%`; loadColor = "#F97316"; }
    else if (pct < 0) { loadStr = `↓${Math.abs(pct)}%`; loadColor = "#10b981"; }
    else { loadStr = "→ 0%"; loadColor = "#10b981"; }
  } else if (displayWeek === 1) {
    loadStr = "Week 1";
    loadColor = "#71717a";
  }

  return (
    <AppShell>
      <div style={{ maxWidth: "1150px", padding: "0 32px 40px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <RaceHeroCard block={block} queuedBlock={queuedBlock} />

        <div style={{
          display: "flex", justifyContent: "space-around", alignItems: "center",
          background: "#0f0f0f", borderRadius: "10px", padding: "12px 0",
          border: "1px solid #1a1a1a",
        }}>
          {[
            { label: "Planned", value: `${plannedKm.toFixed(1)}`, unit: "km", color: "#f5f5f5" },
            { label: "Done", value: `${doneKm.toFixed(1)}`, unit: "km", color: "#10b981" },
            { label: "Sessions", value: `${completedCount}/${sessionCount}`, unit: "", color: "#f5f5f5" },
            { label: "Load", value: loadStr, unit: "", color: loadColor },
          ].map(({ label, value, unit, color }, i, arr) => (
            <div key={label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
                <p style={{ fontSize: "18px", fontWeight: 800, color, lineHeight: 1 }}>
                  {value}
                  {unit && <span style={{ fontSize: "9px", color: "#3f3f46", fontWeight: 400 }}> {unit}</span>}
                </p>
              </div>
              {i < arr.length - 1 && (
                <div style={{ width: "1px", height: "28px", background: "#1a1a1a", flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>

        {pendingDraft && <AdaptBanner draft={pendingDraft} />}
        <WeekView workouts={w} weekNumber={displayWeek} blockId={block.id} totalWeeks={block.total_weeks} />
        <CoachNudge />
        <QuickQuestions />
        <PushToGarminButton />
      </div>
    </AppShell>
  );
}