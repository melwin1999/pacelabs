import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const { workout_id } = await req.json()
  if (!workout_id) return NextResponse.json({ error: 'missing workout_id' }, { status: 400 })

  const { data: workout } = await supabaseAdmin
    .from('workouts')
    .select('type')
    .eq('id', workout_id)
    .single()

  if (!workout) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  if (workout.type === 'free_run') {
    await supabaseAdmin.from('workouts').delete().eq('id', workout_id)
    return NextResponse.json({ ok: true, deleted: true })
  }

  await supabaseAdmin
    .from('workouts')
    .update({
      strava_activity_id: null,
      actual_distance_km: null,
      actual_duration_seconds: null,
      actual_avg_pace_seconds: null,
      actual_avg_hr: null,
      is_complete: false,
    })
    .eq('id', workout_id)

  return NextResponse.json({ ok: true, deleted: false })
}