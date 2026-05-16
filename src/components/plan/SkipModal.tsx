'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface SkipModalProps {
  workoutName: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export default function SkipModal({ workoutName, onConfirm, onCancel }: SkipModalProps) {
  const [reason, setReason] = useState('')

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', background: 'rgba(0,0,0,0.7)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '440px', borderRadius: '20px',
          padding: '28px', background: '#111', border: '1px solid #2e2e2e',
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f5' }}>Skip workout?</p>
          <button onClick={onCancel} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#71717a', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: 1.5 }}>
          <span style={{ color: '#f5f5f5', fontWeight: 600 }}>{workoutName}</span> will be marked as skipped.
          The slot stays visible so your coach can see what was missed.
        </p>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '8px' }}>
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Felt ill, work ran late, legs too sore…"
            rows={3}
            style={{
              width: '100%', borderRadius: '12px', padding: '12px 14px',
              fontSize: '14px', resize: 'none', outline: 'none',
              background: '#0d0d0d', border: '1px solid #1f1f1f',
              color: '#f5f5f5', fontFamily: 'inherit', lineHeight: 1.5,
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '13px', borderRadius: '12px',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            background: '#0d0d0d', border: '1px solid #2e2e2e', color: '#71717a',
          }}>Cancel</button>
          <button onClick={() => onConfirm(reason)} style={{
            flex: 1, padding: '13px', borderRadius: '12px',
            fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            background: '#F97316', border: 'none', color: '#fff',
          }}>Skip session</button>
        </div>
      </div>
    </div>
  )
}