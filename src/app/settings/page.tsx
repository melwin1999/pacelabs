import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PlanChange } from "@/lib/types";

export const dynamic = "force-dynamic";

const SOURCE_LABELS: Record<string, string> = {
  manual_drag: "Manual drag",
  coach_chat: "Coach chat",
  auto_adapt: "Auto-adapt",
  skip: "Skipped",
};

const SOURCE_COLORS: Record<string, string> = {
  manual_drag: "#60A5FA",
  coach_chat: "#C084FC",
  auto_adapt: "#F97316",
  skip: "#A3A3A3",
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  moved: "Moved",
  swapped: "Swapped",
  skipped: "Skipped",
  edited: "Edited",
  added: "Added",
  removed: "Removed",
};

const SOURCE_FILTERS = [
  { key: "all", label: "All" },
  { key: "manual_drag", label: "Manual" },
  { key: "coach_chat", label: "Coach" },
  { key: "auto_adapt", label: "Auto-adapt" },
  { key: "skip", label: "Skips" },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { source?: string };
}) {
  const sourceFilter = searchParams.source ?? "all";

  const { data: block } = await supabase
    .from("blocks")
    .select("id, name, adaptation_aggressiveness")
    .eq("status", "active")
    .single();

  let changes: PlanChange[] = [];
  if (block) {
    let query = supabase
      .from("plan_changes")
      .select("*")
      .eq("block_id", block.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (sourceFilter !== "all") {
      query = query.eq("source", sourceFilter);
    }
    const { data } = await query;
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
    <div className="min-h-screen pb-24" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ letterSpacing: "-0.04em" }}>
          Settings
        </h1>
        {block && (
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            {block.name} · Aggressiveness: <strong>{block.adaptation_aggressiveness}</strong>
          </p>
        )}

        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
          Plan changes log
        </h2>

        <div className="flex flex-wrap gap-2 mb-4">
          {SOURCE_FILTERS.map((f) => {
            const active = sourceFilter === f.key;
            return (
              <Link
                key={f.key}
                href={`/settings?source=${f.key}`}
                scroll={false}
                prefetch={false}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: active ? "var(--accent)" : "var(--bg-card)",
                  color: active ? "#09090B" : "var(--text-muted)",
                  border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                }}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        {changes.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No changes logged{sourceFilter !== "all" ? " for this filter" : ""} yet.
          </p>
        )}

        <div className="space-y-2">
          {changes.map((c) => {
            const wo = c.workout_id ? workoutsById[c.workout_id] : null;
            const col = SOURCE_COLORS[c.source] ?? "#71717A";
            const date = new Date(c.created_at).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div
                key={c.id}
                className="rounded-xl p-3 flex items-start gap-3"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div className="w-1 flex-shrink-0 self-stretch rounded-full" style={{ background: col }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                        style={{ color: col, border: `1px solid ${col}`, background: "rgba(255,255,255,0.04)" }}
                      >
                        {SOURCE_LABELS[c.source] ?? c.source}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                        {CHANGE_TYPE_LABELS[c.change_type] ?? c.change_type}
                      </span>
                      {wo && (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          · {wo.name}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{date}</span>
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {c.change_type === "edited" && c.field_changed && (
                      <span>{c.field_changed.replace("_", " ")}: {c.old_value} → {c.new_value}</span>
                    )}
                    {c.change_type === "moved" && (
                      <span>{c.from_date} → {c.to_date}</span>
                    )}
                    {c.change_type === "skipped" && c.reason && (
                      <span>Reason: {c.reason}</span>
                    )}
                  </div>
                  {c.reason && c.change_type !== "skipped" && (
                    <div className="text-xs italic mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {c.reason}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}