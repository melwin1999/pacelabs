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

  // Garmin Connect expects a completed activity TCX, not a workout plan
  const startTime = new Date(`${dateStr}T08:00:00Z`).toISOString()
  const endTime = new Date(new Date(`${dateStr}T08:00:00Z`).getTime() + durationSecs * 1000).toISOString()

  const tcx = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">
  <Activities>
    <Activity Sport="Running">
      <Id>${startTime}</Id>
      <Lap StartTime="${startTime}">
        <TotalTimeSeconds>${durationSecs}</TotalTimeSeconds>
        <DistanceMeters>${Math.round(distanceM)}</DistanceMeters>
        <MaximumSpeed>${(avgSpeedMs * 1.1).toFixed(4)}</MaximumSpeed>
        <Calories>${Math.round(distanceM * 0.06)}</Calories>
        <AverageHeartRateBpm><Value>145</Value></AverageHeartRateBpm>
        <MaximumHeartRateBpm><Value>165</Value></MaximumHeartRateBpm>
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>
        <Track>
          <Trackpoint>
            <Time>${startTime}</Time>
            <DistanceMeters>0</DistanceMeters>
            <HeartRateBpm><Value>140</Value></HeartRateBpm>
            <Extensions>
              <ns3:TPX xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
                <ns3:Speed>${avgSpeedMs.toFixed(4)}</ns3:Speed>
              </ns3:TPX>
            </Extensions>
          </Trackpoint>
          <Trackpoint>
            <Time>${endTime}</Time>
            <DistanceMeters>${Math.round(distanceM)}</DistanceMeters>
            <HeartRateBpm><Value>150</Value></HeartRateBpm>
            <Extensions>
              <ns3:TPX xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
                <ns3:Speed>${avgSpeedMs.toFixed(4)}</ns3:Speed>
              </ns3:TPX>
            </Extensions>
          </Trackpoint>
        </Track>
      </Lap>
      <Notes>${workout.name}${workout.description ? ' — ' + workout.description : ''}</Notes>
    </Activity>
  </Activities>
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