import { supabase } from "./supabase";

export type CoachContext = {
  systemPrompt: string;
  blockId: string;
};

/**
 * Builds the full system prompt for the coach chat.
 * Pulls the active block, its workouts, and any run notes from Supabase.
 * Returns a single string ready to be sent as the `system` field to Claude.
 */
export async function buildCoachContext(): Promise<CoachContext> {
  // 1. Get the active training block
  const { data: block, error: blockError } = await supabase
    .from("blocks")
    .select("*")
    .eq("status", "active")
    .single();

  if (blockError || !block) {
    throw new Error("No active training block found.");
  }

  // 2. Get all workouts for this block, ordered by date
  const { data: workouts, error: workoutsError } = await supabase
    .from("workouts")
    .select("*")
    .eq("block_id", block.id)
    .order("scheduled_date", { ascending: true });

  if (workoutsError) {
    throw new Error("Failed to load workouts: " + workoutsError.message);
  }

  // 3. Get any runs with user notes (Phase 3 has no Garmin data yet,
  //    but if Melwin manually added notes anywhere they'll show here)
  const { data: runs } = await supabase
    .from("runs")
    .select("date, user_note, distance_km, avg_pace_seconds")
    .eq("block_id", block.id)
    .not("user_note", "is", null);

  // 4. Format everything into a single text prompt
  const today = new Date().toISOString().split("T")[0];

  const planLines = (workouts || [])
    .map((w) => {
      const status = w.is_complete ? "[done]" : "[planned]";
      const pace = w.pace_target ? ` @ ${w.pace_target}` : "";
      const hr = w.hr_zone ? ` (${w.hr_zone})` : "";
      const dist = w.distance_km ? `${w.distance_km}km ` : "";
      return `  W${w.week_number} ${w.scheduled_date}: ${status} ${w.type} — ${dist}${w.name}${pace}${hr}`;
    })
    .join("\n");

  const notesSection =
    runs && runs.length > 0
      ? "\n\nMelwin's run notes:\n" +
        runs
          .map((r) => `  ${r.date}: ${r.user_note}`)
          .join("\n")
      : "\n\nNo run notes recorded yet.";

  const systemPrompt = `You are Melwin's running coach. You are integrated into PaceLabs, his personal training app.

Today's date: ${today}

Athlete profile:
- Name: Melwin
- Currently training for: ${block.name}
- Block type: ${block.type}
- Race date: ${block.race_date ?? "no race scheduled"}
- Race distance: ${block.race_distance_km ?? "n/a"}km
- Total weeks in block: ${block.total_weeks}
- Current week: ${block.current_week}

Full plan (every session, in order):
${planLines}
${notesSection}

Coaching principles (follow these strictly):
- Never draw conclusions from a single bad run. Contextualise against recent history.
- Small warning signs are not surfaced — only patterns across multiple sessions.
- Be specific and direct. No hedging, no excessive caveats.
- Use km, not miles. Use pace in min:sec/km format.
- If Melwin asks something you don't have data for (e.g. Garmin metrics), say so plainly. Don't invent numbers.
- Keep responses concise unless he asks for depth. He's on his phone most of the time.`;

  return {
    systemPrompt,
    blockId: block.id,
  };
}