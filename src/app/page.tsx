import { supabase } from '@/lib/supabase'
import { Block, Workout } from '@/lib/types'
import RaceHeroCard from '@/components/plan/RaceHeroCard'
import StatsStrip from '@/components/plan/StatsStrip'
import WeekView from '@/components/plan/WeekView'
import CoachNudge from '@/components/plan/CoachNudge'
import QuickQuestions from '@/components/plan/QuickQuestions'
import PushToGarminButton from '@/components/plan/PushToGarminButton'

export const revalidate = 0

export default async function PlanPage({ searchParams }: { searchParams: { week?: string } }) {
  const weekOverride = searchParams.week ? parseInt(searchParams.week) : null

  const { data: block, error } = await supabase
    .from('blocks')
    .select('*')
    .eq('status', 'active')
    .single()

  if (error || !block) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p style={{ color: 'var(--text-muted)' }}>No active training block found.</p>
      </div>
    )
  }

  const typedBlock = block as Block
  const displayWeek = weekOverride ?? typedBlock.current_week

  const { data: allWorkouts } = await supabase
    .from('workouts')
    .select('*')
    .eq('block_id', typedBlock.id)
    .order('scheduled_date', { ascending: true })

  const workouts = (allWorkouts as Workout[]) ?? []
  const weekWorkouts = workouts.filter(w => w.week_number === displayWeek)

  const plannedKm = weekWorkouts.reduce((sum, w) => sum + (w.distance_km ?? 0), 0)
  const doneKm = weekWorkouts
    .filter(w => w.is_complete)
    .reduce((sum, w) => sum + (w.distance_km ?? 0), 0)
  const sessionCount = weekWorkouts.filter(w => w.type !== 'rest').length
  const completedCount = weekWorkouts
    .filter(w => w.is_complete && w.type !== 'rest').length

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <RaceHeroCard block={typedBlock} />
      <StatsStrip
        plannedKm={plannedKm}
        doneKm={doneKm}
        sessionCount={sessionCount}
        completedCount={completedCount}
      />

      {/* Phase 4C will insert the AdaptBanner here */}

      <WeekView
        workouts={weekWorkouts}
        weekNumber={displayWeek}
        blockId={typedBlock.id}
        totalWeeks={typedBlock.total_weeks}
      />
      <CoachNudge />
      <QuickQuestions />
      <PushToGarminButton />
    </div>
  )
}