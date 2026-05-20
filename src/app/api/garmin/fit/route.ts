import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function createFitFile(workout: {
  name: string
  type: string
  distance_km: number | null
  pace_min_seconds: number | null
  pace_max_seconds: number | null
  scheduled_date: string | null
}): Buffer {
  // FIT file binary structure — minimal workout file
  const messages: number[][] = []

  // File ID message (type 0)
  const fileIdMsg = [
    0x40, // local msg 0, definition
    0x00, 0x00, // reserved, arch (little endian)
    0x00, 0x00, // global msg num 0 (file_id)
    0x05, // 5 fields
    0x08, 0x01, 0x00, // serial_number: field 3, size 1... 
    0x01, 0x02, 0x84, // time_created: field 1, size 4, uint32
    0x02, 0x02, 0x84, // manufacturer: field 2, size 2, uint16  
    0x04, 0x02, 0x84, // product: field 4, size 2, uint16
    0x00, 0x01, 0x00, // type: field 0, size 1, enum
  ]

  // Use a simpler approach — TCX-style but as a downloadable file
  // Actually generate a proper minimal FIT binary
  const encoder = require('fit-encoder')
  
  const dateObj = workout.scheduled_date ? new Date(workout.scheduled_date) : new Date()
  const timestamp = Math.floor(dateObj.getTime() / 1000) - 631065600 // FIT epoch offset

  const distanceM = (workout.distance_km ?? 5) * 1000
  const avgPace = workout.pace_min_seconds && workout.pace_max_seconds
    ? Math.round((workout.pace_min_seconds + workout.pace_max_seconds) / 2)
    : 360 // default 6:00/km
  const avgSpeedMs = 1000 / avgPace // m/s
  const durationSecs = Math.round(distanceM / avgSpeedMs)

  const fit = new encoder.FitEncoder()

  fit.writeFileId({
    type: 'workout',
    manufacturer: 'development',
    product: 0,
    time_created: timestamp,
  })

  fit.writeWorkout({
    workout_name: workout.name,
    sport: 'running',
    num_valid_steps: 1,
  })

  fit.writeWorkoutStep({
    message_index: 0,
    wkt_step_name: workout.name,
    duration_type: 'distance',
    duration_distance: distanceM * 100, // cm
    target_type: avgPace ? 'pace' : 'open',
    target_value: avgPace ? Math.round(1000 / avgSpeedMs * 1000) : 0,
  })

  return fit.encode()
}

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

  try {
    const fitBuffer = createFitFile(workout)
    const filename = `${workout.name?.replace(/\s+/g, '_') ?? 'workout'}.fit`

    return new NextResponse(fitBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch {
    // Fallback — return a basic TCX file if FIT encoding fails
    const dateStr = workout.scheduled_date ?? new Date().toISOString().split('T')[0]
    const distanceM = (workout.distance_km ?? 5) * 1000
    const avgPace = workout.pace_min_seconds && workout.pace_max_seconds
      ? Math.round((workout.pace_min_seconds + workout.pace_max_seconds) / 2)
      : 360
    const avgSpeedMs = 1000 / avgPace
    const durationSecs = Math.round(distanceM / avgSpeedMs)

    const tcx = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Workouts>
    <Workout Sport="Running">
      <Name>${workout.name}</Name>
      <Step xsi:type="Step_t" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <StepId>1</StepId>
        <Name>${workout.name}</Name>
        <Duration xsi:type="Distance_t">
          <Meters>${distanceM}</Meters>
        </Duration>
        <Intensity>Active</Intensity>
        <Target xsi:type="None_t"/>
      </Step>
      <ScheduledOn>${dateStr}</ScheduledOn>
    </Workout>
  </Workouts>
</TrainingCenterDatabase>`

    return new NextResponse(tcx, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${workout.name?.replace(/\s+/g, '_') ?? 'workout'}.tcx"`,
      },
    })
  }
}