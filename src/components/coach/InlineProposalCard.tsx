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
  const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected'>(
    draft.status === 'pending' ? 'pending' : (draft.status as 'accepted' | 'rejected')
  )
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
    <div style={{
      marginTop: '10px', borderRadius: '14px', overflow: 'hidden',
      background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.3)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid rgba(249,115,22,0.2)',
      }}>
        <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F97316' }}>
          Proposed plan change{draft.proposed_changes.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Changes */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {draft.proposed_changes.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <ChevronRight size={15} style={{ color: '#F97316', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f5', marginBottom: '3px' }}>
                {c.workout_name}
              </p>
              <p style={{ fontSize: '13px', color: '#a1a1aa' }}>{changeLabel(c)}</p>
              {c.reason && (
                <p style={{ fontSize: '12px', color: '#71717a', fontStyle: 'italic', marginTop: '4px', lineHeight: 1.4 }}>
                  {c.reason}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(249,115,22,0.2)' }}>
        {status === 'pending' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleReject}
              disabled={loading !== null}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '6px', padding: '11px', borderRadius: '10px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                background: 'transparent', border: '1px solid #2e2e2e', color: '#a1a1aa',
                opacity: loading !== null ? 0.5 : 1,
              }}
            >
              <X size={15} />
              {loading === 'reject' ? 'Rejecting…' : 'Reject'}
            </button>
            <button
              onClick={handleAccept}
              disabled={loading !== null}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '6px', padding: '11px', borderRadius: '10px',
                fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                background: '#F97316', border: 'none', color: '#09090B',
                opacity: loading !== null ? 0.5 : 1,
              }}
            >
              <Check size={15} />
              {loading === 'accept' ? 'Applying…' : 'Accept'}
            </button>
          </div>
        )}
        {status === 'accepted' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Check size={15} style={{ color: '#10b981' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>Accepted</span>
          </div>
        )}
        {status === 'rejected' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <X size={15} style={{ color: '#71717a' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#71717a' }}>Rejected</span>
          </div>
        )}
      </div>
    </div>
  )
}