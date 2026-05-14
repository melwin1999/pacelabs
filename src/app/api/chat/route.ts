import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { buildCoachContext } from "@/lib/coach-context";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PUSHBACK_RULES = `
PUSHBACK RULES — When the runner asks for any of the following, do NOT propose the change immediately. Instead: ask why, explain the risk to their goal race, suggest 1-2 safer alternatives, and only use the tool if they explicitly confirm they want to proceed anyway.
- Skipping more than 2 quality sessions in a row
- Removing >30% of weekly volume during Build or Peak phase
- Deleting any long run within 6 weeks of race day
- Moving the goal race date
- Adding a B-race in the Peak phase
- Volume jumps >20% week-over-week
Be direct but not preachy. One pushback per issue, then respect their choice.`;

const PROPOSE_PLAN_CHANGE_TOOL = {
  name: "propose_plan_change",
  description: "Propose one or more changes to the runner's training plan. Use this when the user asks for adjustments to their schedule, or when you (the coach) believe a change is warranted based on recent performance, fatigue, or context. Do NOT use this for hypothetical questions — only when the runner is actually asking for a change or you're strongly recommending one.",
  input_schema: {
    type: "object" as const,
    properties: {
      rationale: { type: "string", description: "A 1-2 sentence summary of why you're proposing these changes." },
      changes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            workout_id: { type: "string" },
            workout_name: { type: "string" },
            change_type: { type: "string", enum: ["edited", "moved", "skipped", "swapped"] },
            field_changed: { type: "string" },
            old_value: { type: "string" },
            new_value: { type: "string" },
            from_date: { type: "string" },
            to_date: { type: "string" },
            reason: { type: "string" },
          },
          required: ["workout_id", "workout_name", "change_type"],
        },
      },
    },
    required: ["rationale", "changes"],
  },
};

type ToolInput = {
  rationale: string;
  changes: Array<Record<string, unknown>>;
};

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'message' field." }, { status: 400 });
    }

    const { systemPrompt, blockId } = await buildCoachContext();

    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("block_id", blockId)
      .order("created_at", { ascending: true });

    const messages: Anthropic.MessageParam[] = [
      ...(history || []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message },
    ];

    const toolEnabledSystem = systemPrompt + PUSHBACK_RULES +
      `\n\nYou have access to the propose_plan_change tool. Use it ONLY when the runner is explicitly asking you to adjust their plan, OR when you strongly recommend a change based on context. For general questions, respond in text. When you use the tool, also give a brief conversational reply.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: toolEnabledSystem,
      tools: [PROPOSE_PLAN_CHANGE_TOOL],
      messages,
    });

    const textBlocks = response.content.filter((b) => b.type === "text");
    const toolBlocks = response.content.filter((b) => b.type === "tool_use");

    const replyText =
      textBlocks.map((b) => (b.type === "text" ? b.text : "")).join("\n\n") ||
      (toolBlocks.length > 0 ? "I've proposed some adjustments — review them and let me know." : "(no reply)");

    let adaptDraftId: string | null = null;
    for (const block of toolBlocks) {
      if (block.type !== "tool_use" || block.name !== "propose_plan_change") continue;
      const input = block.input as ToolInput;
      const proposedChanges = (input.changes || []).map((c) => ({
        workout_id: c.workout_id,
        workout_name: c.workout_name,
        change_type: c.change_type,
        field_changed: c.field_changed,
        old_value: c.old_value,
        new_value: c.new_value,
        from_date: c.from_date,
        to_date: c.to_date,
        reason: c.reason,
      }));

      await supabaseAdmin
        .from("adapt_drafts")
        .update({ status: "rolled_over", resolved_at: new Date().toISOString() })
        .eq("block_id", blockId)
        .eq("triggered_by", "coach_chat")
        .eq("status", "pending");

      const { data: draft } = await supabaseAdmin
        .from("adapt_drafts")
        .insert({ block_id: blockId, triggered_by: "coach_chat", status: "pending", rationale: input.rationale, proposed_changes: proposedChanges })
        .select()
        .single();

      if (draft) adaptDraftId = draft.id;
      break;
    }

    await supabase.from("chat_messages").insert([
      { block_id: blockId, role: "user", content: message },
      { block_id: blockId, role: "assistant", content: replyText, adapt_draft_id: adaptDraftId },
    ]);

    return NextResponse.json({ reply: replyText, adapt_draft_id: adaptDraftId });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}