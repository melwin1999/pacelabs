import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { matches } = await request.json()
  // matches: Array<{ workout_id, strava_activity_id, actual_km, actual_duration_seconds, actual_avg_pace_seconds, actual_avg_hr }>

  if (!Array.isArray(matches) || matches.length === 0) {
    return NextResponse.json({ error: 'no matches' }, { status: 400 })
  }

  const updates = matches.map((m: any) =>
    supabaseAdmin
      .from('workouts')
      .update({
        strava_activity_id: m.strava_activity_id,
        actual_distance_km: m.actual_km,
        actual_duration_seconds: m.actual_duration_seconds,
        actual_avg_pace_seconds: m.actual_avg_pace_seconds,
        actual_avg_hr: m.actual_avg_hr,
        is_complete: true,
      })
      .eq('id', m.workout_id)
  )

  await Promise.all(updates)

  return NextResponse.json({ ok: true, count: matches.length })
}