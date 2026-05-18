'use client';

export default function BlockAnimations() {
  return (
    <style>{`
      @keyframes plPulse {
        0%, 100% { box-shadow: 0 0 4px 2px rgba(249,115,22,0.5); }
        50% { box-shadow: 0 0 16px 7px rgba(249,115,22,0.95), 0 0 30px 12px rgba(249,115,22,0.3); }
      }
      .pl-track-dot { animation: plPulse 2s ease-in-out infinite; }

      @keyframes volBarGrow {
        from { height: 0%; }
        to   { height: var(--target-height); }
      }
      .vol-bar-animate {
        height: 0%;
        animation: volBarGrow 0.7s ease-out forwards;
      }

      @keyframes trackFillGrow {
        from { width: 0%; }
        to   { width: var(--target-width); }
      }
      .track-fill-animate {
        width: 0%;
        animation: trackFillGrow 1.1s ease-out 0.1s forwards;
      }

      .block-stat-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin-bottom: 20px;
      }
      @media (min-width: 480px) {
        .block-stat-grid {
          grid-template-columns: repeat(4, 1fr);
        }
      }
    `}</style>
  );
}