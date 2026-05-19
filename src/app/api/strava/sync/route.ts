import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

async function getValidToken(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('user_integrations')
    .select('*')
    .eq('provider', 'strava')
    .single()

  if (!data) return null

  const nowSecs = Math.floor(Date.now() / 1000)
  if (data.expires_at > nowSecs + 60) return data.access_token

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: data.refresh_token,
    }),
  })

  if (!res.ok) return null

  const refreshed = await res.json()

  await supabaseAdmin
    .from('user_integrations')
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq('provider', 'strava')

  return refreshed.access_token
}

export async function GET() {
  const token = await getValidToken()
  if (!token) {
    return NextResponse.json({ error: 'not_connected' }, { status: 401 })
  }

  const after = Math.floor(Date.now() / 1000) - 60 * 24 * 60 * 60
  const activitiesRes = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=60`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!activitiesRes.ok) {
    return NextResponse.json({ error: 'strava_error' }, { status: 502 })
  }

  const activities = await activitiesRes.json()
  const runs = activities.filter((a: any) =>
    ['Run', 'TrailRun', 'VirtualRun', 'Treadmill'].includes(a.sport_type)
  )

  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const { data: workouts } = await supabaseAdmin
    .from('workouts')
    .select('id, scheduled_date, type, distance_km, name, strava_activity_id')
    .neq('type', 'rest')
    .neq('type', 'free_run')
    .gte('scheduled_date', sixtyDaysAgo)
    .is('strava_activity_id', null)
    .order('scheduled_date', { ascending: false })

  const { data: alreadyMatched } = await supabaseAdmin
    .from('workouts')
    .select('strava_activity_id')
    .not('strava_activity_id', 'is', null)
    .gte('scheduled_date', sixtyDaysAgo)

  const matchedStravaIds = new Set(
    (alreadyMatched ?? []).map((w: any) => w.strava_activity_id)
  )

  const { data: existingFreeRuns } = await supabaseAdmin
    .from('workouts')
    .select('strava_activity_id')
    .eq('type', 'free_run')
    .not('strava_activity_id', 'is', null)

  const freeRunStravaIds = new Set(
    (existingFreeRuns ?? []).map((w: any) => w.strava_activity_id)
  )

  const matchedRunIds = new Set<number>()
  const candidates: any[] = []

  for (const workout of workouts ?? []) {
    const workoutDate = workout.scheduled_date

    const sameDayRuns = runs.filter((r: any) => {
      const runDate = r.start_date_local.split('T')[0]
      return runDate === workoutDate && !matchedStravaIds.has(r.id)
    })

    if (sameDayRuns.length === 0) continue

    const bestMatch = sameDayRuns.reduce((best: any, run: any) => {
      const runKm = run.distance / 1000
      const diffBest = Math.abs((best.distance / 1000) - (workout.distance_km ?? 0))
      const diffRun = Math.abs(runKm - (workout.distance_km ?? 0))
      return diffRun < diffBest ? run : best
    })

    const runKm = bestMatch.distance / 1000
    const plannedKm = workout.distance_km ?? 0
    if (plannedKm > 0 && Math.abs(runKm - plannedKm) / plannedKm > 0.30) continue

    matchedRunIds.add(bestMatch.id)

    candidates.push({
      workout_id: workout.id,
      workout_name: workout.name,
      workout_date: workoutDate,
      workout_type: workout.type,
      planned_km: plannedKm,
      strava_activity_id: bestMatch.id,
      strava_name: bestMatch.name,
      actual_km: Math.round(runKm * 100) / 100,
      actual_duration_seconds: bestMatch.moving_time,
      actual_avg_pace_seconds:
        bestMatch.moving_time > 0 && bestMatch.distance > 0
          ? Math.round(bestMatch.moving_time / (bestMatch.distance / 1000))
          : null,
      actual_avg_hr: bestMatch.average_heartrate
        ? Math.round(bestMatch.average_heartrate)
        : null,
    })
  }

  const unmatched = runs.filter(
    (r: any) =>
      !matchedRunIds.has(r.id) &&
      !matchedStravaIds.has(r.id) &&
      !freeRunStravaIds.has(r.id)
  )

  for (const run of unmatched) {
    const runDate = run.start_date_local.split('T')[0]
    const runKm = Math.round((run.distance / 1000) * 100) / 100
    const avgPace =
      run.moving_time > 0 && run.distance > 0
        ? Math.round(run.moving_time / (run.distance / 1000))
        : null

    await supabaseAdmin.from('workouts').insert({
      type: 'free_run',
      free_run_name: run.name,
      scheduled_date: runDate,
      strava_activity_id: run.id,
      actual_distance_km: runKm,
      actual_duration_seconds: run.moving_time,
      actual_avg_pace_seconds: avgPace,
      actual_avg_hr: run.average_heartrate ? Math.round(run.average_heartrate) : null,
      is_complete: true,
      name: run.name,
      distance_km: runKm,
    })
  }

  await supabaseAdmin
    .from('user_integrations')
    .update({ updated_at: new Date().toISOString() })
    .eq('provider', 'strava')

  return NextResponse.json({ candidates })
}