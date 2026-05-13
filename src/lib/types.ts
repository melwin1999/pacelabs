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