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