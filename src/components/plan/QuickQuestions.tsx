'use client'

import { useRouter } from 'next/navigation'

const QUESTIONS = [
  "How's my week going?",
  "Should I adjust Saturday's long run?",
  "Why am I feeling more tired than usual?",
  "What's the focus for this week?",
]

export default function QuickQuestions() {
  const router = useRouter()

  return (
    <div>
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>QUICK QUESTIONS</p>
      <div className="grid grid-cols-2 gap-2">
        {QUESTIONS.map(q => (
          <button key={q} onClick={() => router.push('/coach')}
            className="text-left text-sm px-3 py-2.5 rounded-xl transition-colors"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}