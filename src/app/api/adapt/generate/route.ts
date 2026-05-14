import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { block_id, triggered_by } = await req.json()
    if (!block_id) return NextResponse.json({ error: 'block_id required' }, { status: 400 })

    // Idempotency: don't generate if a pending draft exists from last 6 hours
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await supabaseAdmin
      .from('adapt_drafts')
      .select('id')
      .eq('block_id', block_id)
      .eq('status', 'pending')
      .gte('created_at', sixHoursAgo)
      .single()

    if (existing) {
      return NextResponse.json({ message: 'Recent pending draft already exists', id: existing.id })
    }

    // Fetch block
    const { data: block } = await supabaseAdmin
      .from('blocks')
      .select('*')
      .eq('id', block_id)
      .single()

    if (!block) return NextResponse.json({ error: 'Block not found' }, { status: 404 })

    // Fetch current + future workouts
    const { data: workouts } = await supabaseAdmin
      .from('workouts')
      .select('*')
      .eq('block_id', block_id)
      .gte('week_number', block.current_week)
      .order('week_number')
      .order('day_of_week')

    // Fetch recent runs (last 4 weeks)
    const { data: recentRuns } = await supabaseAdmin
      .from('runs')
      .select('date, distance_km, duration_seconds, avg_pace_seconds, avg_hr, type')
      .eq('block_id', block_id)
      .order('date', { ascending: false })
      .limit(20)

    // Fetch recent plan changes
    const { data: recentChanges } = await supabaseAdmin
      .from('plan_changes')
      .select('change_type, source, reason, created_at')
      .eq('block_id', block_id)
      .order('created_at', { ascending: false })
      .limit(10)

    const aggressiveness = block.adaptation_aggressiveness ?? 'conservative'

    const systemPrompt = `You are an expert running coach AI. Your job is to review a runner's training plan and recent activity, then propose adjustments for the current and upcoming weeks.

Aggressiveness level: ${aggressiveness}
- conservative: only propose changes if there's a clear reason (missed sessions, illness, big jump in load). Keep changes minimal.
- moderate: adjust volume and pace targets based on actual performance. Can restructure within a week.
- aggressive: can restructure across weeks, add/remove sessions, change phase pacing.

RULES:
- Never modify past weeks (before current_week).
- Keep total weekly volume within 10% of planned unless aggressiveness is aggressive.
- Always explain why in the rationale.
- Respond ONLY with valid JSON, no markdown, no explanation outside the JSON.

JSON format:
{
  "rationale": "1-2 sentence summary of why you're proposing these changes",
  "proposed_changes": [
    {
      "workout_id": "uuid of the workout to change",
      "workout_name": "name of the workout",
      "change_type": "edited",
      "field_changed": "distance_km",
      "old_value": "12.0",
      "new_value": "10.0",
      "reason": "optional per-change reason"
    }
  ]
}

If no changes are needed, return: { "rationale": "Training is on track, no changes needed.", "proposed_changes": [] }`

    const userMessage = `Block: ${block.name}
Type: ${block.type}
Current week: ${block.current_week} of ${block.total_weeks}
Aggressiveness: ${aggressiveness}
Phases: ${JSON.stringify(block.phases)}

Upcoming workouts (current week onwards):
${JSON.stringify(workouts, null, 2)}

Recent runs:
${JSON.stringify(recentRuns ?? [], null, 2)}

Recent plan changes:
${JSON.stringify(recentChanges ?? [], null, 2)}

Propose adjustments for the current and upcoming weeks based on actual performance.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    let parsed: { rationale: string; proposed_changes: unknown[] }
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ error: 'Failed to parse Claude response', raw: rawText }, { status: 500 })
    }

    // Mark any existing pending draft as rolled_over
    await supabaseAdmin
      .from('adapt_drafts')
      .update({ status: 'rolled_over', resolved_at: new Date().toISOString() })
      .eq('block_id', block_id)
      .eq('status', 'pending')

    // Insert new draft
    const { data: draft, error: insertError } = await supabaseAdmin
      .from('adapt_drafts')
      .insert({
        block_id,
        triggered_by: triggered_by ?? 'cron_sunday',
        status: 'pending',
        rationale: parsed.rationale,
        proposed_changes: parsed.proposed_changes,
      })
      .select()
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({ success: true, draft })
  } catch (err) {
    console.error('adapt/generate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}