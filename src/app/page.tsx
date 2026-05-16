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
  const completedWithPace = nonRest.filter(x => x.is_complete && x.pace_min_seconds && x.distance_km);
  const avgPaceSeconds = completedWithPace.length > 0 && doneKm > 0
    ? Math.round(completedWithPace.reduce((sum, x) => sum + ((x.pace_min_seconds ?? 0) * (x.distance_km ?? 0)), 0) / doneKm)
    : null;
  const avgPaceStr = avgPaceSeconds
    ? `${Math.floor(avgPaceSeconds / 60)}:${String(avgPaceSeconds % 60).padStart(2, "0")}`
    : "—";

  return (
    <AppShell>
      <div style={{ maxWidth: "1150px", padding: "0 32px 40px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <RaceHeroCard block={block} queuedBlock={queuedBlock} />

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1px", background: "#1a1a1a",
          border: "1px solid #1a1a1a", borderRadius: "10px",
          overflow: "hidden", marginBottom: "16px",
        }}>
          {[
            { label: "Planned", value: `${plannedKm.toFixed(1)}`, unit: "km" },
            { label: "Done", value: `${doneKm.toFixed(1)}`, unit: "km", green: true },
            { label: "Sessions", value: `${completedCount}`, unit: `/${sessionCount}` },
            { label: "Avg pace", value: avgPaceStr, unit: "/km" },
          ].map(({ label, value, unit, green }) => (
            <div key={label} style={{ background: "#0f0f0f", padding: "12px 16px" }}>
              <p style={{ fontSize: "9px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "3px" }}>{label}</p>
              <p style={{ fontSize: "18px", fontWeight: 800, color: green ? "#10b981" : "#f5f5f5", lineHeight: 1 }}>
                {value}<span style={{ fontSize: "9px", color: green ? "#10b981" : "#3f3f46", fontWeight: 400 }}> {unit}</span>
              </p>
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