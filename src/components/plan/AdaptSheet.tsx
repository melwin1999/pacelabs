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
      style={{
        padding: '12px',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border)',
        marginBottom: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <ChevronRight size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
            {change.workout_name}
          </div>
          <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-muted)' }}>
            {label()}
          </div>
          {change.reason && (
            <div style={{ fontSize: '12px', marginTop: '6px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
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
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          background: 'rgba(0,0,0,0.6)',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          maxHeight: '85vh',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '9999px', background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Proposed adjustments
            </h2>
            <p style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {draft.proposed_changes.length} change{draft.proposed_changes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '9999px',
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Rationale */}
        {draft.rationale && (
          <div
            style={{
              margin: '0 20px 16px',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              lineHeight: '1.5',
              background: 'rgba(249,115,22,0.08)',
              border: '1px solid rgba(249,115,22,0.2)',
              color: 'var(--text-muted)',
            }}
          >
            {draft.rationale}
          </div>
        )}

        {/* Changes list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 8px' }}>
          {draft.proposed_changes.map((change, i) => (
            <ChangeRow key={i} change={change} />
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px 24px', borderTop: '1px solid var(--border)' }}>
          {showRejectInput && (
            <textarea
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                resize: 'none',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                outline: 'none',
                marginBottom: '10px',
                boxSizing: 'border-box',
              }}
              rows={2}
              placeholder="Why are you rejecting this? (optional)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          )}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleReject}
              disabled={loading !== null}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                background: 'transparent',
                cursor: loading !== null ? 'not-allowed' : 'pointer',
                opacity: loading !== null ? 0.5 : 1,
              }}
            >
              {loading === 'reject' ? 'Rejecting…' : showRejectInput ? 'Confirm reject' : 'Reject'}
            </button>
            <button
              onClick={handleAccept}
              disabled={loading !== null}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                background: 'var(--accent)',
                color: '#09090B',
                border: 'none',
                cursor: loading !== null ? 'not-allowed' : 'pointer',
                opacity: loading !== null ? 0.5 : 1,
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