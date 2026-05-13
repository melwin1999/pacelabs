'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Workout } from '@/lib/types'
import { formatWorkoutPace } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import {
  CheckCircle2, Circle, GripVertical,
  ChevronRight, MoreHorizontal, SkipForward,
  AlertTriangle, Calendar
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import SkipModal from './SkipModal'

const TYPE_COLOURS: Record<string, string> = {
  easy: '#86EFAC', long: '#FCD34D', tempo: '#FB923C', threshold: '#F87171',
  intervals: '#C084FC', recovery: '#93C5FD', race: '#F97316',
  rest: '#3F3F46', strides: '#86EFAC', fartlek: '#67E8F9',
  progression: '#A3E635', custom: '#A3A3A3',
}

const TYPE_LABELS: Record<string, string> = {
  easy: 'Easy', long: 'Long Run', tempo: 'Tempo', threshold: 'Threshold',
  intervals: 'Intervals', recovery: 'Recovery', race: 'Race',
  rest: 'Rest', strides: 'Strides', fartlek: 'Fartlek',
  progression: 'Progression', custom: 'Custom',
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HARD_TYPES = new Set(['tempo', 'threshold', 'intervals', 'race'])

interface ValidationWarning { message: string }

function getValidationWarnings(workouts: Workout[], movedId: string, targetDate: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = []
  const sorted = [...workouts]
    .map(w => w.id === movedId ? { ...w, scheduled_date: targetDate } : w)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
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
  const router = useRouter()

  async function toggleComplete(workout: Workout) {
    if (workout.type === 'rest' || skippedIds.has(workout.id)) return
    const nowComplete = !completedIds.has(workout.id)
    setCompletedIds(prev => { const n = new Set(prev); nowComplete ? n.add(workout.id) : n.delete(workout.id); return n })
    setLoadingId(workout.id)
    try {
      await fetch('/api/workouts/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId: workout.id, isComplete: nowComplete }),
      })
    } catch {
      setCompletedIds(prev => { const n = new Set(prev); nowComplete ? n.delete(workout.id) : n.add(workout.id); return n })
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
    setShowMoveSheet(null)
    const chosen = parseISO(moveDate)
    const dayOfWeek = (chosen.getDay() + 6) % 7
    try {
      await fetch('/api/workouts/move', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId: workout.id, newDate: moveDate, newDayOfWeek: dayOfWeek, newWeekNumber: workout.week_number }),
      })
    } catch { } finally { router.refresh() }
  }

  const sorted = [...localWorkouts].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))

  return (
    <div>
      <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
        THIS WEEK — WEEK {weekNumber}
      </p>

      {warnings.length > 0 && (
        <div className="mb-3 rounded-xl px-3 py-2 flex items-start gap-2"
          style={{ backgroundColor: '#F9731622', border: '1px solid #F9731644' }}>
          <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: '#F97316' }} />
          <div>
            {warnings.map((w, i) => <p key={i} className="text-xs" style={{ color: '#F97316' }}>{w.message}</p>)}
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>You can still drop here — just a heads up.</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sorted.map(workout => {
          const isComplete = completedIds.has(workout.id)
          const isSkipped = skippedIds.has(workout.id)
          const isDragging = draggingId === workout.id
          const isDragOver = dragOverId === workout.id
          const colour = TYPE_COLOURS[workout.type] ?? '#A3A3A3'
          const dayLabel = DAY_LABELS[workout.day_of_week] ?? '?'
          const dateLabel = workout.scheduled_date ? format(parseISO(workout.scheduled_date), 'd MMM') : ''
          const paceDisplay = formatWorkoutPace(workout.pace_min_seconds, workout.pace_max_seconds, workout.pace_target)
          const menuOpen = openMenuId === workout.id

          return (
            <div key={workout.id} className="relative">
              <div
                draggable={workout.type !== 'rest' && !isSkipped}
                onDragStart={e => handleDragStart(e, workout)}
                onDragOver={e => handleDragOver(e, workout)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, workout)}
                onDragEnd={handleDragEnd}
                className="flex items-stretch rounded-xl transition-all"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: isDragOver ? '1px solid #F97316' : '1px solid var(--border)',
                  opacity: isDragging ? 0.4 : (isComplete || isSkipped) ? 0.6 : 1,
                  transform: isDragOver ? 'scale(1.01)' : 'scale(1)',
                  boxShadow: isDragOver ? '0 0 0 2px #F97316' : 'none',
                }}
              >
                <div className="w-1 shrink-0 rounded-l-xl" style={{ backgroundColor: isSkipped ? '#F97316' : colour }} />

                <div className="flex items-center gap-3 flex-1 px-3 py-3 min-w-0">
                  <GripVertical size={16} className="shrink-0 cursor-grab active:cursor-grabbing" style={{ color: 'var(--border)' }} />

                  <div className="shrink-0 w-10 text-center">
                    <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{dayLabel}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{dateLabel}</p>
                  </div>

                  <Link href={`/workout/${workout.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: isSkipped ? '#F97316' : colour }}>
                        {TYPE_LABELS[workout.type] ?? workout.type}
                      </p>
                      {isSkipped && (
                        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: '#F9731633', color: '#F97316' }}>SKIPPED</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold truncate" style={{
                      color: 'var(--text)',
                      textDecoration: (isComplete || isSkipped) ? 'line-through' : 'none',
                    }}>{workout.name}</p>
                    {workout.type !== 'rest' && paceDisplay && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {workout.distance_km} km · {paceDisplay} · {workout.hr_zone}
                      </p>
                    )}
                    {isSkipped && workout.skipped_reason && (
                      <p className="text-[10px] mt-0.5 italic" style={{ color: 'var(--text-muted)' }}>"{workout.skipped_reason}"</p>
                    )}
                  </Link>

                  <div className="flex items-center gap-1 shrink-0">
                    <Link href={`/workout/${workout.id}`}>
                      <ChevronRight size={16} style={{ color: 'var(--border)' }} />
                    </Link>

                    {workout.type !== 'rest' && (
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenuId(menuOpen ? null : workout.id) }}
                        className="p-1 rounded-lg"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    )}

                    {workout.type !== 'rest' && !isSkipped && (
                      <button
                        onClick={() => toggleComplete(workout)}
                        disabled={loadingId === workout.id}
                        className="transition-transform active:scale-90"
                      >
                        {isComplete
                          ? <CheckCircle2 size={24} style={{ color: 'var(--success)' }} strokeWidth={2} />
                          : <Circle size={24} style={{ color: 'var(--border)' }} strokeWidth={1.5} />}
                      </button>
                    )}