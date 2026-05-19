import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  await supabaseAdmin
    .from('user_integrations')
    .delete()
    .eq('provider', 'strava')

  return NextResponse.json({ ok: true })
}