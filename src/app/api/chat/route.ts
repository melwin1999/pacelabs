import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { buildCoachContext } from "@/lib/coach-context";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const PROPOSE_PLAN_CHANGE_TOOL = {
  name: "propose_plan_change",
  description:
    "Propose one or more changes to the runner's training plan. Use this when the user asks for adjustments to their schedule, or when you (the coach) believe a change is warranted based on recent performance, fatigue, or context. Do NOT use this for hypothetical questions — only when the runner is actually asking for a change or you're strongly recommending one. The user will see the proposed changes inline and can Accept or Reject them.",
  input_schema: {
    type: "object" as const,
    properties: {
      rationale: {
        type: "string",
        description:
          "A 1-2 sentence summary of why you're proposing these changes. Spoken to the runner conversationally.",
      },
      changes: {
        type: "array",
        description: "List of proposed changes to workouts.",
        items: {
          type: "object",
          properties: {
            workout_id: {
              type: "string",
              description: "The UUID of the workout to change.",
            },
            workout_name: {
              type: "string",
              description: "The display name of the workout, e.g. 'Long Run'.",
            },
            change_type: {
              type: "string",
              enum: ["edited", "moved", "skipped", "swapped"],
              description:
                "edited = change a field. moved = change scheduled_date. skipped = mark as skipped. swapped = swap with another workout.",
            },
            field_changed: {
              type: "string",
              description:
                "The field to edit (e.g. distance_km, pace_min_seconds). Required when change_type='edited'.",
            },
            old_value: {
              type: "string",
              description: "The current value as a string.",
            },
            new_value: {
              type: "string",
              description: "The proposed new value as a string.",
            },
            from_date: {
              type: "string",
              description: "ISO date (YYYY-MM-DD) for the original date, when moving.",
            },
            to_date: {
              type: "string",
              description: "ISO date (YYYY-MM-DD) for the new date, when moving.",
            },
            reason: {
              type: "string",
              description: "Optional short reason for this specific change.",
            },
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
      return NextResponse.json(
        { error: "Missing or invalid 'message' field." },
        { status: 400 }
      );
    }

    const { systemPrompt, blockId } = await buildCoachContext();

    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("block_id", blockId)
      .order("created_at", { ascending: true });

    const messages: Anthropic.MessageParam[] = [
      ...(history || []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const toolEnabledSystem =
      systemPrompt +
      `\n\nYou have access to the propose_plan_change tool. Use it ONLY when the runner is explicitly asking you to adjust their plan, OR when you strongly recommend a change based on context. For general questions, advice, or discussion, respond in text. When you use the tool, also give a brief conversational reply explaining what you propose.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: toolEnabledSystem,
      tools: [PROPOSE_PLAN_CHANGE_TOOL],
      messages,
    });

    // Extract text + tool use
    const textBlocks = response.content.filter((b) => b.type === "text");
    const toolBlocks = response.content.filter((b) => b.type === "tool_use");

    const replyText =
      textBlocks.map((b) => (b.type === "text" ? b.text : "")).join("\n\n") ||
      (toolBlocks.length > 0
        ? "I've proposed some adjustments above — review them and let me know."
        : "(Claude returned no text)");

    // If Claude called propose_plan_change, create an adapt_drafts row
    let adaptDraftId: string | null = null;
    for (const block of toolBlocks) {
      if (block.type !== "tool_use") continue;
      if (block.name !== "propose_plan_change") continue;
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

      // Mark any older coach pending drafts as rolled_over
      await supabaseAdmin
        .from("adapt_drafts")
        .update({
          status: "rolled_over",
          resolved_at: new Date().toISOString(),
        })
        .eq("block_id", blockId)
        .eq("triggered_by", "coach_chat")
        .eq("status", "pending");

      const { data: draft } = await supabaseAdmin
        .from("adapt_drafts")
        .insert({
          block_id: blockId,
          triggered_by: "coach_chat",
          status: "pending",
          rationale: input.rationale,
          proposed_changes: proposedChanges,
        })
        .select()
        .single();

      if (draft) adaptDraftId = draft.id;
      break; // only handle the first tool call
    }

    await supabase.from("chat_messages").insert([
      { block_id: blockId, role: "user", content: message },
      {
        block_id: blockId,
        role: "assistant",
        content: replyText,
        adapt_draft_id: adaptDraftId,
      },
    ]);

    return NextResponse.json({ reply: replyText, adapt_draft_id: adaptDraftId });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Chat API error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}