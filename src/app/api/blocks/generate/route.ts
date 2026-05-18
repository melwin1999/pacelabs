// src/app/api/blocks/generate/route.ts
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { WizardInput } from '@/lib/types'
import { buildPlanSkeleton, validateWizardInput } from '@/lib/plan-scaffolding'

const client = new Anthropic()

const METHODOLOGY_DESCRIPTIONS: Record<string, string> = {
  pfitzinger: `Pfitzinger: High mileage, 2 quality sessions/week. Long runs often include marathon-pace segments in the final third. Medium-long runs on midweek days. Threshold work as continuous tempo runs.`,
  daniels: `Daniels: Precise pace zones (E/M/T/I/R). Quality sessions interval-based at I-pace with equal rest. Threshold as cruise intervals or continuous tempo. Easy days strictly easy. Strides 2x/week.`,
  hansons: `Hansons: Cumulative fatigue model. No single run >26km. SOS days: speed, strength (tempo at MP+10s), long run (easy). 6 days/week ideally.`,
  higdon: `Higdon: Accessible, lower intensity. Long run is the centrepiece. 1 mid-week medium run. Quality work is moderate. Rest days strictly rest.`,
  norwegian: `Norwegian: Double-threshold model. Two threshold sessions/week at lactate threshold. High easy volume. HR-controlled. Sessions often 4-6x1km at threshold with 1-2min jog recovery.`,
  claude: `Claude's Own: Balanced approach. Long run + 1-2 quality sessions depending on phase. Mix of tempo, threshold, and interval work. Adapts to runner's history and notes.`,
}

function buildWeekPrompt(input: WizardInput, skeleton: ReturnType<typeof buildPlanSkeleton>, weekNumbers: number[]): string {
  const weeks = skeleton.weeks.filter(w => weekNumbers.includes(w.week_number))
  return `You are a running coach generating workouts for specific weeks of a training plan.

METHODOLOGY: ${METHODOLOGY_DESCRIPTIONS[input.template]}
RACE: ${skeleton.block_meta.race_distance_km}km on ${skeleton.block_meta.race_date}
Days/week: ${input.days_per_week}, long run day: ${input.long_run_day}
Runner notes: ${input.general_notes || 'none'}

STRIDES: Add 4-6 strides at end of 1-2 easy runs per week from week 3+, when days_per_week >= 4.

${input.template === 'daniels' ? `DANIELS 2Q RULES — CRITICAL:
- Every week has exactly 2 Quality sessions: Q1 and Q2.
- Q1 is always the longer, more important session. Name it "Q1 — [description]" e.g. "Q1 — Long Threshold Run" or "Q1 — Marathon Pace Long Run". Schedule on the weekend long run day.
- Q2 is the midweek quality session. Name it "Q2 — [description]" e.g. "Q2 — Cruise Intervals" or "Q2 — Interval Session". Schedule midweek.
- ALL other runs are strictly easy filler. Name them "E Run" or "Easy Run". Description must say "Easy filler run — keep this genuinely easy. Not a quality session." These exist purely to fill weekly mileage.
- Q1 in Base phase: long easy run with strides at end. Q1 in Build/Peak: long run with embedded marathon-pace or threshold segments.
- Q2 in Base phase: threshold cruise intervals (T pace). Q2 in Build/Peak: mix of threshold and interval work at I pace.
- Never make filler runs feel important. The whole Daniels philosophy is: protect the Qs, make everything else easy.` : ''}
WARMUP/COOLDOWN: All quality sessions get 1-1.5km warmup and cooldown.
FUELLING (only runs >90min): 60-90min=30-60g carbs/hr, 90-180min=60-90g carbs/hr, 180min+=90-120g carbs/hr+sodium.

WEEKS:
${weeks.map(w => `Week ${w.week_number} (${w.phase}${w.cutback ? ', CUTBACK' : ''}${w.is_b_race_week ? ', B-RACE' : ''}):
  volume: ${w.target_volume_km}km, long_run: ${w.long_run_km}km, quality: ${w.quality_session_count}
  paces (s/km): easy ${w.pace_zones.easy_min}-${w.pace_zones.easy_max}, marathon ${w.pace_zones.marathon}, threshold ${w.pace_zones.threshold}, interval ${w.pace_zones.interval}
  notes: ${w.notes || 'none'}`).join('\n')}

Return a JSON array of workout objects only. No markdown, no explanation.
Each workout:
- week_number, day_of_week (0=Mon,6=Sun, long run on ${input.long_run_day === 'sunday' ? '6' : '5'})
- type (easy|long|tempo|threshold|intervals|recovery|race|rest|strides|fartlek|progression|custom)
- name, description (1 sentence), distance_km
- pace_min_seconds, pace_max_seconds (ints, from pace zones above)
- primary_metric ("pace" for quality, "hr" for easy/long/recovery)
- hr_zone, structure (null for easy runs, array for quality), fuelling_note (null if <90min)

Fill every single day of every week listed (${input.days_per_week} runs + rest days = 7 days total per week).`
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      }

      try {
        const input: WizardInput = await req.json()

        const validationError = validateWizardInput(input)
        if (validationError) { send({ type: 'error', error: validationError }); controller.close(); return }

        const skeleton = buildPlanSkeleton(input)
        const totalWeeks = skeleton.block_meta.total_weeks
        const BATCH_SIZE = 4
        const weekNumbers = Array.from({ length: totalWeeks }, (_, i) => i + 1)
        const batches: number[][] = []
        for (let i = 0; i < weekNumbers.length; i += BATCH_SIZE) {
          batches.push(weekNumbers.slice(i, i + BATCH_SIZE))
        }

        send({ type: 'progress', stage: 'skeleton', message: 'Plan structure calculated', percent: 5 })

        const allWorkouts: Record<string, unknown>[] = []

        for (let bi = 0; bi < batches.length; bi++) {
          const batch = batches[bi]
          const firstWeek = batch[0]
          const lastWeek = batch[batch.length - 1]
          const percent = Math.round(10 + (bi / batches.length) * 75)

          send({ type: 'progress', stage: 'weeks', message: `Writing weeks ${firstWeek}–${lastWeek} of ${totalWeeks}…`, percent, weeksComplete: firstWeek - 1, totalWeeks })

          const prompt = buildWeekPrompt(input, skeleton, batch)
          let response
          let lastErr: unknown = null
          for (let attempt = 0; attempt < 5; attempt++) {
            try {
              const useHaiku = attempt >= 3
              response = await client.messages.create({
                model: useHaiku ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6',
                max_tokens: 8000,
                messages: [{ role: 'user', content: prompt }],
              })
              break
            } catch (err: unknown) {
              lastErr = err
              const status = (err as { status?: number }).status
              if ((status === 529 || status === 429 || status === 503) && attempt < 4) {
                await new Promise(r => setTimeout(r, 4000 * (attempt + 1)))
                continue
              }
              throw err
            }
          }
          if (!response) throw lastErr ?? new Error('Failed after 5 attempts')

          const raw = response.content[0].type === 'text' ? response.content[0].text : ''
          const clean = raw.replace(/```json|```/g, '').trim()

          let batchWorkouts: Record<string, unknown>[]
          try {
            batchWorkouts = JSON.parse(clean)
            if (!Array.isArray(batchWorkouts)) throw new Error('Not an array')
          } catch {
            send({ type: 'error', error: `Failed to generate weeks ${firstWeek}–${lastWeek}. Please try again.` })
            controller.close(); return
          }

          allWorkouts.push(...batchWorkouts)
          send({ type: 'progress', stage: 'weeks', message: `Weeks ${firstWeek}–${lastWeek} done ✓`, percent: percent + 5, weeksComplete: lastWeek, totalWeeks })
        }

        send({ type: 'progress', stage: 'saving', message: 'Saving your plan…', percent: 88 })

        // Insert block
        const { data: block, error: blockError } = await supabaseAdmin
          .from('blocks')
          .insert({
            name: skeleton.block_meta.name,
            type: input.goal_type,
            goal: skeleton.block_meta.why_summary || input.general_notes || null,
            total_weeks: totalWeeks,
            current_week: 1,
            race_date: skeleton.block_meta.race_date,
            race_distance_km: skeleton.block_meta.race_distance_km,
            est_now_seconds: skeleton.block_meta.est_now_seconds,
            race_proj_seconds: skeleton.block_meta.race_proj_seconds,
            status: 'draft',
            phases: skeleton.block_meta.phases,
            adaptation_aggressiveness: input.aggressiveness,
            start_date: input.start_date || null,
          })
          .select().single()

        if (blockError || !block) { send({ type: 'error', error: 'Failed to create block' }); controller.close(); return }

        if (input.b_races?.length > 0) {
          await supabaseAdmin.from('b_races').insert(input.b_races.map(b => ({ ...b, block_id: block.id })))
        }

        const startDate = new Date(input.start_date || input.race_date)
        if (!input.start_date) startDate.setDate(startDate.getDate() - totalWeeks * 7)

        const raceDate = new Date(skeleton.block_meta.race_date)
        const HARD_TYPES = new Set(['race', 'intervals', 'threshold', 'tempo', 'fartlek', 'progression', 'strides'])

        const validatedWorkouts = allWorkouts.filter((w: Record<string, unknown>) => {
          const weekNum = w.week_number as number
          const dayOfWeek = w.day_of_week as number
          const scheduledDate = new Date(startDate)
          scheduledDate.setDate(startDate.getDate() + (weekNum - 1) * 7 + dayOfWeek)
          const daysBeforeRace = Math.round((raceDate.getTime() - scheduledDate.getTime()) / 86400000)
          // Block ALL runs day before race
          if (daysBeforeRace === 1) return false
          // Block hard types within 4 days of race
          if (daysBeforeRace <= 4 && HARD_TYPES.has(w.type as string)) return false
          return true
        })

        const workoutsToInsert = validatedWorkouts.map((w: Record<string, unknown>) => {
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
          send({ type: 'error', error: 'Failed to save workouts' }); controller.close(); return
        }

        send({ type: 'progress', stage: 'done', message: 'Plan ready!', percent: 100, weeksComplete: totalWeeks, totalWeeks })
        send({ type: 'complete', block_id: block.id })
        controller.close()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', error: message }) + '\n'))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}