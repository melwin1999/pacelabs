'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Workout } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { CheckCircle2, Circle, GripVertical, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

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

export default function WeekView({ workouts, weekNumber }: {
  workouts: Workout[]
  weekNumber: number
}) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    new Set(workouts.filter(w => w.is_complete).map(w => w.id))
  )
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const router = useRouter()

  async function toggleComplete(workout: Workout) {
    if (workout.type === 'rest') return
    const nowComplete = !completedIds.has(workout.id)

    // Optimistic update — UI responds instantly
    setCompletedIds(prev => {
      const next = new Set(prev)
      if (nowComplete) {
        next.add(workout.id)
      } else {
        next.delete(workout.id)
      }
      return next
    })

    setLoadingId(workout.id)
    try {
      await fetch('/api/workouts/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId: workout.id, isComplete: nowComplete }),
      })
    } catch {
      // Revert if API call fails
      setCompletedIds(prev => {
  const next = new Set(prev)
  if (nowComplete) {
    next.delete(workout.id)
  } else {
    next.add(workout.id)
  }
  return next
})
    } finally {
      setLoadingId(null)
      router.refresh()
    }
  }

  const sorted = [...workouts].sort((a, b) => a.day_of_week - b.day_of_week)

  return (
    <div>
      <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
        THIS WEEK — WEEK {weekNumber}
      </p>
      <div className="space-y-2">
        {sorted.map(workout => {
          const isComplete = completedIds.has(workout.id)
          const colour = TYPE_COLOURS[workout.type] ?? '#A3A3A3'
          const dayLabel = DAY_LABELS[workout.day_of_week] ?? '?'
          const dateLabel = workout.scheduled_date
            ? format(parseISO(workout.scheduled_date), 'd MMM') : ''

          return (
            <div key={workout.id}
              className="flex items-stretch rounded-xl overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                opacity: isComplete ? 0.6 : 1,
              }}>

              {/* Left colour bar */}
              <div className="w-1 shrink-0" style={{ backgroundColor: colour }} />

              <div className="flex items-center gap-3 flex-1 px-3 py-3 min-w-0">
                <GripVertical size={16} className="shrink-0" style={{ color: 'var(--border)' }} />

                {/* Day + date */}
                <div className="shrink-0 w-10 text-center">
                  <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{dayLabel}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{dateLabel}</p>
                </div>

                {/* Workout info — tappable, goes to detail page */}
                <Link href={`/workout/${workout.id}`} className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: colour }}>
                    {TYPE_LABELS[workout.type] ?? workout.type}
                  </p>
                  <p className="text-sm font-semibold truncate" style={{
                    color: 'var(--text)',
                    textDecoration: isComplete ? 'line-through' : 'none',
                  }}>
                    {workout.name}
                  </p>
                  {workout.type !== 'rest' && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {workout.distance_km} km · {workout.pace_target} · {workout.hr_zone}
                    </p>
                  )}
                </Link>

                {/* Chevron + tick */}
                <Link href={`/workout/${workout.id}`}>
                  <ChevronRight size={16} style={{ color: 'var(--border)' }} />
                </Link>

                {workout.type !== 'rest' && (
                  <button
                    onClick={() => toggleComplete(workout)}
                    disabled={loadingId === workout.id}
                    className="transition-transform active:scale-90"
                    aria-label={isComplete ? 'Mark incomplete' : 'Mark complete'}>
                    {isComplete
                      ? <CheckCircle2 size={24} style={{ color: 'var(--success)' }} strokeWidth={2} />
                      : <Circle size={24} style={{ color: 'var(--border)' }} strokeWidth={1.5} />
                    }
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {sorted.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
            No workouts this week.
          </p>
        )}
      </div>
    </div>
  )
}