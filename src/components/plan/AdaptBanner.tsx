'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { AdaptDraft } from '@/lib/types'
import AdaptSheet from './AdaptSheet'

type Props = {
  draft: AdaptDraft
}

export default function AdaptBanner({ draft }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const count = draft.proposed_changes?.length ?? 0

  if (count === 0) return null

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          borderRadius: '12px',
          textAlign: 'left',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.05) 100%)',
          border: '1px solid rgba(249,115,22,0.4)',
        }}
      >
        <div style={{
          flexShrink: 0,
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(249,115,22,0.2)',
        }}>
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent)' }}>
            Claude has {count} proposed {count === 1 ? 'adjustment' : 'adjustments'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {draft.rationale ?? 'Tap to review'}
          </div>
        </div>
        <div style={{ fontSize: '12px', fontWeight: 500, flexShrink: 0, color: 'var(--accent)' }}>
          Review →
        </div>
      </button>

      <AdaptSheet
        draft={draft}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  )
}