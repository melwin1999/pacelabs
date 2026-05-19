import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const { free_run_id, workout_id } = await req.json()
  if (!free_run_id || !workout_id) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }

  const { data: freeRun } = await supabaseAdmin
    .from('workouts')
    .select('*')
    .eq('id', free_run_id)
    .single()

  if (!freeRun) return NextResponse.json({ error: 'free_run_not_found' }, { status: 404 })

  await supabaseAdmin
    .from('workouts')
    .update({
      strava_activity_id: freeRun.strava_activity_id,
      actual_distance_km: freeRun.actual_distance_km,
      actual_duration_seconds: freeRun.actual_duration_seconds,
      actual_avg_pace_seconds: freeRun.actual_avg_pace_seconds,
      actual_avg_hr: freeRun.actual_avg_hr,
      is_complete: true,
    })
    .eq('id', workout_id)

  await supabaseAdmin.from('workouts').delete().eq('id', free_run_id)

  return NextResponse.json({ ok: true })
}