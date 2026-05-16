'use client'

import { useState } from 'react'
import { Workout } from '@/lib/types'
import { formatWorkoutPace } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { MoreHorizontal, SkipForward, Calendar, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import SkipModal from './SkipModal'
import WorkoutModal, { ModalMode } from '@/components/block/WorkoutModal'

const TYPE_COLOURS: Record<string, string> = {
  easy: '#86EFAC', long: '#FCD34D', tempo: '#FB923C', threshold: '#F87171',
  intervals: '#C084FC', recovery: '#93C5FD', race: '#F97316',
  rest: '#3F3F46', strides: '#86EFAC', fartlek: '#67E8F9',
  progression: '#A3E635', custom: '#A3A3A3',
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HARD_TYPES = new Set(['tempo', 'threshold', 'intervals', 'race'])
const TYPE_LABELS: Record<string, string> = {
  easy: 'Easy', long: 'Long Run', tempo: 'Tempo', threshold: 'Threshold',
  intervals: 'Intervals', recovery: 'Recovery', race: 'Race',
  rest: 'Rest', strides: 'Strides', fartlek: 'Fartlek',
  progression: 'Progression', custom: 'Custom',
}

interface ValidationWarning { message: string }

function getValidationWarnings(workouts: Workout[], movedId: string, targetDate: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = []
  const sorted = [...workouts]
    .map(w => w.id === movedId ? { ...w, scheduled_date: targetDate } : w)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]; const curr = sorted[i]
    const dayDiff = Math.round((parseISO(curr.scheduled_date).getTime() - parseISO(prev.scheduled_date).getTime()) / 86400000)
    if (dayDiff === 1) {
      if (HARD_TYPES.has(prev.type) && HARD_TYPES.has(curr.type))
        warnings.push({ message: `Hard sessions back-to-back: ${TYPE_LABELS[prev.type]} then ${TYPE_LABELS[curr.type]}` })
      if ((prev.type === 'long' && HARD_TYPES.has(curr.type)) || (HARD_TYPES.has(prev.type) && curr.type === 'long'))
        warnings.push({ message: `Long run and hard session on consecutive days` })
    }
  }
  return warnings
}

export default function WeekView({
  workouts, weekNumber, blockId, totalWeeks,
}: {
  workouts: Workout[]
  weekNumber: number
  blockId: string
  totalWeeks: number
}) {
  const [localWorkouts, setLocalWorkouts] = useState<Workout[]>(workouts)
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    new Set(workouts.filter(w => w.is_complete).map(w => w.id))
  )
  const [skippedIds, setSkippedIds] = useState<Set<string>>(
    new Set(workouts.filter(w => w.skipped).map(w => w.id))
  )
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [skipTarget, setSkipTarget] = useState<Workout | null>(null)
  const [warnings, setWarnings] = useState<ValidationWarning[]>([])
  const [showMoveSheet, setShowMoveSheet] = useState<{ workout: Workout } | null>(null)
  const [moveDate, setMoveDate] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalMode | null>(null)
  const router = useRouter()

  async function toggleComplete(workoutId: string) {
    const workout = localWorkouts.find(w => w.id === workoutId)
    if (!workout || workout.type === 'rest' || skippedIds.has(workoutId)) return
    const nowComplete = !completedIds.has(workoutId)
    setCompletedIds(prev => { const n = new Set(prev); nowComplete ? n.add(workoutId) : n.delete(workoutId); return n })
    setLoadingId(workoutId)
    // Also close modal if open
    setModal(null)
    try {
      await fetch('/api/workouts/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId, isComplete: nowComplete }),
      })
    } catch {
      setCompletedIds(prev => { const n = new Set(prev); nowComplete ? n.delete(workoutId) : n.add(workoutId); return n })
    } finally { setLoadingId(null); router.refresh() }
  }

  async function confirmSkip(reason: string) {
    if (!skipTarget) return
    const id = skipTarget.id
    setSkipTarget(null)
    setSkippedIds(prev => new Set([...prev, id]))
    setCompletedIds(prev => { const n = new Set(prev); n.delete(id); return n })
    try {
      await fetch('/api/workouts/skip', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId: id, skipped: true, reason }),
      })
    } catch {
      setSkippedIds(prev => { const n = new Set(prev); n.delete(id); return n })
    } finally { router.refresh() }
  }

  async function undoSkip(workout: Workout) {
    setSkippedIds(prev => { const n = new Set(prev); n.delete(workout.id); return n })
    try {
      await fetch('/api/workouts/skip', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId: workout.id, skipped: false }),
      })
    } catch {
      setSkippedIds(prev => new Set([...prev, workout.id]))
    } finally { router.refresh() }
  }

  function handleDragStart(e: React.DragEvent, workout: Workout) {
    setDraggingId(workout.id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('workoutId', workout.id)
  }

  function handleDragOver(e: React.DragEvent, targetWorkout: Workout) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggingId && draggingId !== targetWorkout.id) {
      setDragOverId(targetWorkout.id)
      setWarnings(getValidationWarnings(localWorkouts, draggingId, targetWorkout.scheduled_date))
    }
  }

  function handleDragLeave() { setDragOverId(null); setWarnings([]) }

  async function handleDrop(e: React.DragEvent, targetWorkout: Workout) {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('workoutId')
    setDraggingId(null); setDragOverId(null)
    if (!sourceId || sourceId === targetWorkout.id) return
    const source = localWorkouts.find(w => w.id === sourceId)
    if (!source) return
    setLocalWorkouts(prev => prev.map(w => w.id === sourceId ? {
      ...w, scheduled_date: targetWorkout.scheduled_date,
      day_of_week: targetWorkout.day_of_week, week_number: targetWorkout.week_number,
    } : w))
    try {
      const res = await fetch('/api/workouts/move', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId: sourceId, newDate: targetWorkout.scheduled_date,
          newWeekNumber: targetWorkout.week_number, newDayOfWeek: targetWorkout.day_of_week,
        }),
      })
      if (!res.ok) throw new Error()
    } catch { setLocalWorkouts(workouts) }
    finally { setWarnings([]); router.refresh() }
  }

  function handleDragEnd() { setDraggingId(null); setDragOverId(null); setWarnings([]) }

  async function confirmMove() {
    if (!showMoveSheet || !moveDate) return
    const workout = showMoveSheet.workout
    const chosen = parseISO(moveDate)
    const dayOfWeek = (chosen.getDay() + 6) % 7
    setShowMoveSheet(null)
    setLocalWorkouts(prev => prev.map(w => w.id === workout.id
      ? { ...w, scheduled_date: moveDate, day_of_week: dayOfWeek } : w))
    try {
      await fetch('/api/workouts/move', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId: workout.id, newDate: moveDate, newDayOfWeek: dayOfWeek, newWeekNumber: workout.week_number }),
      })
    } catch { setLocalWorkouts(workouts) }
    finally { router.refresh() }
  }

  const sorted = [...localWorkouts].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div>
      {modal && (
        <WorkoutModal
          mode={modal}
          onClose={() => setModal(null)}
        />
      )}

       {openMenuId && <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpenMenuId(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: '#f5f5f5' }}>This week</p>
        <p style={{ fontSize: '11px', color: '#52525b', fontWeight: 500 }}>Drag to reschedule</p>
      </div>

      {warnings.length > 0 && (
        <div style={{
          marginBottom: '12px', borderRadius: '12px', padding: '10px 12px',
          display: 'flex', alignItems: 'flex-start', gap: '8px',
          background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)',
        }}>
          <AlertTriangle size={14} style={{ color: '#f97316', marginTop: '2px', flexShrink: 0 }} />
          <div>
            {warnings.map((w, i) => <p key={i} style={{ fontSize: '12px', color: '#f97316' }}>{w.message}</p>)}
            <p style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>You can still drop here — just a heads up.</p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {sorted.map((workout, index) => {
          const isComplete = completedIds.has(workout.id)
          const isSkipped = skippedIds.has(workout.id)
          const isDragging = draggingId === workout.id
          const isDragOver = dragOverId === workout.id
          const isHovered = hoveredId === workout.id
          const isToday = workout.scheduled_date === todayStr
          const colour = TYPE_COLOURS[workout.type] ?? '#A3A3A3'
          const barColour = isSkipped ? '#f97316' : colour
          const dayLabel = DAY_LABELS[workout.day_of_week] ?? '?'
          const dateNum = workout.scheduled_date ? format(parseISO(workout.scheduled_date), 'd') : ''
          const paceDisplay = formatWorkoutPace(workout.pace_min_seconds ?? null, workout.pace_max_seconds ?? null, null)
          const menuOpen = openMenuId === workout.id
          const isLong = workout.type === 'long'

          return (
            <div key={workout.id} style={{ position: 'relative', animation: 'fadeUp 0.3s ease both', animationDelay: `${index * 40}ms`, zIndex: menuOpen ? 10 : 1 }}>
              <div
                draggable={workout.type !== 'rest' && !isSkipped}
                onDragStart={e => handleDragStart(e, workout)}
                onDragOver={e => handleDragOver(e, workout)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, workout)}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setHoveredId(workout.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  display: 'flex', alignItems: 'stretch',
                  background: isToday ? 'rgba(249,115,22,0.04)' : '#111111',
                  border: isDragOver ? '1px solid #f97316'
                    : isToday ? '1px solid rgba(249,115,22,0.3)'
                    : isHovered ? '1px solid #2e2e2e'
                    : '1px solid #1f1f1f',
                  borderRadius: '14px',
                  opacity: isDragging ? 0.35 : (isComplete || isSkipped) ? 0.45 : 1,
                  transform: isDragOver ? 'scale(1.01)' : isHovered && !isDragging ? 'scale(1.005)' : 'scale(1)',
                  transition: 'all 0.18s ease',
                  overflow: 'hidden', cursor: 'pointer',
                }}
              >
                {/* Bold left colour bar */}
                <div style={{
                  width: '4px', flexShrink: 0, alignSelf: 'stretch',
                  background: barColour,
                  boxShadow: isToday ? `2px 0 8px ${barColour}66` : 'none',
                  minHeight: '56px',
                }} />

                {/* Content */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, padding: '13px 14px' }}>

                  {/* Day + date */}
                  <div style={{ width: '36px', flexShrink: 0, textAlign: 'center' }}>
                    <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.8px', color: '#52525b', textTransform: 'uppercase' }}>{dayLabel}</p>
                    <p style={{ fontSize: '20px', fontWeight: 800, lineHeight: 1, color: isToday ? '#f97316' : '#f5f5f5', letterSpacing: '-0.5px' }}>{dateNum}</p>
                  </div>

                  {/* Info — now opens modal instead of navigating */}
                  <div
                    style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                    onClick={e => {
                      e.stopPropagation()
                      if (workout.type !== 'rest') {
                        setModal({
                          type: 'single',
                          workout,
                          onMarkComplete: (id) => toggleComplete(id),
                        })
                      }
                    }}
                  >
                    <p style={{
                      fontSize: '14px', fontWeight: 600, marginBottom: '3px',
                      color: isSkipped ? '#71717a' : isLong ? '#FCD34D' : '#e4e4e7',
                      textDecoration: isSkipped ? 'line-through' : 'none',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{workout.name}</p>
                    {workout.type !== 'rest' && (
                      <p style={{ fontSize: '12px', color: '#52525b', fontWeight: 500 }}>
                        {workout.distance_km ? `${workout.distance_km} km` : ''}
                        {paceDisplay ? ` · ${paceDisplay}` : ''}
                        {workout.hr_zone ? ` · ${workout.hr_zone}` : ''}
                      </p>
                    )}
                    {isSkipped && workout.skipped_reason && (
                      <p style={{ fontSize: '10px', color: '#52525b', fontStyle: 'italic', marginTop: '2px' }}>"{workout.skipped_reason}"</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {workout.type !== 'rest' && (
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenuId(menuOpen ? null : workout.id) }}
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: '#3f3f46', padding: '4px', borderRadius: '6px', transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#71717a')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#3f3f46')}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    )}

                    {workout.type !== 'rest' && !isSkipped && (
                      <button
                        onClick={e => { e.stopPropagation(); toggleComplete(workout.id) }}
                        disabled={loadingId === workout.id}
                        style={{
                          width: '30px', height: '30px', borderRadius: '50%',
                          border: isComplete ? '1.5px solid #10b981' : '1.5px solid #2e2e2e',
                          background: isComplete ? 'rgba(16,185,129,0.12)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', fontSize: '13px',
                          color: isComplete ? '#10b981' : '#52525b',
                          transition: 'all 0.18s ease',
                          transform: loadingId === workout.id ? 'scale(0.9)' : 'scale(1)',
                        }}
                        onMouseEnter={e => { if (!isComplete) { e.currentTarget.style.borderColor = '#52525b'; e.currentTarget.style.color = '#a1a1aa' }}}
                        onMouseLeave={e => { if (!isComplete) { e.currentTarget.style.borderColor = '#2e2e2e'; e.currentTarget.style.color = '#52525b' }}}
                      >
                        {isComplete ? '✓' : '○'}
                      </button>
                    )}

                    {isSkipped && (
                      <span style={{
                        fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px',
                        padding: '3px 8px', borderRadius: '100px',
                        background: 'rgba(249,115,22,0.1)', color: '#f97316',
                        border: '1px solid rgba(249,115,22,0.2)',
                      }}>SKIPPED</span>
                    )}
                  </div>
                </div>
              </div>

              {menuOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 50,
                  borderRadius: '12px', padding: '4px', minWidth: '160px',
                  background: '#1a1a1a', border: '1px solid #2e2e2e',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                }}>
                  {!isSkipped ? (
                    <button onMouseDown={e => { e.stopPropagation(); const w = localWorkouts.find(x => x.id === workout.id) ?? workout; setOpenMenuId(null); setSkipTarget(w) }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 12px', fontSize: '13px', color: '#f97316',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        borderRadius: '8px', textAlign: 'left', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    ><SkipForward size={14} /> Skip session</button>
                  ) : (
                    <button onMouseDown={e => { e.stopPropagation(); setOpenMenuId(null); undoSkip(workout) }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 12px', fontSize: '13px', color: '#a1a1aa',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        borderRadius: '8px', textAlign: 'left', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#2e2e2e')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    ><SkipForward size={14} /> Un-skip</button>
                  )}
                  <button onMouseDown={e => { e.stopPropagation(); const w = localWorkouts.find(x => x.id === workout.id) ?? workout; setOpenMenuId(null); setMoveDate(w.scheduled_date); setShowMoveSheet({ workout: w }) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 12px', fontSize: '13px', color: '#f5f5f5',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      borderRadius: '8px', textAlign: 'left', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#2e2e2e')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  ><Calendar size={14} /> Move to…</button>
                </div>
              )}
            </div>
          )
        })}

        {sorted.length === 0 && (
          <p style={{ fontSize: '14px', textAlign: 'center', padding: '32px 0', color: '#52525b' }}>No workouts this week.</p>
        )}
      </div>

      {skipTarget && (
        <SkipModal workoutName={skipTarget.name} onConfirm={confirmSkip} onCancel={() => setSkipTarget(null)} />
      )}

      {showMoveSheet && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px',
          background: 'rgba(0,0,0,0.7)',
        }} onClick={() => setShowMoveSheet(null)}>
          <div style={{
            width: '100%', maxWidth: '400px', borderRadius: '20px', padding: '20px',
            background: '#1a1a1a', border: '1px solid #2e2e2e',
            display: 'flex', flexDirection: 'column', gap: '16px',
          }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#f5f5f5' }}>Move to a different day</p>
            <p style={{ fontSize: '13px', color: '#71717a' }}>{showMoveSheet.workout.name}</p>
            <input type="date" value={moveDate} onChange={e => setMoveDate(e.target.value)}
              style={{
                width: '100%', borderRadius: '12px', padding: '10px 14px',
                background: '#111111', border: '1px solid #2e2e2e',
                color: '#f5f5f5', fontSize: '14px', outline: 'none',
              }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowMoveSheet(null)} style={{
                flex: 1, padding: '11px', borderRadius: '12px', fontSize: '14px',
                fontWeight: 600, background: '#111111', border: '1px solid #2e2e2e',
                color: '#71717a', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={confirmMove} disabled={!moveDate} style={{
                flex: 1, padding: '11px', borderRadius: '12px', fontSize: '14px',
                fontWeight: 700, background: '#f97316', border: 'none',
                color: '#fff', cursor: 'pointer', opacity: moveDate ? 1 : 0.4,
                boxShadow: '0 0 20px rgba(249,115,22,0.3)',
              }}>Move</button>
            </div>
          </div>
        </div>
      )}

      </div>
  )
}