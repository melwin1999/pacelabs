import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the block being activated
    const { data: block, error: fetchErr } = await supabaseAdmin
      .from('blocks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !block) {
      return NextResponse.json({ error: 'Block not found.' }, { status: 404 });
    }

    const today = new Date().toISOString().split('T')[0];
    const startDate = block.start_date ?? today;
    const startsInFuture = startDate > today;

    if (startsInFuture) {
      // Don't touch the current active block.
      // Just mark this one as 'queued' — it will auto-activate when its start date arrives.
      const { error } = await supabaseAdmin
        .from('blocks')
        .update({ status: 'queued' })
        .eq('id', id);

      if (error) return NextResponse.json({ error: 'Failed to queue block.' }, { status: 500 });

      return NextResponse.json({ ok: true, queued: true, starts: startDate });
    } else {
      // Start date is today or past — archive current active block and activate this one
      await supabaseAdmin
        .from('blocks')
        .update({ status: 'archived' })
        .eq('status', 'active');

      const { error } = await supabaseAdmin
        .from('blocks')
        .update({ status: 'active', current_week: 1 })
        .eq('id', id);

      if (error) return NextResponse.json({ error: 'Failed to activate block.' }, { status: 500 });

      return NextResponse.json({ ok: true, queued: false });
    }
  } catch (err) {
    console.error('Activate error:', err);
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 });
  }
}