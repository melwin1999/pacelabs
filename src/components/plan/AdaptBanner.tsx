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
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-opacity hover:opacity-90"
        style={{
          background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.05) 100%)',
          border: '1px solid rgba(249,115,22,0.4)',
        }}
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(249,115,22,0.2)' }}
        >
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Claude has {count} proposed {count === 1 ? 'adjustment' : 'adjustments'}
          </div>
          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {draft.rationale ?? 'Tap to review'}
          </div>
        </div>
        <div className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--accent)' }}>
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