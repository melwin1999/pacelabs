import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      new URL('/runs?strava=error', request.url)
    )
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL('/runs?strava=error', request.url)
    )
  }

  const data = await tokenRes.json()

  // Upsert — single user, so we just replace any existing strava row
  await supabaseAdmin
    .from('user_integrations')
    .upsert(
      {
        provider: 'strava',
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        strava_athlete_id: data.athlete?.id ?? null,
        strava_athlete_name: data.athlete
          ? `${data.athlete.firstname} ${data.athlete.lastname}`
          : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider' }
    )

  return NextResponse.redirect(
    new URL('/runs?strava=connected', request.url)
  )
}