import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import { buildCoachContext } from "@/lib/coach-context";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'message' field." },
        { status: 400 }
      );
    }

    // 1. Build the system prompt with full context
    const { systemPrompt, blockId } = await buildCoachContext();

    // 2. Load chat history for this block
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("block_id", blockId)
      .order("created_at", { ascending: true });

    // 3. Build the messages array for Claude
    const messages = [
      ...(history || []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // 4. Call Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    // 5. Extract the text reply
    const replyBlock = response.content.find((b) => b.type === "text");
    const reply =
      replyBlock && replyBlock.type === "text"
        ? replyBlock.text
        : "(Claude returned no text)";

    // 6. Save both the user message and Claude's reply to the DB
    await supabase.from("chat_messages").insert([
      { block_id: blockId, role: "user", content: message },
      { block_id: blockId, role: "assistant", content: reply },
    ]);

    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Chat API error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}