import { MessageCircle } from 'lucide-react'

export default function CoachNudge() {
  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid rgba(249,115,22,0.15)',
      borderRadius: '16px', padding: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div style={{
          width: '30px', height: '30px',
          background: 'rgba(249,115,22,0.1)',
          borderRadius: '50%', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <MessageCircle size={15} style={{ color: '#f97316' }} />
        </div>
        <p style={{ fontSize: '12px', fontWeight: 700, color: '#f97316', letterSpacing: '0.3px' }}>Coach</p>
      </div>
      <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
        No coach updates yet. Connect Garmin and the coach will review your week automatically.
      </p>
    </div>
  )
}