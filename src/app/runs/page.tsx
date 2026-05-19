'use client'

import { useState, useEffect, useRef } from 'react'
import {
  RefreshCw, Check, AlertCircle, ChevronDown, ChevronUp,
  Unlink, X, CheckCircle, Activity,
} from 'lucide-react'

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

function fmtWeekLabel(isoMonday: string): string {
  return new Date(isoMonday).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function fmtRowDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function deltaColour(pct: number): string {
  if (Math.abs(pct) < 10) return '#10b981'
  if (Math.abs(pct) < 30) return '#FB923C'
  return '#F87171'
}

function deltaBg(pct: number): string {
  if (Math.abs(pct) < 10) return 'rgba(16,185,129,0.06)'
  if (Math.abs(pct) < 30) return 'rgba(251,146,60,0.06)'
  return 'rgba(248,113,113,0.06)'
}

function deltaBorder(pct: number): string {
  if (Math.abs(pct) < 10) return 'rgba(16,185,129,0.2)'
  if (Math.abs(pct) < 30) return 'rgba(251,146,60,0.2)'
  return 'rgba(248,113,113,0.2)'
}

function hrZoneLabel(hr: number | null): { label: string; colour: string } | null {
  if (!hr) return null
  if (hr < 114) return { label: 'Z1 Recovery', colour: '#93C5FD' }
  if (hr < 133) return { label: 'Z2 Easy', colour: '#86EFAC' }
  if (hr < 152) return { label: 'Z3 Tempo', colour: '#FCD34D' }
  if (hr < 171) return { label: 'Z4 Threshold', colour: '#FB923C' }
  return { label: 'Z5 VO2 Max', colour: '#F87171' }
}

const WORKOUT_COLOURS: Record<string, string> = {
  easy: '#86EFAC', long: '#FCD34D', tempo: '#FB923C',
  threshold: '#F87171', intervals: '#C084FC', recovery: '#93C5FD',
  race: '#F97316', strides: '#86EFAC', fartlek: '#67E8F9',
  progression: '#A3E635', custom: '#A3A3A3', free_run: '#71717a',
}

interface WorkoutRow {
  id: string
  type: string
  name: string | null
  free_run_name: string | null
  scheduled_date: string
  distance_km: number | null
  actual_distance_km: number | null
  actual_duration_seconds: number | null
  actual_avg_pace_seconds: number | null
  actual_avg_hr: number | null
  strava_activity_id: number | null
  is_complete: boolean
  run_notes: string | null
  block_id: string | null
}

interface Week { weekStart: string; rows: WorkoutRow[] }

interface Section {
  block_id: string
  block_name: string
  block_status: string
  block_type: string | null
  start_date: string | null
  race_date: string | null
  weeks: Week[]
  total_rows: number
}

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

// ── DistanceBar ───────────────────────────────────────────────────────────────

function DistanceBar({ planned, actual }: { planned: number; actual: number }) {
  const max = Math.max(planned, actual) * 1.08
  const plannedPct = (planned / max) * 100
  const actualPct = (actual / max) * 100
  const diff = planned > 0 ? ((actual - planned) / planned) * 100 : 0
  const barColour = deltaColour(diff)

  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Planned</span>
            <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 500 }}>{planned.toFixed(1)} km</span>
          </div>
          <div style={{ height: '6px', background: '#1f1f1f', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${plannedPct}%`, background: '#3f3f46', borderRadius: '3px', transition: 'width 0.4s ease' }} />
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actual</span>
            <span style={{ fontSize: '11px', color: barColour, fontWeight: 500 }}>{actual.toFixed(1)} km <span style={{ fontSize: '10px' }}>({diff > 0 ? '+' : ''}{diff.toFixed(0)}%)</span></span>
          </div>
          <div style={{ height: '6px', background: '#1f1f1f', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${actualPct}%`, background: barColour, borderRadius: '3px', transition: 'width 0.4s ease' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MatchModal ────────────────────────────────────────────────────────────────

function MatchModal({ candidates, onConfirm, onDismiss }: {
  candidates: Candidate[]
  onConfirm: (matches: Candidate[], notes: Record<string, string>) => void
  onDismiss: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(candidates.map(c => c.workout_id)))
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)

  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleConfirm() {
    setConfirming(true)
    await onConfirm(candidates.filter(c => selected.has(c.workout_id)), notes)
    setConfirming(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#111', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: '780px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #2e2e2e', borderBottom: 'none' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#f5f5f5' }}>{candidates.length} new match{candidates.length !== 1 ? 'es' : ''} found</div>
            <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>Review and confirm to save your runs</div>
          </div>
          <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', padding: '4px' }}><X size={18} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {candidates.map(c => {
            const colour = WORKOUT_COLOURS[c.workout_type] ?? '#A3A3A3'
            const isSelected = selected.has(c.workout_id)
            const distDiff = c.planned_km > 0 ? ((c.actual_km - c.planned_km) / c.planned_km) * 100 : null
            return (
              <div key={c.workout_id} style={{ borderBottom: '1px solid #1a1a1a', padding: '14px 20px' }}>
                <div onClick={() => toggle(c.workout_id)} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0, marginTop: '2px', border: isSelected ? 'none' : '1px solid #3f3f46', background: isSelected ? '#F97316' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isSelected && <Check size={11} color="#fff" strokeWidth={3} />}
                  </div>
                  <div style={{ width: '3px', height: '44px', borderRadius: '2px', background: colour, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#f5f5f5' }}>{c.workout_name}</span>
                      <span style={{ fontSize: '11px', color: '#52525b' }}>{fmtRowDate(c.workout_date)}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '8px' }}>Strava: {c.strava_name}</div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: '#a1a1aa' }}>{c.actual_km.toFixed(1)} km <span style={{ color: '#52525b' }}>/ {c.planned_km.toFixed(1)} planned</span></span>
                      {distDiff !== null && <span style={{ fontSize: '12px', color: deltaColour(distDiff) }}>{distDiff > 0 ? '+' : ''}{distDiff.toFixed(0)}%</span>}
                      {c.actual_avg_pace_seconds && <span style={{ fontSize: '12px', color: '#a1a1aa' }}>{fmtPace(c.actual_avg_pace_seconds)}</span>}
                      {c.actual_avg_hr && <span style={{ fontSize: '12px', color: '#a1a1aa' }}>HR {c.actual_avg_hr}</span>}
                      <span style={{ fontSize: '12px', color: '#a1a1aa' }}>{fmtDuration(c.actual_duration_seconds)}</span>
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <div style={{ marginTop: '10px', paddingLeft: '33px' }}>
                    <input type="text" placeholder="Add a note (optional)…" value={notes[c.workout_id] ?? ''} onChange={e => setNotes(prev => ({ ...prev, [c.workout_id]: e.target.value }))} onClick={e => e.stopPropagation()} style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '6px', padding: '7px 10px', color: '#f5f5f5', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #1f1f1f', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onDismiss} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #2e2e2e', background: 'transparent', color: '#71717a', fontSize: '13px', cursor: 'pointer' }}>Dismiss</button>
          <button onClick={handleConfirm} disabled={confirming || selected.size === 0} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: selected.size > 0 ? '#F97316' : '#2e2e2e', color: selected.size > 0 ? '#fff' : '#52525b', fontSize: '13px', fontWeight: 600, cursor: selected.size > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={14} />
            {confirming ? 'Saving…' : `Confirm ${selected.size}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── RunRow ────────────────────────────────────────────────────────────────────

function RunRow({ row, onUnlink, allUnmatchedWorkouts, onLink }: {
  row: WorkoutRow
  onUnlink: (id: string) => void
  allUnmatchedWorkouts: WorkoutRow[]
  onLink: (freeRunId: string, workoutId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [note, setNote] = useState(row.run_notes ?? '')
  const [savingNote, setSavingNote] = useState(false)
  const [showLinkPicker, setShowLinkPicker] = useState(false)
  const noteTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isFreeRun = row.type === 'free_run'
  const isMatched = !!row.strava_activity_id && !isFreeRun
  const isUnrecorded = !row.strava_activity_id && !isFreeRun
  const hasActualData = isFreeRun || isMatched

  const colour = WORKOUT_COLOURS[row.type] ?? '#A3A3A3'
  const displayName = isFreeRun ? (row.free_run_name ?? row.name ?? 'Free Run') : (row.name ?? row.type)

  const distDiff = hasActualData && row.distance_km && row.actual_distance_km && !isFreeRun
    ? ((row.actual_distance_km - row.distance_km) / row.distance_km) * 100
    : null

  const hrZone = hrZoneLabel(row.actual_avg_hr ?? null)

  const cardBg = isMatched && distDiff !== null ? deltaBg(distDiff) : isFreeRun ? 'rgba(113,113,122,0.05)' : 'transparent'
  const cardBorder = isMatched && distDiff !== null ? deltaBorder(distDiff) : isFreeRun ? '1px solid #1f1f1f' : '1px solid #1a1a1a'

  function handleNoteChange(val: string) {
    setNote(val)
    if (noteTimeout.current) clearTimeout(noteTimeout.current)
    noteTimeout.current = setTimeout(async () => {
      setSavingNote(true)
      await fetch('/api/runs/note', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workout_id: row.id, note: val }) })
      setSavingNote(false)
    }, 800)
  }

  return (
    <div style={{ background: isUnrecorded ? 'transparent' : cardBg, borderRadius: '10px', opacity: isUnrecorded ? 0.4 : 1, border: isUnrecorded ? '1px solid #1a1a1a' : cardBorder, overflow: 'hidden' }}>

      {/* Main row */}
      <div onClick={() => !isUnrecorded && setExpanded(e => !e)} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: isUnrecorded ? 'default' : 'pointer' }}>
        <div style={{ width: '3px', alignSelf: 'stretch', minHeight: '36px', borderRadius: '2px', background: colour, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#f5f5f5' }}>{displayName}</span>
            {isFreeRun && <span style={{ fontSize: '11px', background: 'rgba(113,113,122,0.15)', color: '#71717a', padding: '2px 7px', borderRadius: '4px' }}>Unplanned</span>}
            {isMatched && distDiff !== null && (
              <span style={{ fontSize: '11px', background: Math.abs(distDiff) < 10 ? 'rgba(16,185,129,0.12)' : Math.abs(distDiff) < 30 ? 'rgba(251,146,60,0.12)' : 'rgba(248,113,113,0.12)', color: deltaColour(distDiff), padding: '2px 7px', borderRadius: '4px' }}>
                {distDiff > 0 ? '+' : ''}{distDiff.toFixed(0)}%
              </span>
            )}
            {hrZone && !isUnrecorded && (
              <span style={{ fontSize: '11px', color: hrZone.colour, background: `${hrZone.colour}18`, padding: '2px 7px', borderRadius: '4px' }}>{hrZone.label}</span>
            )}
            {isUnrecorded && <span style={{ fontSize: '11px', background: 'rgba(161,161,170,0.08)', color: '#52525b', padding: '2px 7px', borderRadius: '4px' }}>No run recorded</span>}
            <span style={{ fontSize: '11px', color: '#52525b' }}>{fmtRowDate(row.scheduled_date)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#a1a1aa', flexWrap: 'wrap' }}>
            {row.actual_distance_km != null && (
              <span>{row.actual_distance_km.toFixed(1)} km{!isFreeRun && row.distance_km && <span style={{ color: '#52525b' }}> / {row.distance_km.toFixed(1)} planned</span>}</span>
            )}
            {isUnrecorded && row.distance_km && <span style={{ color: '#52525b' }}>{row.distance_km.toFixed(1)} km planned</span>}
            {row.actual_avg_pace_seconds != null && <span>{fmtPace(row.actual_avg_pace_seconds)}</span>}
            {row.actual_avg_hr != null && <span>HR {row.actual_avg_hr}</span>}
            {row.actual_duration_seconds != null && <span>{fmtDuration(row.actual_duration_seconds)}</span>}
          </div>
        </div>

        {isFreeRun && !showLinkPicker && (
          <button onClick={e => { e.stopPropagation(); setShowLinkPicker(true) }} style={{ fontSize: '11px', color: '#F97316', background: 'rgba(249,115,22,0.1)', border: '0.5px solid rgba(249,115,22,0.2)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Link to workout
          </button>
        )}
        {!isUnrecorded && !isFreeRun && (
          <ChevronDown size={15} color="#52525b" style={{ flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        )}
        {isFreeRun && !showLinkPicker && (
          <ChevronDown size={15} color="#52525b" style={{ flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        )}
      </div>

      {/* Link picker */}
      {isFreeRun && showLinkPicker && (
        <div style={{ padding: '0 14px 12px 29px', borderTop: '1px solid #1a1a1a' }}>
          <div style={{ fontSize: '11px', color: '#71717a', margin: '10px 0 6px' }}>Link to which planned workout?</div>
          {allUnmatchedWorkouts.length === 0
            ? <div style={{ fontSize: '12px', color: '#52525b' }}>No unmatched workouts available.</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {allUnmatchedWorkouts.slice(0, 8).map(w => (
                  <button key={w.id} onClick={() => { onLink(row.id, w.id); setShowLinkPicker(false) }} style={{ background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '6px', padding: '7px 10px', color: '#a1a1aa', fontSize: '12px', cursor: 'pointer', textAlign: 'left', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ width: '3px', height: '16px', borderRadius: '2px', background: WORKOUT_COLOURS[w.type] ?? '#A3A3A3', flexShrink: 0 }} />
                    {w.name ?? w.type} · {fmtRowDate(w.scheduled_date)}
                    {w.distance_km && <span style={{ color: '#52525b' }}>· {w.distance_km.toFixed(1)} km</span>}
                  </button>
                ))}
              </div>
            )
          }
          <button onClick={() => setShowLinkPicker(false)} style={{ marginTop: '6px', fontSize: '11px', color: '#52525b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Cancel</button>
        </div>
      )}

      {/* Expanded detail — matched workouts */}
      {expanded && isMatched && (
        <div style={{ padding: '0 14px 16px 14px', borderTop: '1px solid #1a1a1a' }}>
          <div style={{ paddingTop: '14px' }}>
            {row.distance_km && row.actual_distance_km && (
              <DistanceBar planned={row.distance_km} actual={row.actual_distance_km} />
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px', marginBottom: '12px' }}>
              {[
                { label: 'Pace', val: fmtPace(row.actual_avg_pace_seconds), colour: '#FB923C' },
                { label: 'Avg HR', val: row.actual_avg_hr != null ? `${row.actual_avg_hr} bpm` : '—', colour: hrZone?.colour ?? '#a1a1aa' },
                { label: 'Duration', val: fmtDuration(row.actual_duration_seconds), colour: '#a1a1aa' },
              ].map(({ label, val, colour: c }) => (
                <div key={label} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px 12px', borderLeft: `3px solid ${c}` }}>
                  <div style={{ fontSize: '10px', color: '#52525b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f5' }}>{val}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '5px' }}>
                Notes {savingNote && <span style={{ color: '#3f3f46' }}>· saving…</span>}
              </div>
              <textarea value={note} onChange={e => handleNoteChange(e.target.value)} placeholder="How did this feel? Add anything for Coach…" rows={2} style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '6px', padding: '8px 10px', color: '#f5f5f5', fontSize: '12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5, fontFamily: 'inherit' }} />
            </div>
            <button onClick={() => onUnlink(row.id)} style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#71717a', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Unlink size={11} /> Unlink from Strava
            </button>
          </div>
        </div>
      )}

      {/* Expanded detail — free runs */}
      {expanded && isFreeRun && (
        <div style={{ padding: '0 14px 16px 14px', borderTop: '1px solid #1a1a1a' }}>
          <div style={{ paddingTop: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px', marginBottom: '12px' }}>
              {[
                { label: 'Distance', val: row.actual_distance_km != null ? `${row.actual_distance_km.toFixed(2)} km` : '—', colour: '#71717a' },
                { label: 'Pace', val: fmtPace(row.actual_avg_pace_seconds), colour: '#FB923C' },
                { label: 'Avg HR', val: row.actual_avg_hr != null ? `${row.actual_avg_hr} bpm` : '—', colour: hrZone?.colour ?? '#a1a1aa' },
                { label: 'Duration', val: fmtDuration(row.actual_duration_seconds), colour: '#a1a1aa' },
              ].map(({ label, val, colour: c }) => (
                <div key={label} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px 12px', borderLeft: `3px solid ${c}` }}>
                  <div style={{ fontSize: '10px', color: '#52525b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f5' }}>{val}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '5px' }}>
                Notes {savingNote && <span style={{ color: '#3f3f46' }}>· saving…</span>}
              </div>
              <textarea value={note} onChange={e => handleNoteChange(e.target.value)} placeholder="Unplanned run — add context for Coach…" rows={2} style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '6px', padding: '8px 10px', color: '#f5f5f5', fontSize: '12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5, fontFamily: 'inherit' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── WeekSection ───────────────────────────────────────────────────────────────

function WeekDots({ rows }: { rows: WorkoutRow[] }) {
  const recorded = rows.filter(r => r.strava_activity_id || r.type === 'free_run')
  if (recorded.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {recorded.map(r => (
        <div key={r.id} title={r.name ?? r.type} style={{ width: '8px', height: '8px', borderRadius: '50%', background: WORKOUT_COLOURS[r.type] ?? '#A3A3A3', flexShrink: 0 }} />
      ))}
    </div>
  )
}

function WeekSection({ week, isCurrentWeek, allUnmatchedWorkouts, onUnlink, onLink }: {
  week: Week
  isCurrentWeek: boolean
  allUnmatchedWorkouts: WorkoutRow[]
  onUnlink: (id: string) => void
  onLink: (freeRunId: string, workoutId: string) => void
}) {
  const [collapsed, setCollapsed] = useState(!isCurrentWeek)
  const matchedCount = week.rows.filter(r => r.strava_activity_id || r.type === 'free_run').length
  const totalKm = week.rows.reduce((sum, r) => sum + (r.actual_distance_km ?? 0), 0)

  return (
    <div style={{ marginBottom: '16px' }}>
      <button onClick={() => setCollapsed(c => !c)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px 0', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #1f1f1f', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 500, color: '#52525b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Week of {fmtWeekLabel(week.weekStart)}
          </span>
          <WeekDots rows={week.rows} />
          {matchedCount > 0 && (
            <span style={{ fontSize: '11px', color: '#3f3f46' }}>
              {totalKm.toFixed(1)} km
            </span>
          )}
        </div>
        {collapsed ? <ChevronDown size={13} color="#3f3f46" /> : <ChevronUp size={13} color="#3f3f46" />}
      </button>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {week.rows.map(row => (
            <RunRow key={row.id} row={row} onUnlink={onUnlink} allUnmatchedWorkouts={allUnmatchedWorkouts} onLink={onLink} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RunsPage() {
  const [status, setStatus] = useState<{ connected: boolean; athlete_name?: string; last_synced?: string } | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const allUnmatched = sections
    .flatMap(s => s.weeks.flatMap(w => w.rows))
    .filter(r => !r.strava_activity_id && r.type !== 'free_run')

  async function loadStatus() {
    const res = await fetch('/api/strava/status')
    const data = await res.json()
    setStatus(data)
    return data
  }

  async function loadHistory() {
    const res = await fetch('/api/runs/history')
    const data = await res.json()
    setSections(data.sections ?? [])
    if (data.sections?.length > 1) {
      setCollapsedBlocks(new Set(data.sections.slice(1).map((s: Section) => s.block_id)))
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      const st = await loadStatus()

      const params = new URLSearchParams(window.location.search)
      const stravaParam = params.get('strava')
      if (stravaParam === 'connected') { showToast('Strava connected!', true); window.history.replaceState({}, '', '/runs') }
      else if (stravaParam === 'error') { showToast('Strava connection failed.', false); window.history.replaceState({}, '', '/runs') }

      await loadHistory()

      if (st?.connected) {
        setSyncing(true)
        try {
          const res = await fetch('/api/strava/sync')
          const data = await res.json()
          if (data.candidates?.length > 0) setCandidates(data.candidates)
          await loadHistory()
        } catch { /* silent */ }
        setSyncing(false)
      }

      setLoading(false)
    }
    init()
  }, [])

  async function handleManualSync() {
    setSyncing(true)
    setCandidates([])
    try {
      const res = await fetch('/api/strava/sync')
      const data = await res.json()
      if (data.candidates?.length > 0) setCandidates(data.candidates)
      else showToast('All runs are up to date', true)
      await loadHistory()
    } catch { showToast('Sync failed. Try again.', false) }
    setSyncing(false)
  }

  async function handleConfirm(matches: Candidate[], notes: Record<string, string>) {
    const res = await fetch('/api/strava/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matches, notes }),
    })
    const data = await res.json()
    if (data.ok) { showToast(`${data.count} run${data.count !== 1 ? 's' : ''} saved ✓`, true); setCandidates([]); await loadHistory() }
    else showToast('Something went wrong', false)
  }

  async function handleUnlink(workoutId: string) {
    await fetch('/api/runs/unlink', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workout_id: workoutId }) })
    await loadHistory()
    showToast('Run unlinked', true)
  }

  async function handleLink(freeRunId: string, workoutId: string) {
    await fetch('/api/runs/link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ free_run_id: freeRunId, workout_id: workoutId }) })
    await loadHistory()
    showToast('Run linked ✓', true)
  }

  function toggleBlock(blockId: string) {
    setCollapsedBlocks(prev => { const n = new Set(prev); n.has(blockId) ? n.delete(blockId) : n.add(blockId); return n })
  }

  const lastSyncedLabel = status?.last_synced
    ? new Date(status.last_synced).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div style={{ maxWidth: '780px', padding: '0 16px 40px' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: toast.ok ? '#10b981' : '#F87171', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {toast.ok ? <Check size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {candidates.length > 0 && (
        <MatchModal candidates={candidates} onConfirm={handleConfirm} onDismiss={() => setCandidates([])} />
      )}

      <div style={{ padding: '28px 0 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Activity size={20} color="#F97316" />
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#f5f5f5', margin: 0 }}>Runs</h1>
          </div>
          {lastSyncedLabel && <div style={{ fontSize: '12px', color: '#52525b', marginTop: '2px' }}>Last synced: {lastSyncedLabel}</div>}
        </div>
        {status?.connected && (
          <button onClick={handleManualSync} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#F97316', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: syncing ? 'default' : 'pointer', opacity: syncing ? 0.7 : 1, flexShrink: 0 }}>
            <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
        )}
      </div>

      {!status?.connected && !loading && (
        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(252,76,2,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Activity size={22} color="#FC4C02" />
          </div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#f5f5f5', marginBottom: '8px' }}>Connect Strava to track your runs</div>
          <div style={{ fontSize: '13px', color: '#71717a', lineHeight: 1.6, maxWidth: '360px', margin: '0 auto' }}>
            Go to <strong style={{ color: '#f5f5f5' }}>Settings</strong> to connect your Strava account.
          </div>
        </div>
      )}

      {loading && <div style={{ padding: '40px 0', textAlign: 'center', color: '#52525b', fontSize: '13px' }}>Loading runs…</div>}

      {!loading && status?.connected && (
        sections.length === 0
          ? (
            <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#71717a' }}>No runs yet. Hit <strong style={{ color: '#f5f5f5' }}>Sync</strong> to pull your latest Strava activities.</div>
            </div>
          )
          : sections.map(section => (
            <div key={section.block_id} style={{ marginBottom: '32px' }}>
              <button onClick={() => toggleBlock(section.block_id)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 6px 0', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #2e2e2e' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#f5f5f5' }}>{section.block_name}</span>
                  {section.block_status !== 'active' && section.block_status !== 'misc' && (
                    <span style={{ marginLeft: '8px', fontSize: '11px', color: '#3f3f46', background: '#1a1a1a', padding: '2px 7px', borderRadius: '4px' }}>Archived</span>
                  )}
                </div>
                {collapsedBlocks.has(section.block_id) ? <ChevronDown size={14} color="#52525b" /> : <ChevronUp size={14} color="#52525b" />}
              </button>

              {!collapsedBlocks.has(section.block_id) && section.weeks.map((week, i) => (
                <WeekSection key={week.weekStart} week={week} isCurrentWeek={i === 0 && section.block_status === 'active'} allUnmatchedWorkouts={allUnmatched} onUnlink={handleUnlink} onLink={handleLink} />
              ))}
            </div>
          ))
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}