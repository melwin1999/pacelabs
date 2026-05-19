import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const { workout_id, note } = await req.json()
  if (!workout_id) return NextResponse.json({ error: 'missing workout_id' }, { status: 400 })

  await supabaseAdmin
    .from('workouts')
    .update({ run_notes: note ?? null })
    .eq('id', workout_id)

  return NextResponse.json({ ok: true })
}