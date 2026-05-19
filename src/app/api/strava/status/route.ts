import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('user_integrations')
    .select('strava_athlete_name, updated_at')
    .eq('provider', 'strava')
    .single()

  if (!data) return NextResponse.json({ connected: false })

  return NextResponse.json({
    connected: true,
    athlete_name: data.strava_athlete_name,
    last_synced: data.updated_at,
  })
}