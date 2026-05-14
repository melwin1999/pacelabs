import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: draftId } = await params
    const body = await req.json().catch(() => ({}))
    const rejection_reason = body.rejection_reason ?? null

    const { error } = await supabaseAdmin
      .from('adapt_drafts')
      .update({
        status: 'rejected',
        rejection_reason,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .eq('status', 'pending')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('adapt/reject error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}