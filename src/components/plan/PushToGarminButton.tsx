'use client'

import { Upload } from 'lucide-react'

export default function PushToGarminButton() {
  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #161c28',
      borderRadius: '16px', padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: '12px',
      marginBottom: '8px',
    }}>
      <div style={{
        width: '38px', height: '38px',
        background: 'rgba(249,115,22,0.1)',
        borderRadius: '11px', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Upload size={17} style={{ color: '#f97316' }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', marginBottom: '1px' }}>Push to Garmin</p>
        <p style={{ fontSize: '11px', color: '#2d3a50' }}>Generates .FIT files · Mon–Sun</p>
      </div>
      <button
        onClick={() => alert('Garmin push coming in Phase 7')}
        style={{
          padding: '8px 18px', background: '#f97316',
          color: '#fff', border: 'none', borderRadius: '10px',
          fontSize: '13px', fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 0 20px rgba(249,115,22,0.25)',
          transition: 'box-shadow 0.15s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 32px rgba(249,115,22,0.45)')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(249,115,22,0.25)')}
      >
        Push
      </button>
    </div>
  )
}