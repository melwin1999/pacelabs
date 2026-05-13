export type Block = {
  id: string;
  name: string;
  type: 'marathon' | 'half' | '10k' | '5k' | 'base' | 'other';
  goal?: string | null;
  total_weeks: number;
  current_week: number;
  race_date: string | null;
  race_distance_km: number | null;
  est_now_seconds: number | null;
  race_proj_seconds: number | null;
  status: 'active' | 'archived' | 'completed';
  phases: Phase[] | null;
  adaptation_aggressiveness: 'conservative' | 'moderate' | 'aggressive';
  created_at: string;
};

export type Phase = {
  name: 'Base' | 'Build' | 'Peak' | 'Taper' | string;
  start_week: number;
  end_week: number;
};

export type Workout = {
  id: string;
  block_id: string;
  week_number: number;
  day_of_week: number;
  scheduled_date: string;
  type: 'easy' | 'long' | 'tempo' | 'threshold' | 'intervals' |
        'recovery' | 'race' | 'rest' | 'strides' | 'fartlek' |
        'progression' | 'custom';
  name: string;
  description: string;
  distance_km: number;
  pace_target: string | null;
  pace_min_seconds: number | null;
  pace_max_seconds: number | null;
  hr_zone: string;
  primary_metric: 'pace' | 'hr';
  fuelling_note: string | null;
  structure: any;
  is_complete: boolean;
  skipped: boolean;
  skipped_reason: string | null;
  created_at: string;
};

export type PlanChange = {
  id: string;
  block_id: string;
  workout_id: string | null;
  change_type: 'moved' | 'swapped' | 'skipped' | 'edited' | 'added' | 'removed';
  from_date: string | null;
  to_date: string | null;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  source: 'manual_drag' | 'coach_chat' | 'auto_adapt' | 'skip';
  reason: string | null;
  created_at: string;
};

export type WorkoutStructureStep = {
  type: 'warmup' | 'interval' | 'cooldown' | 'steady' | 'rest';
  km?: number;
  pace?: string;
  pace_min?: number;
  pace_max?: number;
  reps?: number;
  notes?: string;
  rest_seconds?: number;
  rest_type?: string;
  segments?: Array<{
    km: number;
    pace?: string;
    notes?: string;
  }>;
};