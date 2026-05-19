'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, RefreshCw, Unlink, Zap, Activity, AlertCircle, ChevronRight, X, Check } from 'lucide-react'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtPace(secs: number | null): string {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}/km`
}

function fmtDuration(secs: number | null): string {
  if (!secs) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

const WORKOUT_COLOURS: Record<string, string> = {
  easy: '#86EFAC', long: '#FCD34D', tempo: '#FB923C',
  threshold: '#F87171', intervals: '#C084FC', recovery: '#93C5FD',
  race: '#F97316', strides: '#86EFAC', fartlek: '#67E8F9',
  progression: '#A3E635', custom: '#A3A3A3',
}

// ── types ────────────────────────────────────────────────────────────────────

interface Candidate {
  workout_id: string
  workout_name: string
  workout_date: string
  workout_type: string
  planned_km: number
  strava_activity_id: number
  strava_name: string
  actual_km: number
  actual_duration_seconds: number
  actual_avg_pace_seconds: number | null
  actual_avg_hr: number | null
}

// ── main component ────────────────────────────────────────────────────────────

export default function RunsPage() {
  const [status, setStatus] = useState<{
    connected: boolean
    athlete_name?: string
    last_synced?: string
  } | null>(null)

  const [syncing, setSyncing] = useState(false)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)

  // ── load status ─────────────────────────────────────────────────────────────

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/strava/status')
    const data = await res.json()
    setStatus(data)
  }, [])

  useEffect(() => {
    loadStatus()

    // Handle redirect back from OAuth
    const params = new URLSearchParams(window.location.search)
    const stravaParam = params.get('strava')
    if (stravaParam === 'connected') {
      showToast('Strava connected!', true)
      window.history.replaceState({}, '', '/runs')
      loadStatus()
    } else if (stravaParam === 'error') {
      showToast('Strava connection failed. Try again.', false)
      window.history.replaceState({}, '', '/runs')
    }
  }, [loadStatus])

  // ── helpers ──────────────────────────────────────────────────────────────────

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function buildStravaAuthUrl() {
    const clientId = 247863
    const redirectUri = `https://pacelabs-psi.vercel.app/api/strava/callback`
    const scope = 'activity:read_all'
    return `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&approval_prompt=auto`
  }

  async function handleConnect() {
    window.location.href = buildStravaAuthUrl()
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    await fetch('/api/strava/disconnect', { method: 'POST' })
    setCandidates([])
    setSelected(new Set())
    await loadStatus()
    setDisconnecting(false)
    showToast('Strava disconnected', true)
  }

  async function handleSync() {
    setSyncing(true)
    setCandidates([])
    setSelected(new Set())
    try {
      const res = await fetch('/api/strava/sync')
      const data = await res.json()
      if (data.candidates?.length > 0) {
        setCandidates(data.candidates)
        // Pre-select all
        setSelected(new Set(data.candidates.map((c: Candidate) => c.workout_id)))
      } else {
        showToast('No new matches found', true)
      }
    } catch {
      showToast('Sync failed. Try again.', false)
    }
    setSyncing(false)
  }

  function toggleCandidate(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleConfirm() {
    setConfirming(true)
    const matches = candidates.filter(c => selected.has(c.workout_id))
    try {
      const res = await fetch('/api/strava/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matches }),
      })
      const data = await res.json()
      if (data.ok) {
        showToast(`${data.count} workout${data.count !== 1 ? 's' : ''} synced ✓`, true)
        setCandidates([])
        setSelected(new Set())
      } else {
        showToast('Something went wrong', false)
      }
    } catch {
      showToast('Confirm failed', false)
    }
    setConfirming(false)
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: '780px', padding: '0 16px 40px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, background: toast.ok ? '#10b981' : '#F87171',
          color: '#fff', padding: '10px 20px', borderRadius: '8px',
          fontSize: '14px', fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          {toast.ok ? <Check size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '28px 0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <Activity size={20} color="#F97316" />
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#f5f5f5', margin: 0 }}>
            Runs
          </h1>
        </div>
        <p style={{ fontSize: '13px', color: '#71717a', margin: 0 }}>
          Sync your completed runs from Strava to track planned vs actual performance.
        </p>
      </div>

      {/* Strava connection card */}
      <div style={{
        background: '#111', border: '1px solid #1f1f1f', borderRadius: '12px',
        padding: '20px', marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Strava logo mark */}
            <div style={{
              width: '40px', height: '40px', borderRadius: '8px',
              background: '#FC4C02', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#f5f5f5' }}>
                Strava
              </div>
              {status?.connected ? (
                <div style={{ fontSize: '12px', color: '#10b981', marginTop: '2px' }}>
                  ● Connected{status.athlete_name ? ` · ${status.athlete_name}` : ''}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>
                  Not connected
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {status?.connected ? (
              <>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    background: '#F97316', color: '#fff', fontSize: '13px',
                    fontWeight: 600, cursor: syncing ? 'default' : 'pointer',
                    opacity: syncing ? 0.7 : 1,
                  }}
                >
                  <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                  {syncing ? 'Syncing…' : 'Sync Runs'}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: '8px',
                    border: '1px solid #2e2e2e', background: 'transparent',
                    color: '#71717a', fontSize: '13px', fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <Unlink size={13} />
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '10px 18px', borderRadius: '8px', border: 'none',
                  background: '#FC4C02', color: '#fff', fontSize: '14px',
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                <Zap size={14} />
                Connect Strava
              </button>
            )}
          </div>
        </div>

        {status?.connected && status.last_synced && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1f1f1f' }}>
            <span style={{ fontSize: '12px', color: '#52525b' }}>
              Last synced: {new Date(status.last_synced).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* Match candidates */}
      {candidates.length > 0 && (
        <div style={{
          background: '#111', border: '1px solid #2e2e2e', borderRadius: '12px',
          overflow: 'hidden', marginBottom: '20px',
        }}>
          {/* Header row */}
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid #1f1f1f',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f5' }}>
                {candidates.length} match{candidates.length !== 1 ? 'es' : ''} found
              </div>
              <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>
                Review and confirm to mark workouts complete
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCandidates([])}
                style={{
                  padding: '6px 10px', borderRadius: '6px',
                  border: '1px solid #2e2e2e', background: 'transparent',
                  color: '#71717a', fontSize: '12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                <X size={12} /> Dismiss
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirming || selected.size === 0}
                style={{
                  padding: '6px 14px', borderRadius: '6px', border: 'none',
                  background: selected.size > 0 ? '#F97316' : '#2e2e2e',
                  color: selected.size > 0 ? '#fff' : '#52525b',
                  fontSize: '12px', fontWeight: 600,
                  cursor: selected.size > 0 ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                <CheckCircle size={12} />
                {confirming ? 'Saving…' : `Confirm ${selected.size}`}
              </button>
            </div>
          </div>

          {/* Candidate rows */}
          {candidates.map(c => {
            const colour = WORKOUT_COLOURS[c.workout_type] ?? '#A3A3A3'
            const isSelected = selected.has(c.workout_id)
            const distDiff = c.planned_km > 0
              ? ((c.actual_km - c.planned_km) / c.planned_km) * 100
              : null

            return (
              <div
                key={c.workout_id}
                onClick={() => toggleCandidate(c.workout_id)}
                style={{
                  padding: '14px 16px', borderBottom: '1px solid #1a1a1a',
                  cursor: 'pointer', background: isSelected ? 'rgba(249,115,22,0.04)' : 'transparent',
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  transition: 'background 0.15s',
                }}
              >
                {/* Checkbox */}
                <div style={{
                  width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                  marginTop: '2px',
                  border: isSelected ? 'none' : '1px solid #3f3f46',
                  background: isSelected ? '#F97316' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isSelected && <Check size={11} color="#fff" strokeWidth={3} />}
                </div>

                {/* Colour bar */}
                <div style={{
                  width: '3px', height: '48px', borderRadius: '2px',
                  background: colour, flexShrink: 0,
                }} />

                {/* Main content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f5f5f5' }}>
                      {c.workout_name}
                    </span>
                    <span style={{ fontSize: '11px', color: '#52525b' }}>
                      {fmtDate(c.workout_date)}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>
                    Strava: "{c.strava_name}"
                  </div>

                  {/* Planned vs actual */}
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#52525b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Planned</div>
                      <div style={{ fontSize: '13px', color: '#a1a1aa' }}>{c.planned_km.toFixed(1)} km</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#52525b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actual</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '13px', color: '#f5f5f5', fontWeight: 600 }}>{c.actual_km.toFixed(1)} km</span>
                        {distDiff !== null && (
                          <span style={{
                            fontSize: '11px',
                            color: Math.abs(distDiff) < 5 ? '#10b981' : Math.abs(distDiff) < 15 ? '#FCD34D' : '#F87171',
                          }}>
                            {distDiff > 0 ? '+' : ''}{distDiff.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    {c.actual_avg_pace_seconds && (
                      <div>
                        <div style={{ fontSize: '10px', color: '#52525b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pace</div>
                        <div style={{ fontSize: '13px', color: '#a1a1aa' }}>{fmtPace(c.actual_avg_pace_seconds)}</div>
                      </div>
                    )}
                    {c.actual_avg_hr && (
                      <div>
                        <div style={{ fontSize: '10px', color: '#52525b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg HR</div>
                        <div style={{ fontSize: '13px', color: '#a1a1aa' }}>{c.actual_avg_hr} bpm</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '10px', color: '#52525b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</div>
                      <div style={{ fontSize: '13px', color: '#a1a1aa' }}>{fmtDuration(c.actual_duration_seconds)}</div>
                    </div>
                  </div>
                </div>

                <ChevronRight size={14} color="#3f3f46" style={{ flexShrink: 0, marginTop: '4px' }} />
              </div>
            )
          })}
        </div>
      )}

      {/* Empty / not connected state */}
      {!status?.connected && (
        <div style={{
          background: '#111', border: '1px solid #1f1f1f', borderRadius: '12px',
          padding: '40px 24px', textAlign: 'center',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'rgba(252,76,2,0.1)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <Activity size={22} color="#FC4C02" />
          </div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#f5f5f5', marginBottom: '8px' }}>
            Connect Strava to track your runs
          </div>
          <div style={{ fontSize: '13px', color: '#71717a', lineHeight: 1.6, maxWidth: '360px', margin: '0 auto 20px' }}>
            PaceLabs will automatically match your Strava activities to your planned workouts — for Garmin, Apple Watch, and any other device that syncs to Strava.
          </div>
          <button
            onClick={handleConnect}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '11px 22px', borderRadius: '8px', border: 'none',
              background: '#FC4C02', color: '#fff', fontSize: '14px',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Zap size={15} />
            Connect Strava
          </button>
        </div>
      )}

      {/* Connected but no candidates and not syncing */}
      {status?.connected && candidates.length === 0 && !syncing && (
        <div style={{
          background: '#111', border: '1px solid #1f1f1f', borderRadius: '12px',
          padding: '32px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '13px', color: '#71717a', lineHeight: 1.6 }}>
            Hit <strong style={{ color: '#f5f5f5' }}>Sync Runs</strong> to fetch your latest Strava activities and match them to your training plan.
          </div>
        </div>
      )}

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}