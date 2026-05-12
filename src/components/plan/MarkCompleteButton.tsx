'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

export default function MarkCompleteButton({ workoutId, isComplete }: {
  workoutId: string
  isComplete: boolean
}) {
  const [complete, setComplete] = useState(isComplete)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleToggle() {
    setLoading(true)
    const nowComplete = !complete
    setComplete(nowComplete)

    await fetch('/api/workouts/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workoutId, isComplete: nowComplete }),
    })

    setLoading(false)
    router.push('/')
  }

  return (
    <button onClick={handleToggle} disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50"
      style={{
        backgroundColor: complete ? 'var(--bg-card)' : 'var(--success)',
        color: complete ? 'var(--text-muted)' : '#fff',
        border: complete ? '1px solid var(--border)' : 'none',
      }}>
      <CheckCircle2 size={16} strokeWidth={2.5} />
      {complete ? 'Mark as incomplete' : 'Mark as complete'}
    </button>
  )
}