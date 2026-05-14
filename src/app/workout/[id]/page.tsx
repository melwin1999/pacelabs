import { supabase } from '@/lib/supabase'
import { Workout, WorkoutStructureStep } from '@/lib/types'
import { notFound } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, Flame } from 'lucide-react'
import MarkCompleteButton from '@/components/plan/MarkCompleteButton'

const TYPE_COLOURS: Record<string, string> = {
  easy: '#86EFAC', long: '#FCD34D', tempo: '#FB923C', threshold: '#F87171',
  intervals: '#C084FC', recovery: '#93C5FD', race: '#F97316',
  rest: '#3F3F46', strides: '#86EFAC', fartlek: '#67E8F9',
  progression: '#A3E635', custom: '#A3A3A3',
}

function StructureStep({ step }: { step: WorkoutStructureStep }) {
  const dotColour =
    step.type === 'warmup' ? '#93C5FD'
    : step.type === 'cooldown' ? '#86EFAC'
    : step.type === 'interval' ? '#C084FC'
    : '#F97316'

  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: dotColour }} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {step.type}{step.reps ? ` × ${step.reps}` : ''}
          </span>
          <span className="text-xs flex gap-3" style={{ color: 'var(--text-muted)' }}>
            {step.km && <span>{step.reps ? `${step.km}km each` : `${step.km}km`}</span>}
            {step.pace && <span>{step.pace}</span>}
          </span>
        </div>
        {step.notes && <p className="text-sm" style={{ color: 'var(--text)' }}>{step.notes}</p>}
        {step.rest_seconds && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Recovery: {step.rest_seconds}s {step.rest_type ?? ''}
          </p>
        )}
        {step.segments?.map((seg, i) => (
          <p key={i} className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {seg.km}km @ {seg.pace}{seg.notes ? ` — ${seg.notes}` : ''}
          </p>
        ))}
      </div>
    </div>
  )
}

export default async function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabase
    .from('workouts').select('*').eq('id', id).single()

  if (error || !data) notFound()

  const workout = data as Workout
  const colour = TYPE_COLOURS[workout.type] ?? '#A3A3A3'
  const dateLabel = workout.scheduled_date
    ? format(parseISO(workout.scheduled_date), 'EEEE, d MMMM yyyy') : ''

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      <Link href="/" className="flex items-center gap-1.5 text-sm mb-5"
        style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft size={16} /> Back to plan
      </Link>

      <div className="rounded-2xl px-5 py-5 mb-4"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderLeft: `4px solid ${colour}`,
        }}>
        <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: colour }}>
          {workout.type}
        </p>
        <h1 className="text-xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text)' }}>
          {workout.name}
        </h1>
        <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
          {dateLabel} · Week {workout.week_number}
        </p>
        <p className="text-sm" style={{ color: 'var(--text)' }}>{workout.description}</p>

        <div className="flex items-center gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          {[
            { label: 'Distance', value: `${workout.distance_km} km` },
            { label: 'Pace target', value: workout.pace_min_seconds ? `${Math.floor(workout.pace_min_seconds/60)}:${String(workout.pace_min_seconds%60).padStart(2,'0')}/km` : '—' },
            { label: 'HR zone', value: workout.hr_zone },
            { label: 'Primary', value: workout.primary_metric, accent: true },
          ].map(stat => (
            <div key={stat.label}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
              <p className="font-extrabold text-base"
                style={{ letterSpacing: '-0.04em', color: stat.accent ? 'var(--accent)' : 'var(--text)' }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {workout.fuelling_note && (
        <div className="rounded-xl px-4 py-3 flex items-start gap-2 mb-4"
          style={{ backgroundColor: '#431407', border: '1px solid #7C2D12' }}>
          <Flame size={16} className="shrink-0 mt-0.5" style={{ color: '#F97316' }} />
          <p className="text-sm" style={{ color: '#FED7AA' }}>{workout.fuelling_note}</p>
        </div>
      )}

      {(workout.structure?.length ?? 0) > 0 && (
        <div className="rounded-xl px-4 mb-6"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-bold uppercase tracking-wide py-3"
            style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
            Session Structure
          </p>
          {workout.structure.map((step, i) => <StructureStep key={i} step={step} />)}
        </div>
      )}

      <MarkCompleteButton workoutId={workout.id} isComplete={workout.is_complete} />
    </div>
  )
}