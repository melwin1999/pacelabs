import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: block, error: bErr } = await supabaseAdmin
    .from('blocks')
    .select('*')
    .eq('id', id)
    .single();

  if (bErr || !block) {
    return NextResponse.json({ error: 'Block not found' }, { status: 404 });
  }

  const { data: workouts } = await supabaseAdmin
    .from('workouts')
    .select('*')
    .eq('block_id', id)
    .order('week_number', { ascending: true })
    .order('day_of_week', { ascending: true });

  return NextResponse.json({ block, workouts: workouts ?? [] });
}