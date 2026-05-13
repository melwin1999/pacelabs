import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { workoutId, skipped, reason } = await req.json()

    if (!workoutId || typeof skipped !== 'boolean') {
      return NextResponse.json(
        { error: 'workoutId and skipped (boolean) are required' },
        { status: 400 }
      )
    }

    // Fetch current workout state
    const { data: workout, error: fetchError } = await supabase
      .from('workouts')
      .select('id, block_id, scheduled_date, name, type, skipped')
      .eq('id', workoutId)
      .single()

    if (fetchError || !workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Update skip state
    const { error: updateError } = await supabase
      .from('workouts')
      .update({
        skipped: skipped,
        skipped_reason: skipped ? (reason ?? null) : null,
        // If skipping, also mark as not complete
        is_complete: skipped ? false : undefined,
      })
      .eq('id', workoutId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log to plan_changes (only when skipping, not un-skipping)
    if (skipped) {
      await supabase.from('plan_changes').insert({
        block_id: workout.block_id,
        workout_id: workoutId,
        change_type: 'skipped',
        from_date: workout.scheduled_date,
        to_date: null,
        field_changed: 'skipped',
        old_value: 'false',
        new_value: 'true',
        source: 'skip',
        reason: reason ?? null,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Skip workout error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}