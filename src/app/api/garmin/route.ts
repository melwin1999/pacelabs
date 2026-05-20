import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const action = body.action

  // Handle status + disconnect directly in Node — no Python needed
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

  // For connect + push actions, call the Python function
  const base = `https://pacelabs.run`
  const resp = await fetch(`${base}/api/garmin/push/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await resp.json()
  return NextResponse.json(data, { status: resp.status })
}