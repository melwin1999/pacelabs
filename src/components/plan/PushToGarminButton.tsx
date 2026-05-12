'use client'

import { Upload } from 'lucide-react'

export default function PushToGarminButton() {
  return (
    <button
      onClick={() => alert('Garmin push coming in Phase 5')}
      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm"
      style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
      <Upload size={16} strokeWidth={2.5} />
      Push this week to Garmin
    </button>
  )
}