import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data: blocks } = await supabaseAdmin
    .from('blocks').select('*').eq('status', 'active')
    .order('created_at', { ascending: false }).limit(1);
  return NextResponse.json({ block: blocks?.[0] ?? null });
}