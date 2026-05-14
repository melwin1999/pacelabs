import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Archive any currently active block
    await supabaseAdmin
      .from('blocks')
      .update({ status: 'archived' })
      .eq('status', 'active');

    // Activate this block
    const { error } = await supabaseAdmin
      .from('blocks')
      .update({ status: 'active', current_week: 1 })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to activate block.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Activate error:', err);
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 });
  }
}