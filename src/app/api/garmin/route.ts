import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const GARMIN_BACKEND = 'https://pacelabs-garmin.onrender.com'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const action = body.action

  if (action === 'status') {
    const { data } = await supabaseAdmin
      .from('user_integrations')
      .select('garmin_email, garmin_athlete_name, garmin_tokens')
      .eq('provider', 'garmin')
      .single()
    const connected = !!(data?.garmin_email && data?.garmin_tokens)
    return NextResponse.json({ connected, email: data?.garmin_email ?? null, name: data?.garmin_athlete_name ?? null })
  }

  if (action === 'disconnect') {
    await supabaseAdmin
      .from('user_integrations')
      .update({ garmin_email: null, garmin_tokens: null, garmin_athlete_name: null })
      .eq('provider', 'garmin')
    return NextResponse.json({ ok: true })
  }

  if (action === 'connect') {
    const resp = await fetch(`${GARMIN_BACKEND}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: body.password }),
    })
    const data = await resp.json()
    return NextResponse.json(data, { status: resp.status })
  }

  if (action === 'push_workout') {
    const resp = await fetch(`${GARMIN_BACKEND}/push-workout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workout: body.workout, date: body.date }),
    })
    const data = await resp.json()
    return NextResponse.json(data, { status: resp.status })
  }

  if (action === 'push_week') {
    const resp = await fetch(`${GARMIN_BACKEND}/push-week`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workouts: body.workouts }),
    })
    const data = await resp.json()
    return NextResponse.json(data, { status: resp.status })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}