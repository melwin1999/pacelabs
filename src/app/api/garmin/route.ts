import { NextRequest, NextResponse } from 'next/server'

const PYTHON_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}/api/garmin/push`
  : 'http://localhost:3000/api/garmin/push'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const resp = await fetch(PYTHON_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await resp.json()
  return NextResponse.json(data, { status: resp.status })
}