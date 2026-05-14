// src/app/api/blocks/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { WizardInput } from '@/lib/types'
import { buildPlanSkeleton, validateWizardInput } from '@/lib/plan-scaffolding'

const client = new Anthropic()

const METHODOLOGY_DESCRIPTIONS: Record<string, string> = {
  pfitzinger: `Pfitzinger: High mileage, 2 quality sessions/week. Long runs often include marathon-pace segments in the final third. Medium-long runs (13-18km) on midweek days. Threshold work as continuous tempo runs. Very structured, progressive overload.`,
  daniels: `Daniels: Precise pace zones (E/M/T/I/R). Quality sessions often interval-based at I-pace with equal rest. Threshold as cruise intervals (5-6x1mile at T with 60s rest) or continuous tempo. Easy days strictly easy. Strides 2x/week.`,
  hansons: `Hansons: Cumulative fatigue model. No single run >26km. SOS (Something of Substance) days: speed (intervals at 5K-10K pace), strength (tempo at MP+10s), long run (easy). 6 days/week ideally. Back-to-back medium runs.`,
  higdon: `Higdon: Accessible, lower intensity. Long run is the centrepiece. 1 mid-week medium run. Quality work is moderate — tempo or fartlek, not hard intervals. Rest days strictly rest. Good for first-timers.`,
  norwegian: `Norwegian: Double-threshold model. Two threshold sessions/week at lactate threshold (NOT tempo — controlled, conversational-hard effort). High easy volume. HR-controlled. Sessions often 4-6x1km at threshold with 1-2min jog recovery.`,
  claude: `Claude's Own: Balanced approach. Long run + 1-2 quality sessions depending on phase. Mix of tempo, threshold, and interval work. Adapts to runner's history and notes. Prioritises consistency over heroic sessions.`,
}

const LONG_RUN_VARIANTS = `Long run variants (choose based on phase and week):
- Continuous easy: steady Z2 effort throughout
- Progressive: start easy, last 20-25% at marathon pace
- MP segments: e.g. 5km easy + 3x5km @MP + 2km easy
- Race simulation (peak phase only): final 10-13km at goal pace`

export async function POST(req: NextRequest) {
  try {
    const input: WizardInput = await req.json()

    const validationError = validateWizardInput(input)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    // Step 1: compute skeleton deterministically
    const skeleton = buildPlanSkeleton(input)

    // Step 2: ask Claude only for workout names/descriptions/structure
    const prompt = `You are a running coach generating a training plan. The plan structure, volumes, and paces have already been calculated. Your job is to fill in workout details only.

METHODOLOGY: ${METHODOLOGY_DESCRIPTIONS[input.template]}

${LONG_RUN_VARIANTS}

STRIDES: Add 4-6 strides (100m at rep pace, full recovery) at the end of 1-2 easy runs per week from week 3 onwards, when days_per_week >= 4.

WARMUP/COOLDOWN: All quality sessions get 1-1.5km warmup and cooldown.

FUELLING NOTES (only for runs >90min or race workouts):
- 60-90min: 30-60g carbs/hr
- 90-180min: 60-90g carbs/hr  
- 180min+: 90-120g carbs/hr + 300-700mg sodium/hr
State as ranges, not gel counts.

PLAN SKELETON:
Total weeks: ${skeleton.block_meta.total_weeks}
Race: ${skeleton.block_meta.race_distance_km}km on ${skeleton.block_meta.race_date}
Days/week: ${input.days_per_week}, long run day: ${input.long_run_day}
Start date: ${input.start_date}
Runner notes: ${input.general_notes || 'none'}
Schedule notes: ${input.schedule_notes || 'none'}
Methodology notes: ${input.template_notes || 'none'}

WEEKS:
${skeleton.weeks.map(w => `Week ${w.week_number} (${w.phase}${w.cutback ? ', CUTBACK' : ''}${w.is_b_race_week ? ', B-RACE WEEK' : ''}):
  volume: ${w.target_volume_km}km, long_run: ${w.long_run_km}km, quality_sessions: ${w.quality_session_count}
  pace_zones (s/km): easy ${w.pace_zones.easy_min}-${w.pace_zones.easy_max}, marathon ${w.pace_zones.marathon}, threshold ${w.pace_zones.threshold}, interval ${w.pace_zones.interval}
  notes: ${w.notes || 'none'}`).join('\n')}

Return a JSON object with exactly two fields:
1. "why_summary": 2-3 sentence summary of this plan (methodology, volume progression, key features)
2. "workouts": array of workout objects

Each workout object must have:
- week_number (int)
- day_of_week (int, 0=Mon 6=Sun, long run on ${input.long_run_day === 'sunday' ? '6' : '5'})
- type (easy|long|tempo|threshold|intervals|recovery|race|rest|strides|fartlek|progression|custom)
- name (short, e.g. "Easy 8km" or "6x1km Intervals")
- description (1 sentence)
- distance_km (number)
- pace_min_seconds (int, from pace_zones — use easy_max for easy/long, threshold for tempo/threshold, interval for intervals)
- pace_max_seconds (int, slightly slower than pace_min — easy runs use easy_min as max)
- primary_metric ("pace" for quality, "hr" for easy/long/recovery)
- hr_zone (string, e.g. "Z2" or "Z4-Z5")
- structure (array of structure steps, only for quality sessions and long runs with pace work)
- fuelling_note (string or null)

For easy/recovery/long runs: primary_metric="hr", pace fields = ceiling only (pace_min=pace_max=easy_max from zones).
For quality: primary_metric="pace", use correct zone paces.
Rest days: type="rest", distance_km=0, all pace fields null.

Fill every single day of every week (${input.days_per_week} runs + rest days to make 7 days total).
Output only valid JSON, no markdown, no explanation.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = raw.replace(/```json|```/g, '').trim()
    let parsed: { why_summary: string; workouts: Record<string, unknown>[] }
    try {
      parsed = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Failed to parse plan from Claude. Please try again.' }, { status: 500 })
    }

    // Step 3: insert block as draft
    const { data: block, error: blockError } = await supabaseAdmin
      .from('blocks')
      .insert({
        name: skeleton.block_meta.name,
        type: input.goal_type,
        goal: parsed.why_summary || input.general_notes || null,
        total_weeks: skeleton.block_meta.total_weeks,
        current_week: 1,
        race_date: skeleton.block_meta.race_date,
        race_distance_km: skeleton.block_meta.race_distance_km,
        est_now_seconds: skeleton.block_meta.est_now_seconds,
        race_proj_seconds: skeleton.block_meta.race_proj_seconds,
        status: 'draft',
        phases: skeleton.block_meta.phases,
        adaptation_aggressiveness: input.aggressiveness,
      })
      .select()
      .single()

    if (blockError || !block) {
      return NextResponse.json({ error: 'Failed to create block' }, { status: 500 })
    }

    // Step 4: insert B-races
    if (input.b_races?.length > 0) {
      await supabaseAdmin.from('b_races').insert(
        input.b_races.map(b => ({ ...b, block_id: block.id }))
      )
    }

    // Step 5: insert workouts
    const startDate = new Date(input.start_date)
    const workoutsToInsert = parsed.workouts.map((w: Record<string, unknown>) => {
      const weekNum = w.week_number as number
      const dayOfWeek = w.day_of_week as number
      const scheduledDate = new Date(startDate)
      scheduledDate.setDate(startDate.getDate() + (weekNum - 1) * 7 + dayOfWeek)
      return {
        block_id: block.id,
        week_number: weekNum,
        day_of_week: dayOfWeek,
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        type: w.type,
        name: w.name,
        description: w.description ?? null,
        distance_km: w.distance_km ?? null,
        pace_min_seconds: w.pace_min_seconds ?? null,
        pace_max_seconds: w.pace_max_seconds ?? null,
        hr_zone: w.hr_zone ?? null,
        primary_metric: w.primary_metric ?? null,
        fuelling_note: w.fuelling_note ?? null,
        structure: w.structure ?? null,
        is_complete: false,
        skipped: false,
      }
    })

    const { error: workoutsError } = await supabaseAdmin.from('workouts').insert(workoutsToInsert)
    if (workoutsError) {
      await supabaseAdmin.from('blocks').delete().eq('id', block.id)
      return NextResponse.json({ error: 'Failed to insert workouts' }, { status: 500 })
    }

    return NextResponse.json({ block_id: block.id, why_summary: parsed.why_summary })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}