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
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onCancel}
    >
      {/* Modal panel */}
      <div
        className="w-full max-w-md rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>
            Skip workout?
          </p>
          <button onClick={onCancel} className="p-1 rounded-lg" style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Workout name */}
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--text)' }}>{workoutName}</span> will be marked as skipped.
          The slot stays visible so your coach can see what was missed.
        </p>

        {/* Optional reason */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide mb-1 block"
            style={{ color: 'var(--text-muted)' }}>
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Felt ill, work ran late, legs too sore…"
            rows={3}
            className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none"
            style={{
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: '#F97316', color: '#fff' }}
          >
            Skip session
          </button>
        </div>
      </div>
    </div>
  )
}