"use client";

import { useState, useEffect } from "react";
import { PlanChange } from "@/lib/types";

const SOURCE_LABELS: Record<string, string> = {
  manual_drag: "Manual drag",
  coach_chat: "Coach chat",
  auto_adapt: "Auto-adapt",
  skip: "Skipped",
};

const SOURCE_COLORS: Record<string, string> = {
  manual_drag: "#60A5FA",
  coach_chat: "#C084FC",
  auto_adapt: "#F97316",
  skip: "#A3A3A3",
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  moved: "Moved",
  swapped: "Swapped",
  skipped: "Skipped",
  edited: "Edited",
  added: "Added",
  removed: "Removed",
};

const SOURCE_FILTERS = [
  { key: "all", label: "All" },
  { key: "manual_drag", label: "Manual" },
  { key: "coach_chat", label: "Coach" },
  { key: "auto_adapt", label: "Auto-adapt" },
  { key: "skip", label: "Skips" },
];

type Props = {
  blockName: string;
  aggressiveness: string;
  changes: PlanChange[];
  workoutsById: Record<string, { name: string }>;
};

function buildStravaAuthUrl() {
  const clientId = '247863'
  const redirectUri = 'https://pacelabs.run/api/strava/callback'
  const scope = 'activity:read_all'
  return `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&approval_prompt=auto`
}

function StravaCard() {
  const [status, setStatus] = useState<{ connected: boolean; athlete_name?: string; last_synced?: string } | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetch('/api/strava/status').then(r => r.json()).then(setStatus)
  }, [])

  async function handleDisconnect() {
    setDisconnecting(true)
    await fetch('/api/strava/disconnect', { method: 'POST' })
    const res = await fetch('/api/strava/status')
    const data = await res.json()
    setStatus(data)
    setDisconnecting(false)
    showToast('Strava disconnected', true)
  }

  return (
    <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '18px 20px', marginBottom: '12px' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: toast.ok ? '#10b981' : '#F87171', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500 }}>
          {toast.msg}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#FC4C02', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f5' }}>Strava</div>
            {status === null && <div style={{ fontSize: '12px', color: '#52525b', marginTop: '2px' }}>Loading…</div>}
            {status?.connected && <div style={{ fontSize: '12px', color: '#10b981', marginTop: '2px' }}>● Connected{status.athlete_name ? ` · ${status.athlete_name}` : ''}</div>}
            {status !== null && !status.connected && <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>Not connected</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {status?.connected ? (
            <button onClick={handleDisconnect} disabled={disconnecting} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #2e2e2e', background: 'transparent', color: '#71717a', fontSize: '13px', cursor: 'pointer', opacity: disconnecting ? 0.6 : 1 }}>
              Disconnect
            </button>
          ) : status !== null && (
            <button onClick={() => window.location.href = buildStravaAuthUrl()} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#FC4C02', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Connect Strava
            </button>
          )}
        </div>
      </div>
      {status?.connected && status.last_synced && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1f1f1f', fontSize: '12px', color: '#52525b' }}>
          Last synced: {new Date(status.last_synced).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}

function GarminCard() {
  const [status, setStatus] = useState<{ connected: boolean; email?: string; name?: string } | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    fetch('/api/garmin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status' }) })
      .then(r => r.json()).then(setStatus)
  }, [])

  async function handleConnect() {
    if (!email || !password) return
    setLoading(true)
    try {
      const res = await fetch('/api/garmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', email, password }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        showToast(data.error || 'Connection failed', false)
      } else {
        setStatus({ connected: true, email, name: data.name })
        setShowForm(false)
        setPassword('')
        showToast('Garmin connected!', true)
      }
    } catch {
      showToast('Connection failed', false)
    }
    setLoading(false)
  }

  async function handleDisconnect() {
    setLoading(true)
    await fetch('/api/garmin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'disconnect' }) })
    setStatus({ connected: false })
    setLoading(false)
    showToast('Garmin disconnected', true)
  }

  return (
    <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '18px 20px', marginBottom: '32px' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: toast.ok ? '#10b981' : '#F87171', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500 }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Garmin logo mark */}
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#007CC3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" fill="none"/>
              <path d="M12 7v5l3 3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f5' }}>Garmin Connect</div>
            {status === null && <div style={{ fontSize: '12px', color: '#52525b', marginTop: '2px' }}>Loading…</div>}
            {status?.connected && (
              <div style={{ fontSize: '12px', color: '#10b981', marginTop: '2px' }}>
                ● Connected{status.name ? ` · ${status.name}` : ''}
              </div>
            )}
            {status !== null && !status.connected && (
              <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>Not connected</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {status?.connected ? (
            <button onClick={handleDisconnect} disabled={loading} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #2e2e2e', background: 'transparent', color: '#71717a', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              Disconnect
            </button>
          ) : status !== null && (
            <button onClick={() => setShowForm(f => !f)} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#007CC3', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              {showForm ? 'Cancel' : 'Connect Garmin'}
            </button>
          )}
        </div>
      </div>

      {showForm && !status?.connected && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: '12px', color: '#71717a', marginBottom: '12px' }}>
            Enter your Garmin Connect credentials. These are stored securely and used only to push workouts to your calendar.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="email"
              placeholder="Garmin Connect email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #2e2e2e', background: '#0d0d0d', color: '#f5f5f5', fontSize: '13px', outline: 'none' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #2e2e2e', background: '#0d0d0d', color: '#f5f5f5', fontSize: '13px', outline: 'none' }}
            />
            <button
              onClick={handleConnect}
              disabled={loading || !email || !password}
              style={{ padding: '10px', borderRadius: '8px', border: 'none', background: '#007CC3', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading || !email || !password ? 0.6 : 1 }}
            >
              {loading ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SettingsClient({ blockName, aggressiveness, changes, workoutsById }: Props) {
  const [filter, setFilter] = useState("all");
  const filtered = changes.filter((c) => filter === "all" || c.source === filter);

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px', color: '#f5f5f5' }}>
      <div style={{ maxWidth: '860px', padding: '28px 24px 0' }}>

        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f5f5f5', marginBottom: '4px', letterSpacing: '-0.02em' }}>
          Settings
        </h1>
        {blockName && (
          <p style={{ fontSize: '13px', color: '#71717a', marginBottom: '28px' }}>
            {blockName} · Aggressiveness: <strong style={{ color: '#a1a1aa' }}>{aggressiveness}</strong>
          </p>
        )}

        <div style={{ fontSize: '11px', fontWeight: 600, color: '#52525b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
          Integrations
        </div>

        <StravaCard />
        <GarminCard />

        <div style={{ fontSize: '11px', fontWeight: 600, color: '#52525b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
          Plan changes log
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {SOURCE_FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                  background: active ? '#F97316' : '#1a1a1a',
                  color: active ? '#fff' : '#71717a',
                  border: active ? '1px solid #F97316' : '1px solid #2e2e2e',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p style={{ fontSize: '13px', color: '#52525b' }}>
            No changes logged{filter !== "all" ? " for this filter" : ""} yet.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map((c) => {
            const wo = c.workout_id ? workoutsById[c.workout_id] : null;
            const col = SOURCE_COLORS[c.source] ?? "#71717A";
            const date = new Date(c.created_at).toLocaleString("en-GB", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            });
            return (
              <div key={c.id} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '3px', flexShrink: 0, alignSelf: 'stretch', borderRadius: '2px', background: col }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, color: col, border: `1px solid ${col}`, padding: '2px 7px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)' }}>
                        {SOURCE_LABELS[c.source] ?? c.source}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#f5f5f5' }}>
                        {CHANGE_TYPE_LABELS[c.change_type] ?? c.change_type}
                      </span>
                      {wo && <span style={{ fontSize: '12px', color: '#71717a' }}>· {wo.name}</span>}
                    </div>
                    <span style={{ fontSize: '11px', color: '#52525b' }}>{date}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#71717a' }}>
                    {c.change_type === "edited" && c.field_changed && (
                      <span>{c.field_changed.replace("_", " ")}: {c.old_value} → {c.new_value}</span>
                    )}
                    {c.change_type === "moved" && (
                      <span>{c.from_date} → {c.to_date}</span>
                    )}
                    {c.change_type === "skipped" && c.reason && (
                      <span>Reason: {c.reason}</span>
                    )}
                  </div>
                  {c.reason && c.change_type !== "skipped" && (
                    <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#52525b', marginTop: '3px' }}>{c.reason}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}