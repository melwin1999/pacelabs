import { MessageCircle } from 'lucide-react'

export default function CoachNudge() {
  return (
    <div className="rounded-xl px-4 py-3 flex items-start gap-3"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <MessageCircle size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
      <div>
        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>COACH</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No coach updates yet. Connect Garmin and the coach will review your week automatically.
        </p>
      </div>
    </div>
  )
}