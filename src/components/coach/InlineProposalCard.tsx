'use client'

import { useState } from 'react'
import { Check, X, ChevronRight } from 'lucide-react'
import { AdaptDraft, ProposedChange } from '@/lib/types'

type Props = {
  draft: AdaptDraft
  onResolved?: () => void
}

function changeLabel(change: ProposedChange) {
  if (change.change_type === 'edited' && change.field_changed) {
    const field = change.field_changed.replace('_km', ' km').replace('_seconds', '').replace('_', ' ')
    return `${field}: ${change.old_value} → ${change.new_value}`
  }
  if (change.change_type === 'skipped') return 'Skip this session'
  if (change.change_type === 'moved') return `Move ${change.from_date} → ${change.to_date}`
  return change.change_type
}

export default function InlineProposalCard({ draft, onResolved }: Props) {
  const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected'>(draft.status === 'pending' ? 'pending' : (draft.status as 'accepted' | 'rejected'))
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null)

  const handleAccept = async () => {
    setLoading('accept')
    await fetch(`/api/adapt/${draft.id}/accept`, { method: 'POST' })
    setLoading(null)
    setStatus('accepted')
    onResolved?.()
  }

  const handleReject = async () => {
    setLoading('reject')
    await fetch(`/api/adapt/${draft.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejection_reason: null }),
    })
    setLoading(null)
    setStatus('rejected')
    onResolved?.()
  }

  return (
    <div
      className="mt-2 rounded-xl overflow-hidden"
      style={{
        background: 'rgba(249,115,22,0.06)',
        border: '1px solid rgba(249,115,22,0.3)',
      }}
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(249,115,22,0.2)' }}>
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
          Proposed plan change{draft.proposed_changes.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="px-4 py-3 space-y-2">
        {draft.proposed_changes.map((c, i) => (
          <div key={i} className="flex items-start gap-2">
            <ChevronRight size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {c.workout_name}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {changeLabel(c)}
              </div>
              {c.reason && (
                <div className="text-xs italic mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {c.reason}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(249,115,22,0.2)' }}>
        {status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={loading !== null}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              <X size={14} />
              {loading === 'reject' ? 'Rejecting…' : 'Reject'}
            </button>
            <button
              onClick={handleAccept}
              disabled={loading !== null}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#09090B' }}
            >
              <Check size={14} />
              {loading === 'accept' ? 'Applying…' : 'Accept'}
            </button>
          </div>
        )}
        {status === 'accepted' && (
          <div className="flex items-center justify-center gap-1.5 text-sm font-medium" style={{ color: 'var(--success)' }}>
            <Check size={14} />
            Accepted
          </div>
        )}
        {status === 'rejected' && (
          <div className="flex items-center justify-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            <X size={14} />
            Rejected
          </div>
        )}
      </div>
    </div>
  )
}