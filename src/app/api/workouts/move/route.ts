import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { workoutId, newDate, newWeekNumber, newDayOfWeek } = await req.json()

    if (!workoutId || !newDate) {
      return NextResponse.json({ error: 'workoutId and newDate are required' }, { status: 400 })
    }

    // Fetch the workout's current state before changing it
    const { data: workout, error: fetchError } = await supabase
      .from('workouts')
      .select('id, block_id, scheduled_date, week_number, day_of_week, name, type')
      .eq('id', workoutId)
      .single()

    if (fetchError || !workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    const oldDate = workout.scheduled_date

    // Check if there's already a workout on the target date (for swap warning)
    const { data: existingOnDate } = await supabase
      .from('workouts')
      .select('id, name, type')
      .eq('block_id', workout.block_id)
      .eq('scheduled_date', newDate)
      .neq('id', workoutId)
      .single()

    // Update the workout's date, week, and day
    const { error: updateError } = await supabase
      .from('workouts')
      .update({
        scheduled_date: newDate,
        week_number: newWeekNumber ?? workout.week_number,
        day_of_week: newDayOfWeek ?? workout.day_of_week,
      })
      .eq('id', workoutId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log to plan_changes
    await supabase.from('plan_changes').insert({
      block_id: workout.block_id,
      workout_id: workoutId,
      change_type: existingOnDate ? 'swapped' : 'moved',
      from_date: oldDate,
      to_date: newDate,
      field_changed: 'scheduled_date',
      old_value: oldDate,
      new_value: newDate,
      source: 'manual_drag',
    })

    return NextResponse.json({
      success: true,
      hadConflict: !!existingOnDate,
      conflictWorkout: existingOnDate ?? null,
    })
  } catch (err) {
    console.error('Move workout error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}