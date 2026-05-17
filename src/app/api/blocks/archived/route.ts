import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data: blocks } = await supabaseAdmin
    .from('blocks').select('id, name, type, total_weeks, race_date, status, created_at')
    .in('status', ['archived', 'draft', 'completed'])
    .order('created_at', { ascending: false });
  return NextResponse.json({ blocks: blocks ?? [] });
}