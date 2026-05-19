// src/lib/types.ts

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
  status: 'active' | 'archived' | 'completed' | 'draft';
  phases: Phase[] | null;
  adaptation_aggressiveness: 'conservative' | 'moderate' | 'aggressive';
  start_date?: string | null;
  created_at: string;
};

export type Phase = {
  name: 'Base' | 'Build' | 'Peak' | 'Taper' | string;
  start_week: number;
  end_week: number;
};

export type WorkoutStructureStep = {
  type: 'warmup' | 'interval' | 'cooldown' | 'steady' | 'rest' | 'strides';
  km?: number;
  pace?: string;
  pace_min?: number;
  pace_max?: number;
  reps?: number;
  notes?: string;
  rest_seconds?: number;
  rest_type?: string;
  segments?: Array<{ km: number; pace?: string; notes?: string }>;
};

export type Workout = {
  id: string;
  block_id: string;
  week_number: number;
  day_of_week: number;
  scheduled_date: string;
  type:
    | 'easy'
    | 'long'
    | 'tempo'
    | 'threshold'
    | 'intervals'
    | 'recovery'
    | 'race'
    | 'rest'
    | 'strides'
    | 'fartlek'
    | 'progression'
    | 'custom';
  name: string;
  description: string | null;
  distance_km: number | null;
  pace_min_seconds: number | null;
  pace_max_seconds: number | null;
  hr_zone: string | null;
  primary_metric: 'pace' | 'hr' | null;
  fuelling_note: string | null;
  structure: WorkoutStructureStep[] | null;
  is_complete: boolean;
  skipped: boolean;
  skipped_reason: string | null;
  created_at: string;
};

export type PlanChange = {
  id: string;
  block_id: string;
  workout_id: string | null;
  change_type: string;
  from_date: string | null;
  to_date: string | null;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  source: 'manual_drag' | 'coach_chat' | 'auto_adapt' | 'skip';
  reason: string | null;
  created_at: string;
};

export type ProposedChange = {
  workout_id?: string;
  workout_name?: string;
  change_type: string;
  from_date?: string;
  to_date?: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  reason: string;
};

export type AdaptDraft = {
  id: string;
  block_id: string;
  triggered_by: 'cron' | 'coach_chat' | 'manual';
  status: 'pending' | 'accepted' | 'rejected';
  rationale: string | null;
  proposed_changes: ProposedChange[];
  rejection_reason: string | null;
  created_at: string;
  resolved_at: string | null;
};

// --- Phase 5 additions below ---

export type BRace = {
  id?: string;
  block_id?: string;
  race_date: string;
  race_distance_km: number;
  effort_level: 'full_send' | 'hard' | 'tune_up';
  notes: string;
  created_at?: string;
};

export type UserProfileFact = {
  id: string;
  user_id: string | null;
  category: 'injury' | 'preference' | 'history' | 'goal' | 'other';
  fact: string;
  source_block_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type WizardInput = {
  // Goal
  goal_type: 'marathon' | 'half' | '10k' | '5k' | 'base' | 'other';
  general_notes: string;

  // Race
  race_date: string;
  race_distance_km: number;
  course_type: 'flat' | 'rolling' | 'hilly' | 'mountainous';
  elevation_gain_m?: number;
  race_notes: string;

  // Fitness
  benchmark_distance_km: number;
  benchmark_time_seconds: number;
  current_weekly_km: number;
  current_runs_per_week: number;
  peak_history_note: string;
  fitness_notes: string;

  // Schedule
  total_weeks: number;
  start_date: string;
  days_per_week: number;
  long_run_day: 'saturday' | 'sunday';
  schedule_notes: string;

  // Methodology
  template: 'pfitzinger' | 'daniels' | 'hansons' | 'higdon' | 'norwegian' | 'claude';
  template_notes: string;

  // Aggressiveness
  aggressiveness: 'conservative' | 'moderate' | 'aggressive';
  advanced_load: boolean;
  volume_aggressiveness?: 'conservative' | 'moderate' | 'aggressive';
  quality_aggressiveness?: 'conservative' | 'moderate' | 'aggressive';

  // B-races
  b_races: Array<{
    race_date: string;
    race_distance_km: number;
    effort_level: 'full_send' | 'hard' | 'tune_up';
    notes: string;
  }>;
};

export type PlanSkeletonWeek = {
  week_number: number;
  phase: string;
  cutback: boolean;
  is_b_race_week: boolean;
  is_b_race_taper_week: boolean;
  is_b_race_recovery_week: boolean;
  target_volume_km: number;
  long_run_km: number;
  quality_session_count: number;
  quality_session_types: string[];
  pace_zones: {
    easy_min: number;
    easy_max: number;
    marathon: number;
    threshold: number;
    interval: number;
    repetition: number;
  };
  hr_zones: {
    easy: string;
    long: string;
    threshold: string;
    interval: string;
  };
  notes: string;
};

export type PlanSkeleton = {
  block_meta: {
    name: string;
    total_weeks: number;
    race_date: string;
    race_distance_km: number;
    est_now_seconds: number;
    race_proj_seconds: number;
    vdot_start: number;
    vdot_target: number;
    phases: Phase[];
    why_summary: string;
  };
  weeks: PlanSkeletonWeek[];
};