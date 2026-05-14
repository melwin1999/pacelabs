// src/app/api/blocks/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { WizardInput } from '@/lib/types'
import { buildPlanSkeleton, validateWizardInput } from '@/lib/plan-scaffolding'

const client = new Anthropic()

const METHODOLOGY_DESCRIPTIONS: Record<string, string> = {
  pfitzinger: `Pfitzinger: High mileage, 2 quality sessions/week. Long runs often include marathon-pace segments in the final third. Medium-long runs (13-18km) on midweek days. Threshold work as continuous tempo runs.`,
  daniels: `Daniels: Precise pace zones (E/M/T/I/R). Quality sessions interval-based at I-pace with equal rest. Threshold as cruise intervals or continuous tempo. Easy days strictly easy. Strides 2x/week.`,
  hansons: `Hansons: Cumulative fatigue model. No single run >26km. SOS days: speed, strength (tempo at MP+10s), long run (easy). 6 days/week ideally.`,
  higdon: `Higdon: Accessible, lower intensity. Long run is the centrepiece. 1 mid-week medium run. Quality work is moderate. Rest days strictly rest.`,
  norwegian: `Norwegian: Double-threshold model. Two threshold sessions/week at lactate threshold. High easy volume. HR-controlled. Sessions often 4-6x1km at threshold with 1-2min jog recovery.`,
  claude: `Claude's Own: Balanced approach. Long run + 1-2 quality sessions depending on phase. Mix of tempo, threshold, and interval work. Adapts to runner's history and notes.`,
}

function buildWeekPrompt(
  input: WizardInput,
  skeleton: ReturnType<typeof buildPlanSkeleton>,
  weekNumbers: number[]
): string {
  const weeks = skeleton.weeks.filter(w => weekNumbers.includes(w.week_number))
  return `You are a running coach generating workouts for specific weeks of a training plan.

METHODOLOGY: ${METHODOLOGY_DESCRIPTIONS[input.template]}
RACE: ${skeleton.block_meta.race_distance_km}km on ${skeleton.block_meta.race_date}
Days/week: ${input.days_per_week}, long run day: ${input.long_run_day}
Start date: ${input.start_date}
Runner notes: ${input.general_notes || 'none'}

STRIDES: Add 4-6 strides at end of 1-2 easy runs per week from week 3+, when days_per_week >= 4.
WARMUP/COOLDOWN: All quality sessions get 1-1.5km warmup and cooldown.
FUELLING (only for runs >90min): 60-90min=30-60g carbs/hr, 90-180min=60-90g carbs/hr, 180min+=90-120g carbs/hr + sodium.

WEEKS TO GENERATE:
${weeks.map(w => `Week ${w.week_number} (${w.phase}${w.cutback ? ', CUTBACK' : ''}${w.is_b_race_week ? ', B-RACE' : ''}):
  volume: ${w.target_volume_km}km, long_run: ${w.long_run_km}km, quality_sessions: ${w.quality_session_count}
  pace_zones (s/km): easy ${w.pace_zones.easy_min}-${w.pace_zones.easy_max}, marathon ${w.pace_zones.marathon}, threshold ${w.pace_zones.threshold}, interval ${w.pace_zones.interval}
  notes: ${w.notes || 'none'}`).join('\n')}

Return a JSON array of workout objects only. No markdown, no explanation, no wrapper object.
Each workout:
- week_number (int)
- day_of_week (int, 0=Mon 6=Sun, long run on ${input.long_run_day === 'sunday' ? '6' : '5'})
- type (easy|long|tempo|threshold|intervals|recovery|race|rest|strides|fartlek|progression|custom)
- name (short)
- description (1 sentence)
- distance_km (number)
- pace_min_seconds (int)
- pace_max_seconds (int)
- primary_metric ("pace" for quality, "hr" for easy/long/recovery)
- hr_zone (string)
- structure (array or null, only for quality sessions)
- fuelling_note (string or null)

Fill every day of every week listed (${input.days_per_week} runs + rest days = 7 days/week).
Output only the JSON array.`
}

export async function POST(req: NextRequest) {
  try {
    const input: WizardInput = await req.json()

    const validationError = validateWizardInput(input)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const skeleton = buildPlanSkeleton(input)

    // Generate in batches of 4 weeks to stay under token limits
    const BATCH_SIZE = 4
    const allWorkouts: Record<string, unknown>[] = []
    const weekNumbers = Array.from({ length: skeleton.block_meta.total_weeks }, (_, i) => i + 1)
    const batches: number[][] = []
    for (let i = 0; i < weekNumbers.length; i += BATCH_SIZE) {
      batches.push(weekNumbers.slice(i, i + BATCH_SIZE))
    }

    for (const batch of batches) {
      const prompt = buildWeekPrompt(input, skeleton, batch)
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      })

      const raw = response.content[0].type === 'text' ? response.content[0].text : ''
      const clean = raw.replace(/```json|```/g, '').trim()

      let batchWorkouts: Record<string, unknown>[]
      try {
        batchWorkouts = JSON.parse(clean)
        if (!Array.isArray(batchWorkouts)) throw new Error('Not an array')
      } catch {
        console.error('Batch parse fail, weeks:', batch, 'stop:', response.stop_reason, 'len:', raw.length)
        return NextResponse.json({ error: `Failed to generate weeks ${batch[0]}-${batch[batch.length - 1]}. Please try again.` }, { status: 500 })
      }
      allWorkouts.push(...batchWorkouts)
    }

    // Generate why_summary separately (cheap call)
    const summaryResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Write a 2-3 sentence summary of this training plan. Be specific about methodology, volume, and key features.
Plan: ${skeleton.block_meta.why_summary}
Methodology: ${input.template}, ${input.aggressiveness} aggressiveness, ${input.days_per_week} days/week.
Output only the summary text, no quotes.`
      }],
    })
    const whySummary = summaryResponse.content[0].type === 'text' ? summaryResponse.content[0].text : skeleton.block_meta.why_summary

    // Insert block
    const { data: block, error: blockError } = await supabaseAdmin
      .from('blocks')
      .insert({
        name: skeleton.block_meta.name,
        type: input.goal_type,
        goal: whySummary || input.general_notes || null,
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
      .select().single()

    if (blockError || !block) return NextResponse.json({ error: 'Failed to create block' }, { status: 500 })

    // Insert B-races
    if (input.b_races?.length > 0) {
      await supabaseAdmin.from('b_races').insert(input.b_races.map(b => ({ ...b, block_id: block.id })))
    }

    // Insert workouts
    const startDate = new Date(input.start_date || input.race_date)
    if (input.start_date) {
      // use start_date as-is
    } else {
      // fallback: compute from race date minus total_weeks
      startDate.setDate(startDate.getDate() - skeleton.block_meta.total_weeks * 7)
    }

    const workoutsToInsert = allWorkouts.map((w: Record<string, unknown>) => {
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

    return NextResponse.json({ block_id: block.id, why_summary: whySummary })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}