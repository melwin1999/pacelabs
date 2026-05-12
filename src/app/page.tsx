import { supabase } from '@/lib/supabase'
import { Block, Workout } from '@/lib/types'
import RaceHeroCard from '@/components/plan/RaceHeroCard'
import StatsStrip from '@/components/plan/StatsStrip'
import WeekView from '@/components/plan/WeekView'
import CoachNudge from '@/components/plan/CoachNudge'
import QuickQuestions from '@/components/plan/QuickQuestions'
import PushToGarminButton from '@/components/plan/PushToGarminButton'

export const revalidate = 0

export default async function PlanPage() {
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

  const { data: allWorkouts } = await supabase
    .from('workouts')
    .select('*')
    .eq('block_id', typedBlock.id)
    .order('scheduled_date', { ascending: true })

  const workouts = (allWorkouts as Workout[]) ?? []
  const currentWeek = workouts.filter(w => w.week_number === typedBlock.current_week)

  const plannedKm = currentWeek.reduce((sum, w) => sum + (w.distance_km ?? 0), 0)
  const doneKm = currentWeek.filter(w => w.is_complete).reduce((sum, w) => sum + (w.distance_km ?? 0), 0)
  const sessionCount = currentWeek.filter(w => w.type !== 'rest').length
  const completedCount = currentWeek.filter(w => w.is_complete && w.type !== 'rest').length

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <RaceHeroCard block={typedBlock} />
      <StatsStrip plannedKm={plannedKm} doneKm={doneKm} sessionCount={sessionCount} completedCount={completedCount} />
      <WeekView workouts={currentWeek} weekNumber={typedBlock.current_week} />
      <CoachNudge />
      <QuickQuestions />
      <PushToGarminButton />
    </div>
  )
}