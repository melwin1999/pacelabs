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
      <p style={{
        fontSize: '9px', fontWeight: 700, letterSpacing: '1.8px',
        textTransform: 'uppercase', color: '#1e2a3a', marginBottom: '8px',
      }}>Quick questions</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {QUESTIONS.map(q => (
          <button key={q} onClick={() => router.push('/coach')} style={{
            padding: '13px 15px',
            background: '#0d1117',
            border: '1px solid #161c28',
            borderRadius: '12px',
            fontSize: '13px', color: '#475569',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', cursor: 'pointer',
            fontWeight: 500, textAlign: 'left',
            transition: 'all 0.15s ease',
            width: '100%',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#64748b' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#161c28'; e.currentTarget.style.color = '#475569' }}
          >
            {q}
            <span style={{ color: '#1e2a3a', fontSize: '16px', marginLeft: '8px' }}>›</span>
          </button>
        ))}
      </div>
    </div>
  )
}