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
  start_week