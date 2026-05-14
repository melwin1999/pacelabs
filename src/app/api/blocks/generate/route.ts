// src/app/api/blocks/generate/route.ts
// PLACEHOLDER — full rebuild in Phase 5 Step 2

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Plan generator is being rebuilt. Check back soon.' },
    { status: 503 }
  )
}