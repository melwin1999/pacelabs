'use client'
export default function BlockAnimations() {
  return (
    <style>{`
      @keyframes plPulse {
        0%, 100% { box-shadow: 0 0 4px 2px rgba(249,115,22,0.5); }
        50% { box-shadow: 0 0 16px 7px rgba(249,115,22,0.95), 0 0 30px 12px rgba(249,115,22,0.3); }
      }
      .pl-track-dot { animation: plPulse 2s ease-in-out infinite; }
      .vol-bar { transition: opacity 0.15s, filter 0.15s; }
      .vol-bar:hover { opacity: 1 !important; filter: brightness(1.4); }
    `}</style>
  )
}