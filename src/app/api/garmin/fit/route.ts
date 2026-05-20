import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { workout_id } = await req.json()

  const { data: workout } = await supabaseAdmin
    .from('workouts')
    .select('*')
    .eq('id', workout_id)
    .single()

  if (!workout) {
    return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
  }

  const dateStr = workout.scheduled_date ?? new Date().toISOString().split('T')[0]
  const distanceM = (workout.distance_km ?? 5) * 1000
  const avgPace = workout.pace_min_seconds && workout.pace_max_seconds
    ? Math.round((workout.pace_min_seconds + workout.pace_max_seconds) / 2)
    : 360
  const avgSpeedMs = 1000 / avgPace
  const durationSecs = Math.round(distanceM / avgSpeedMs)

  const tcx = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Workouts>
    <Workout Sport="Running">
      <Name>${workout.name}</Name>
      <Step xsi:type="Step_t">
        <StepId>1</StepId>
        <Name>${workout.name}</Name>
        <Duration xsi:type="Distance_t">
          <Meters>${Math.round(distanceM)}</Meters>
        </Duration>
        <Intensity>Active</Intensity>
        <Target xsi:type="Speed_t">
          <SpeedZone xsi:type="CustomSpeedZone_t">
            <LowInMetersPerSecond>${(1000 / (workout.pace_max_seconds ?? avgPace)).toFixed(4)}</LowInMetersPerSecond>
            <HighInMetersPerSecond>${(1000 / (workout.pace_min_seconds ?? avgPace)).toFixed(4)}</HighInMetersPerSecond>
          </SpeedZone>
        </Target>
      </Step>
      <ScheduledOn>${dateStr}</ScheduledOn>
      <Notes>${workout.description ?? ''}</Notes>
    </Workout>
  </Workouts>
</TrainingCenterDatabase>`

  const filename = `${workout.name?.replace(/[^a-zA-Z0-9]/g, '_') ?? 'workout'}.tcx`

  return new NextResponse(tcx, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}