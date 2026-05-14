import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch all active blocks
    const { data: blocks, error } = await supabaseAdmin
      .from('blocks')
      .select('id')
      .eq('status', 'active')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!blocks || blocks.length === 0) {
      return NextResponse.json({ message: 'No active blocks' })
    }

    const results = []

    for (const block of blocks) {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pacelabs-psi.vercel.app'}/api/adapt/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ block_id: block.id, triggered_by: 'cron_sunday' }),
        }
      )
      const data = await res.json()
      results.push({ block_id: block.id, result: data })
    }

    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error('cron/sunday-adapt error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}