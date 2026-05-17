import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Only allow deleting non-active blocks
  const { data: block } = await supabaseAdmin.from('blocks').select('status').eq('id', id).single();
  if (!block || block.status === 'active') {
    return NextResponse.json({ error: 'Cannot delete active block' }, { status: 400 });
  }
  await supabaseAdmin.from('workouts').delete().eq('block_id', id);
  await supabaseAdmin.from('blocks').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}