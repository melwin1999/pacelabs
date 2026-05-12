import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { workoutId, isComplete } = await req.json()
    if (!workoutId || typeof isComplete !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    const { error } = await supabaseAdmin
      .from('workouts')
      .update({ is_complete: isComplete })
      .eq('id', workoutId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}