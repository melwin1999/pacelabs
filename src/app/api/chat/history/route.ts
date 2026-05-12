import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data: block, error: blockError } = await supabase
      .from("blocks")
      .select("id")
      .eq("status", "active")
      .single();

    if (blockError || !block) {
      return NextResponse.json({ messages: [] });
    }

    const { data: messages } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("block_id", block.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({ messages: messages || [] });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}