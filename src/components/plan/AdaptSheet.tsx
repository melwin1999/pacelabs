'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ChevronRight } from 'lucide-react'
import { AdaptDraft, ProposedChange } from '@/lib/types'

type Props = {
  draft: AdaptDraft
  open: boolean
  onClose: () => void
}

function ChangeRow({ change }: { change: ProposedChange }) {
  const label = () => {
    if (change.change_type === 'edited' && change.field_changed) {
      const field = change.field_changed
        .replace('_km', ' km')
        .replace('_seconds', ' (seconds)')
        .replace('_', ' ')
      return (
        <span>
          Change <strong>{field}</strong>: {change.old_value} → {change.new_value}
        </span>
      )
    }
    if (change.change_type === 'skipped') return <span>Skip this session</span>
    if (change.change_type === 'moved') return (
      <span>Move from {change.from_date} → {change.to_date}</span>
    )
    return <span>{change.change_type}</span>
  }

  return (
    <div
      className="p-3 rounded-lg"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-start gap-2">
        <ChevronRight size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {change.workout_name}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {label()}
          </div>
          {change.reason && (
            <div className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>
              {change.reason}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdaptSheet({ draft, open, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  if (!open) return null

  const handleAccept = async () => {
    setLoading('accept')
    await fetch(`/api/adapt/${draft.id}/accept`, { method: 'POST' })
    setLoading(null)
    onClose()
    router.refresh()
  }

  const handleReject = async () => {
    if (!showRejectInput) {
      setShowRejectInput(true)
      return
    }
    setLoading('reject')
    await fetch(`/api/adapt/${draft.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejection_reason: rejectionReason || null }),
    })
    setLoading(null)
    onClose()
    router.refresh()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl flex flex-col"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          maxHeight: '85vh',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: 'var(--border)' }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>
              Proposed adjustments
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {draft.proposed_changes.length} change{draft.proposed_changes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Rationale */}
        {draft.rationale && (
          <div
            className="mx-5 mb-3 p-3 rounded-lg text-sm"
            style={{
              background: 'rgba(249,115,22,0.08)',
              border: '1px solid rgba(249,115,22,0.2)',
              color: 'var(--text-muted)',
            }}
          >
            {draft.rationale}
          </div>
        )}

        {/* Changes list */}
        <div className="flex-1 overflow-y-auto px-5 space-y-2 pb-2">
          {draft.proposed_changes.map((change, i) => (
            <ChangeRow key={i} change={change} />
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
          {showRejectInput && (
            <textarea
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                outline: 'none',
              }}
              rows={2}
              placeholder="Why are you rejecting this? (optional)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          )}
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              disabled={loading !== null}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                background: 'transparent',
              }}
            >
              {loading === 'reject' ? 'Rejecting…' : showRejectInput ? 'Confirm reject' : 'Reject'}
            </button>
            <button
              onClick={handleAccept}
              disabled={loading !== null}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{
                background: 'var(--accent)',
                color: '#09090B',
              }}
            >
              {loading === 'accept' ? 'Applying…' : 'Accept all'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}