import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase';
import { WizardInput } from '@/lib/types';

const anthropic = new Anthropic();

function buildSystemPrompt(): string {
  return `You are PaceLabs, an expert running coach. Your job is to generate a complete, structured training block as JSON.

You draw directly from the actual workout prescriptions of established methodologies:

PFITZINGER: Medium-long runs (13-18km) mid-week at easy/moderate pace. Lactate threshold runs: 8-15km total with 5-8km at 15K-HM race pace (threshold pace). Long runs 24-35km with final 8-16km at marathon pace. VO2max intervals: 5-6x1000m or 4-5x1200m at 5K pace with equal jog recovery. Recovery runs 10-13km very easy. Typical week: Mon recovery, Tue MLR or LT, Wed recovery/rest, Thu LT or MLR, Fri rest, Sat medium run, Sun long run.

DANIELS (VDOT): Uses VDOT tables to set exact paces. E pace (easy) = aerobic base. M pace (marathon) = goal marathon pace. T pace (threshold) = 1-hour race pace, used in tempo runs (20-40 min continuous) or cruise intervals (3-5x1 mile with 1-min rest). I pace (interval) = 5K race pace, used in intervals (3-5 min reps, rest = rep time). R pace (repetition) = mile race pace, short reps 200-400m with full recovery. Typical week structure: 2 quality days separated by easy/rest days.

HANSONS: Cumulative fatigue is the point — you never fully recover. Long run capped at 26-28km (16 miles). Speed workout Tuesdays: 6-10x1km at 10K pace with 400m jog. Strength workout Thursdays: 6-10 miles at marathon pace. Long run Sundays. Mon/Wed/Fri easy runs. The plan works because of accumulated fatigue, not individual workout heroics.

HAL HIGDON: Novice plans run 4 days/week, intermediate 5 days. Almost all runs at easy conversational pace. Long run increases by 1-2 miles per week with a cutback every 3-4 weeks. Midweek medium run (half of long run distance). Minimal speedwork in Novice (none), some tempo in Intermediate. Rest days strictly observed. Marathon long run peaks at 32-34km. Very forgiving structure — missing one run doesn't derail the plan.

NORWEGIAN (adapted for single sessions): Two threshold sessions per week at controlled lactate (~3-4 mmol, roughly HM-to-marathon effort, NOT all-out). Session 1: 4-6x1km at threshold with 1-min jog. Session 2: 8-12km continuous at threshold. High easy volume on other days. No true VO2max work — threshold IS the quality work. Weekly volume high (70km+). Not for beginners.

CLAUDE'S OWN: Hybrid. Use Daniels-style VDOT pace precision + Pfitz-style long run progression for marathon/half. Use Higdon-style simplicity + Hansons-style consistency for 5K/10K/base. Always match methodology complexity to runner experience level inferred from their inputs.

CRITICAL OUTPUT RULES:
- Respond with ONLY valid JSON. No markdown, no backticks, no explanation.
- All paces as integer seconds per km. Never strings like "5:30/km".
- Every workout needs pace_min_seconds and pace_max_seconds (can be equal for single-pace workouts).
- workout type must be one of: easy, long, tempo, threshold, intervals, recovery, race, rest, strides, fartlek, progression, custom
- day_of_week: 0=Monday through 6=Sunday
- scheduled_date: YYYY-MM-DD format
- distance_km: realistic for the workout type and week
- Every week must have exactly 7 entries (including rest days)
- Rest days: type="rest", distance_km=0, pace_min_seconds=0, pace_max_seconds=0
- Include fuelling_note for long runs over 18km and race workouts
- primary_metric: "pace" for tempo/threshold/intervals/race, "hr" for easy/recovery/long
- phases: divide the block into named phases (Base, Build, Peak, Taper). Each phase has start_week and end_week.
- est_now_seconds: project current race pace at goal distance from benchmark using standard equivalency
- race_proj_seconds: project finish time on race day assuming training goes well (more optimistic)`;
}

function buildUserPrompt(input: WizardInput): string {
  const benchmarkPace = input.benchmark_time_seconds > 0 && input.benchmark_distance_km > 0
    ? Math.round(input.benchmark_time_seconds / input.benchmark_distance_km)
    : null;

  return `Generate a complete ${input.total_weeks}-week training block with the following inputs:

GOAL: ${input.goal_type} (${input.race_distance_km}km)
RACE DATE: ${input.race_date}
METHODOLOGY: ${input.template}
AGGRESSIVENESS: ${input.aggressiveness}
DAYS PER WEEK: ${input.days_per_week}
LONG RUN DAY: ${input.long_run_day}
RECENT PEAK WEEKLY KM: ${input.peak_weekly_km}km

BENCHMARK: ${input.benchmark_time_seconds > 0 ? `${input.benchmark_time_seconds}s (${Math.floor(input.benchmark_time_seconds/60)}:${String(input.benchmark_time_seconds%60).padStart(2,'0')}) for ${input.benchmark_distance_km}km` : 'not provided'}
${benchmarkPace ? `BENCHMARK PACE: ${benchmarkPace}s/km (${Math.floor(benchmarkPace/60)}:${String(benchmarkPace%60).padStart(2,'0')}/km)` : ''}

${input.general_notes ? `RUNNER NOTES (goal/context): ${input.general_notes}` : ''}
${input.fitness_notes ? `RUNNER NOTES (fitness/health): ${input.fitness_notes}` : ''}
${input.schedule_notes ? `RUNNER NOTES (schedule/race): ${input.schedule_notes}` : ''}
${input.template_notes ? `RUNNER NOTES (preferences): ${input.template_notes}` : ''}

Return this exact JSON structure:
{
  "block": {
    "name": "string (e.g. 'Edinburgh Marathon 2026')",
    "type": "${input.goal_type}",
    "goal": "string (brief goal description)",
    "total_weeks": ${input.total_weeks},
    "current_week": 1,
    "race_date": "${input.race_date}",
    "race_distance_km": ${input.race_distance_km},
    "est_now_seconds": number,
    "race_proj_seconds": number,
    "status": "draft",
    "adaptation_aggressiveness": "${input.aggressiveness}",
    "phases": [{"name": "Base", "start_week": 1, "end_week": N}, ...]
  },
  "workouts": [
    {
      "week_number": 1,
      "day_of_week": 0,
      "scheduled_date": "YYYY-MM-DD",
      "type": "easy",
      "name": "string",
      "description": "string (1-2 sentences explaining the purpose and execution)",
      "distance_km": number,
      "pace_min_seconds": number,
      "pace_max_seconds": number,
      "hr_zone": "Z1" | "Z2" | "Z3" | "Z4" | "Z5",
      "primary_metric": "pace" | "hr",
      "fuelling_note": "string or null",
      "structure": []
    }
  ]
}

Generate all ${input.total_weeks * 7} workouts. Start week 1 on the Monday on or after today. The race should fall in the final week.`;
}

export async function POST(req: NextRequest) {
  try {
    const input: WizardInput = await req.json();

    if (!input.goal_type || !input.race_date || !input.total_weeks) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    });

    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    let parsed: { block: Record<string, unknown>; workouts: Record<string, unknown>[] };
    try {
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('JSON parse failed:', rawText.slice(0, 500));
      return NextResponse.json({ error: 'Claude returned invalid JSON. Please try again.' }, { status: 500 });
    }

    if (!parsed.block || !Array.isArray(parsed.workouts)) {
      return NextResponse.json({ error: 'Unexpected response structure. Please try again.' }, { status: 500 });
    }

    // Insert block
    const { data: blockRow, error: blockErr } = await supabaseAdmin
      .from('blocks')
      .insert({
        ...parsed.block,
        status: 'draft',
      })
      .select()
      .single();

    if (blockErr || !blockRow) {
      console.error('Block insert error:', blockErr);
      return NextResponse.json({ error: 'Failed to save block.' }, { status: 500 });
    }

    // Insert workouts in batches of 50
    const workouts = parsed.workouts.map((w) => ({
      ...w,
      block_id: blockRow.id,
    }));

    for (let i = 0; i < workouts.length; i += 50) {
      const batch = workouts.slice(i, i + 50);
      const { error: wErr } = await supabaseAdmin.from('workouts').insert(batch);
      if (wErr) {
        console.error('Workout insert error:', wErr);
        return NextResponse.json({ error: 'Failed to save workouts.' }, { status: 500 });
      }
    }

    return NextResponse.json({ block_id: blockRow.id });
  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 });
  }
}