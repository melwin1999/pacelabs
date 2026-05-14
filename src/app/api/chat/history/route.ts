import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data: block } = await supabase
      .from("blocks")
      .select("id")
      .eq("status", "active")
      .single();

    if (!block) {
      return NextResponse.json({ messages: [] });
    }

    const { data: messages } = await supabase
      .from("chat_messages")
      .select("id, role, content, adapt_draft_id, created_at")
      .eq("block_id", block.id)
      .order("created_at", { ascending: true });

    const draftIds = (messages || [])
      .map((m) => m.adapt_draft_id)
      .filter((id): id is string => !!id);

    let draftsById: Record<string, unknown> = {};
    if (draftIds.length > 0) {
      const { data: drafts } = await supabase
        .from("adapt_drafts")
        .select("*")
        .in("id", draftIds);
      if (drafts) {
        draftsById = Object.fromEntries(drafts.map((d) => [d.id, d]));
      }
    }

    const enriched = (messages || []).map((m) => ({
      ...m,
      adapt_draft: m.adapt_draft_id ? draftsById[m.adapt_draft_id] ?? null : null,
    }));

    return NextResponse.json({ messages: enriched });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}