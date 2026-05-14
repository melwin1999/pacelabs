import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AdaptDraft } from "@/lib/types";

export const dynamic = "force-dynamic";

type ChatMessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  adapt_draft_id: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#F97316",
  accepted: "#22C55E",
  rejected: "#A3A3A3",
  rolled_over: "#71717A",
  expired: "#71717A",
};

export default async function CoachHistoryPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const filter = searchParams.filter ?? "all";

  const { data: block } = await supabase
    .from("blocks")
    .select("id")
    .eq("status", "active")
    .single();

  if (!block) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
        No active block found.
      </div>
    );
  }

  const { data: rawMessages } = await supabase
    .from("chat_messages")
    .select("id, role, content, adapt_draft_id, created_at")
    .eq("block_id", block.id)
    .order("created_at", { ascending: false });

  const messages = (rawMessages ?? []) as ChatMessageRow[];

  const draftIds = messages.map((m) => m.adapt_draft_id).filter((x): x is string => !!x);
  let draftsById: Record<string, AdaptDraft> = {};
  if (draftIds.length > 0) {
    const { data: drafts } = await supabase
      .from("adapt_drafts")
      .select("*")
      .in("id", draftIds);
    if (drafts) {
      draftsById = Object.fromEntries(drafts.map((d) => [d.id, d as AdaptDraft]));
    }
  }

  const filtered = messages.filter((m) => {
    if (filter === "all") return true;
    if (filter === "proposals") return !!m.adapt_draft_id;
    if (filter === "user") return m.role === "user";
    if (filter === "assistant") return m.role === "assistant";
    return true;
  });

  const filters: Array<{ key: string; label: string }> = [
    { key: "all", label: "All" },
    { key: "proposals", label: "Proposals" },
    { key: "user", label: "You" },
    { key: "assistant", label: "Coach" },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        <Link
          href="/coach"
          className="inline-flex items-center gap-1.5 text-sm mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={14} />
          Back to Coach
        </Link>

        <h1
          className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2"
          style={{ letterSpacing: "-0.04em" }}
        >
          Chat history
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          {messages.length} message{messages.length !== 1 ? "s" : ""} ·{" "}
          {draftIds.length} proposal{draftIds.length !== 1 ? "s" : ""}
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.map((f) => {
            const isActive = filter === f.key;
            return (
              <Link
                key={f.key}
                href={`/coach/history?filter=${f.key}`}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: isActive ? "var(--accent)" : "var(--bg-card)",
                  color: isActive ? "#09090B" : "var(--text-muted)",
                  border: isActive ? "1px solid var(--accent)" : "1px solid var(--border)",
                }}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No messages in this filter.
            </p>
          )}
          {filtered.map((m) => {
            const draft = m.adapt_draft_id ? draftsById[m.adapt_draft_id] : null;
            const date = new Date(m.created_at);
            return (
              <div
                key={m.id}
                className="rounded-xl p-4"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                      style={{
                        background:
                          m.role === "user" ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.05)",
                        color: m.role === "user" ? "var(--accent)" : "var(--text-muted)",
                      }}
                    >
                      {m.role === "user" ? "You" : "Coach"}
                    </span>
                    {draft && (
                      <span
                        className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          color: STATUS_COLORS[draft.status] ?? "var(--text-muted)",
                          border: `1px solid ${STATUS_COLORS[draft.status] ?? "var(--border)"}`,
                        }}
                      >
                        {draft.status}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {date.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p
                  className="text-sm whitespace-pre-wrap leading-relaxed"
                  style={{ color: "var(--text)" }}
                >
                  {m.content}
                </p>
                {draft && draft.proposed_changes && draft.proposed_changes.length > 0 && (
                  <div
                    className="mt-3 pt-3 space-y-1"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <div className="text-[11px] uppercase tracking-wider font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                      {draft.proposed_changes.length} proposed change{draft.proposed_changes.length !== 1 ? "s" : ""}
                    </div>
                    {draft.proposed_changes.map((c, i) => (
                      <div key={i} className="text-xs" style={{ color: "var(--text-muted)" }}>
                        · {c.workout_name}:{" "}
                        {c.change_type === "edited" && c.field_changed
                          ? `${c.field_changed.replace("_", " ")} ${c.old_value} → ${c.new_value}`
                          : c.change_type}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}