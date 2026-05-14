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

HANSONS: Cumulative fatigue is the point. Long run capped at 26-28km. Speed workout Tuesdays: 6-10x1km at 10K pace with 400m jog. Strength workout Thursdays: 6-10 miles at marathon pace. Long run Sundays. Mon/Wed/Fri easy runs.

HAL HIGDON: Almost all runs at easy conversational pace. Long run increases by 1-2 miles per week with a cutback every 3-4 weeks. Midweek medium run (half of long run distance). Minimal speedwork in Novice (none), some tempo in Intermediate. Rest days strictly observed. Marathon long run peaks at 32-34km.

NORWEGIAN (adapted for single sessions): Two threshold sessions per week at controlled lactate (~3-4 mmol, roughly HM-to-marathon effort). Session 1: 4-6x1km at threshold with 1-min jog. Session 2: 8-12km continuous at threshold. High easy volume on other days.

CLAUDE'S OWN: Hybrid. Use Daniels-style VDOT pace precision + Pfitz-style long run progression for marathon/half. Use Higdon-style simplicity + Hansons-style consistency for 5K/10K/base.

CRITICAL OUTPUT RULES:
- Respond with ONLY valid JSON. No markdown fences, no backticks, no triple backticks, no \`\`\`json, no explanation before or after. Start your response with { and end with }.
- All paces as integer seconds per km. Never strings like "5:30/km".
- Every workout needs pace_min_seconds and pace_max_seconds (can be equal).
- workout type must be one of: easy, long, tempo, threshold, intervals, recovery, race, rest, strides, fartlek, progression, custom
- day_of_week: 0=Monday through 6=Sunday
- scheduled_date: YYYY-MM-DD format
- distance_km: realistic number
- Every week must have exactly 7 entries including rest days
- Rest days: type="rest", distance_km=0, pace_min_seconds=0, pace_max_seconds=0
- Include fuelling_note for long runs over 18km and race workouts
- primary_metric: "pace" for tempo/threshold/intervals/race, "hr" for easy/recovery/long
- phases: divide the block into named phases (Base, Build, Peak, Taper)
- est_now_seconds: project current race pace at goal distance from benchmark
- race_proj_seconds: project finish time on race day (more optimistic)`;
}

function buildUserPrompt(input: WizardInput): string {
  const benchmarkPace = input.benchmark_time_seconds > 0 && input.benchmark_distance_km > 0
    ? Math.round(input.benchmark_time_seconds / input.benchmark_distance_km)
    : null;

  return `Generate a complete ${input.total_weeks}-week training block.

GOAL: ${input.goal_type} (${input.race_distance_km}km)
RACE DATE: ${input.race_date}
METHODOLOGY: ${input.template}
AGGRESSIVENESS: ${input.aggressiveness}
DAYS PER WEEK: ${input.days_per_week}
LONG RUN DAY: ${input.long_run_day}
RECENT PEAK WEEKLY KM: ${input.peak_weekly_km}km
BENCHMARK: ${input.benchmark_time_seconds > 0 ? `${Math.floor(input.benchmark_time_seconds/60)}:${String(input.benchmark_time_seconds%60).padStart(2,'0')} for ${input.benchmark_distance_km}km` : 'not provided'}
${benchmarkPace ? `BENCHMARK PACE: ${benchmarkPace}s/km` : ''}
PACE PROJECTION INSTRUCTIONS: Use Riegel's formula to project times: T2 = T1 × (D2/D1)^1.06. For example, a 2:45:00 half marathon (9900s for 21.0975km) projects to: 9900 × (42.195/21.0975)^1.06 = 9900 × 2.0^1.06 = 9900 × 2.085 = ~20640s = ~5:44:00 marathon. est_now_seconds is the projected current finish time at goal distance. race_proj_seconds should be 3-5% faster than est_now assuming training goes well. DO NOT invert the formula or use pace directly — always use total time and total distance.
${input.general_notes ? `RUNNER NOTES (goal): ${input.general_notes}` : ''}
${input.general_notes ? `RUNNER NOTES (goal): ${input.general_notes}` : ''}
${input.fitness_notes ? `RUNNER NOTES (fitness): ${input.fitness_notes}` : ''}
${input.schedule_notes ? `RUNNER NOTES (schedule): ${input.schedule_notes}` : ''}
${input.template_notes ? `RUNNER NOTES (preferences): ${input.template_notes}` : ''}

Return ONLY this JSON structure with no markdown or backticks:
{
  "block": {
    "name": "string",
    "type": "${input.goal_type}",
    "goal": "string",
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
      "description": "string",
      "distance_km": number,
      "pace_min_seconds": number,
      "pace_max_seconds": number,
      "hr_zone": "Z1",
      "primary_metric": "hr",
      "fuelling_note": null,
      "structure": []
    }
  ]
}

Generate all ${input.total_weeks * 7} workouts. Start week 1 on the Monday on or after today. Race falls in the final week. Keep descriptions SHORT (1 sentence max) to stay within token limits.`;
}

export async function POST(req: NextRequest) {
  try {
    const input: WizardInput = await req.json();

    if (!input.goal_type || !input.race_date || !input.total_weeks) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Cap at 24 weeks to prevent truncation
    if (input.total_weeks > 24) {
      input.total_weeks = 24;
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

    // Strip any markdown fences aggressively
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    // Find the first { and last } to extract just the JSON
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      console.error('No JSON braces found:', cleaned.slice(0, 200));
      return NextResponse.json({ error: 'Claude returned invalid JSON. Please try again.' }, { status: 500 });
    }
    const jsonOnly = cleaned.slice(firstBrace, lastBrace + 1);

    let parsed: { block: Record<string, unknown>; workouts: Record<string, unknown>[] };
    try {
      parsed = JSON.parse(jsonOnly);
    } catch (e) {
      console.error('JSON parse failed:', jsonOnly.slice(0, 500));
      return NextResponse.json({ error: 'Claude returned invalid JSON. Please try again.' }, { status: 500 });
    }

    if (!parsed.block || !Array.isArray(parsed.workouts)) {
      return NextResponse.json({ error: 'Unexpected response structure. Please try again.' }, { status: 500 });
    }

    const { data: blockRow, error: blockErr } = await supabaseAdmin
      .from('blocks')
      .insert({ ...parsed.block, status: 'draft' })
      .select()
      .single();

    if (blockErr || !blockRow) {
      console.error('Block insert error:', blockErr);
      return NextResponse.json({ error: 'Failed to save block.' }, { status: 500 });
    }

    const workouts = parsed.workouts.map((w) => ({ ...w, block_id: blockRow.id }));

    for (let i = 0; i < workouts.length; i += 50) {
      const { error: wErr } = await supabaseAdmin.from('workouts').insert(workouts.slice(i, i + 50));
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