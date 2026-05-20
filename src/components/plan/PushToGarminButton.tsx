'use client'

import { Upload, Download } from 'lucide-react'
import { useState } from 'react'

type Workout = {
  id: string
  name: string
  type: string
  scheduled_date: string | null
  distance_km: number | null
}

type Props = {
  workouts?: Workout[]
}

export default function PushToGarminButton({ workouts = [] }: Props) {
  const [syncing, setSyncing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSyncWeek() {
    const eligible = workouts.filter(w => w.type !== 'rest' && w.distance_km)
    if (!eligible.length) { showToast('No workouts to sync'); return }
    setSyncing(true)
    try {
      const res = await fetch('/api/garmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'push_week', workouts: eligible }),
      })
      const data = await res.json()
      const failed = data.results?.filter((r: { ok: boolean }) => !r.ok).length ?? 0
      const succeeded = data.results?.filter((r: { ok: boolean }) => r.ok).length ?? 0
      showToast(failed ? `${succeeded} synced, ${failed} failed` : `${succeeded} workout${succeeded > 1 ? 's' : ''} pushed to Garmin!`)
    } catch {
      showToast('Sync failed')
    }
    setSyncing(false)
  }

  async function handleDownloadWeek() {
    const eligible = workouts.filter(w => w.type !== 'rest' && w.distance_km)
    if (!eligible.length) { showToast('No workouts to download'); return }
    setDownloading(true)
    try {
      for (const workout of eligible) {
        const res = await fetch('/api/garmin/fit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workout_id: workout.id }),
        })
        if (!res.ok) continue
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const disposition = res.headers.get('Content-Disposition') ?? ''
        const match = disposition.match(/filename="(.+)"/)
        a.download = match?.[1] ?? `${workout.name}.tcx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        await new Promise(r => setTimeout(r, 300))
      }
      showToast(`Downloaded ${eligible.length} workout${eligible.length > 1 ? 's' : ''}`)
    } catch {
      showToast('Download failed')
    }
    setDownloading(false)
  }

  return (
    <div style={{
      background: '#111111',
      border: '1px solid #1f1f1f',
      borderRadius: '16px', padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: '12px',
      marginBottom: '8px',
    }}>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: '#10b981', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500 }}>
          {toast}
        </div>
      )}
      <div style={{
        width: '38px', height: '38px',
        background: 'rgba(249,115,22,0.1)',
        borderRadius: '11px', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Upload size={17} style={{ color: '#f97316' }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', marginBottom: '1px' }}>Garmin</p>
        <p style={{ fontSize: '11px', color: '#52525b' }}>Sync or download this week's workouts</p>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleSyncWeek}
          disabled={syncing}
          style={{
            padding: '8px 14px', background: 'transparent',
            color: syncing ? '#52525b' : '#f5f5f5',
            border: '1px solid #2e2e2e', borderRadius: '10px',
            fontSize: '12px', fontWeight: 600,
            cursor: syncing ? 'not-allowed' : 'pointer',
            opacity: syncing ? 0.6 : 1,
          }}
        >
          {syncing ? 'Syncing…' : 'Sync'}
        </button>
        <button
          onClick={handleDownloadWeek}
          disabled={downloading}
          style={{
            padding: '8px 18px', background: downloading ? '#52525b' : '#f97316',
            color: '#fff', border: 'none', borderRadius: '10px',
            fontSize: '13px', fontWeight: 700,
            cursor: downloading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <Download size={13} />
          {downloading ? 'Downloading…' : 'Download'}
        </button>
      </div>
    </div>
  )
}