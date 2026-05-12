export type Block = {
  id: string
  name: string
  type: 'marathon' | 'half' | '10k' | '5k' | 'base' | 'other'
  total_weeks: number
  current_week: number
  race_date: string | null
  race_distance_km: number | null
  est_now_seconds: number | null
  race_proj_seconds: number | null
  status: 'active' | 'archived' | 'completed'
  created_at: string
}

export type WorkoutType =
  | 'easy' | 'long' | 'tempo' | 'threshold' | 'intervals'
  | 'recovery' | 'race' | 'rest' | 'strides' | 'fartlek'
  | 'progression' | 'custom'

export type WorkoutStructureStep = {
  type: 'warmup' | 'cooldown' | 'steady' | 'interval' | 'strides' | 'progression' | 'race' | 'segment'
  km?: number
  pace?: string
  reps?: number
  duration_seconds?: number
  rest_seconds?: number
  rest_type?: string
  notes?: string
  segments?: { km: number; pace: string; notes?: string }[]
}

export type Workout = {
  id: string
  block_id: string
  week_number: number
  day_of_week: number
  scheduled_date: string
  type: WorkoutType
  name: string
  description: string
  distance_km: number
  pace_target: string
  hr_zone: string
  primary_metric: 'pace' | 'hr'
  fuelling_note: string | null
  structure: WorkoutStructureStep[]
  is_complete: boolean
  created_at: string
}