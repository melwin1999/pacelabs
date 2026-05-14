'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { WizardInput } from '@/lib/types';
import { ChevronRight, ChevronLeft, Sparkles, Loader2 } from 'lucide-react';

const STEPS = [
  'Goal',
  'Race details',
  'Your fitness',
  'Schedule',
  'Template',
  'Aggressiveness',
  'Review & generate',
];

const GOAL_TYPES = [
  { value: 'marathon', label: 'Marathon', emoji: '🏅' },
  { value: 'half', label: 'Half Marathon', emoji: '🥈' },
  { value: '10k', label: '10K', emoji: '🏃' },
  { value: '5k', label: '5K', emoji: '⚡' },
  { value: 'base', label: 'Base Building', emoji: '🧱' },
  { value: 'other', label: 'Other', emoji: '🎯' },
];

const RACE_DISTANCES: Record<string, number> = {
  marathon: 42.195,
  half: 21.0975,
  '10k': 10,
  '5k': 5,
  base: 0,
  other: 0,
};

const BENCHMARK_DISTANCES = [
  { label: '5K', value: 5 },
  { label: '10K', value: 10 },
  { label: 'Half Marathon', value: 21.0975 },
  { label: 'Marathon', value: 42.195 },
  { label: 'Other', value: 0 },
];

const TEMPLATES = [
  {
    value: 'pfitzinger',
    label: 'Pfitzinger',
    badge: 'Advanced',
    badgeColor: '#F87171',
    description:
      'Medium-long runs mid-week, lactate threshold sessions, long runs with marathon-pace segments. High volume and structured. Best for runners comfortable at 60+ km/week who have completed at least one race at distance.',
  },
  {
    value: 'daniels',
    label: 'Daniels (VDOT)',
    badge: 'All levels',
    badgeColor: '#22C55E',
    description:
      'Every workout has an exact pace target derived from your current fitness. Strong threshold and interval work, moderate volume. Great if you like data and structure — the pace targets automatically scale to your fitness level.',
  },
  {
    value: 'hansons',
    label: 'Hansons',
    badge: 'Intermediate',
    badgeColor: '#FB923C',
    description:
      'Cumulative fatigue philosophy. Long runs capped shorter, but you run frequently and rarely fully fresh. Two quality sessions per week. Good for consistent runners who prefer frequent moderate efforts over brutal long runs.',
  },
  {
    value: 'norwegian',
    label: 'Norwegian',
    badge: 'Advanced',
    badgeColor: '#F87171',
    description:
      'High-volume, threshold-heavy. Originally built around double threshold days. Adapts to frequent moderate-threshold work with controlled effort. Not recommended for beginners — assumes a strong aerobic base already in place.',
  },
  {
    value: 'claude',
    label: "Claude's Own",
    badge: 'Recommended',
    badgeColor: '#F97316',
    description:
      "Hybrid approach built from scratch based on your inputs. Borrows from the above methodologies and optimises for your specific situation, fitness level, and schedule. Best if you're newer to structured training or want a plan tailored to you rather than fitted to a textbook.",
  },
];

const AGGRESSIVENESS = [
  {
    value: 'conservative',
    label: 'Conservative',
    description: 'Prioritises consistency and injury prevention. Lower peak volume, more recovery. Best for first-timers or returning from a break.',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Balanced progression. Standard training load with room to adapt. Good for most runners.',
  },
  {
    value: 'aggressive',
    label: 'Aggressive',
    description: 'Higher volume and intensity progression. Pushes closer to your limits. Best if you have a strong base and a specific time goal.',
  },
];

const WEEK_OPTIONS = [8, 12, 16, 20];
const DAYS_OPTIONS = [3, 4, 5, 6];

function parseTimeToSeconds(mmss: string): number {
  const parts = mmss.split(':');
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
  }
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2], 10);
    if (!isNaN(h) && !isNaN(m) && !isNaN(s)) return h * 3600 + m * 60 + s;
  }
  return 0;
}

function formatSeconds(s: number): string {
  if (s <= 0) return '';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const defaultWizard: WizardInput = {
  goal_type: 'marathon',
  race_date: '',
  race_distance_km: 42.195,
  benchmark_distance_km: 10,
  benchmark_time_seconds: 0,
  benchmark_notes: '',
  peak_weekly_km: 40,
  fitness_notes: '',
  total_weeks: 16,
  days_per_week: 5,
  long_run_day: 'sunday',
  schedule_notes: '',
  template: 'claude',
  template_notes: '',
  aggressiveness: 'moderate',
  general_notes: '',
};

export default function NewPlanPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardInput>(defaultWizard);
  const [benchmarkInput, setBenchmarkInput] = useState('');
  const [customBenchmarkKm, setCustomBenchmarkKm] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  function update<K extends keyof WizardInput>(key: K, value: WizardInput[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function canAdvance(): boolean {
    if (step === 0) return !!data.goal_type;
    if (step === 1) return !!data.race_date && data.race_distance_km > 0;
    if (step === 2) return data.benchmark_time_seconds > 0 && data.benchmark_distance_km > 0 && data.peak_weekly_km > 0;
    if (step === 3) return data.total_weeks > 0 && data.days_per_week > 0;
    if (step === 4) return !!data.template;
    if (step === 5) return !!data.aggressiveness;
    return true;
  }

  async function generate() {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/blocks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Generation failed');
      router.push(`/plan/new/preview?id=${json.block_id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setGenerating(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Step {step + 1} of {STEPS.length}
            </span>
            <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
              {STEPS[step]}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: 'var(--border)' }}>
            <div
              className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%`, backgroundColor: 'var(--accent)' }}
            />
          </div>
        </div>

        {/* Step 0 — Goal */}
        {step === 0 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>
              What are you training for?
            </h1>
            <div className="grid grid-cols-2 gap-3">
              {GOAL_TYPES.map((g) => (
                <button
                  key={g.value}
                  onClick={() => {
                    update('goal_type', g.value as WizardInput['goal_type']);
                    update('race_distance_km', RACE_DISTANCES[g.value] ?? 0);
                  }}
                  className="rounded-xl p-4 text-left transition-all"
                  style={{
                    backgroundColor: data.goal_type === g.value ? 'var(--accent)' : 'var(--bg-card)',
                    border: `1.5px solid ${data.goal_type === g.value ? 'var(--accent)' : 'var(--border)'}`,
                    color: data.goal_type === g.value ? '#fff' : 'var(--text)',
                  }}
                >
                  <div className="text-2xl mb-1">{g.emoji}</div>
                  <div className="font-semibold text-sm">{g.label}</div>
                </button>
              ))}
            </div>
            <textarea
              placeholder="Anything else? (optional) — e.g. 'This is my first marathon' or 'I want to go sub-4'"
              value={data.general_notes}
              onChange={(e) => update('general_notes', e.target.value)}
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm resize-none"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>
        )}

        {/* Step 1 — Race details */}
        {step === 1 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>
              Race details
            </h1>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
                RACE DATE
              </label>
              <input
                type="date"
                value={data.race_date}
                onChange={(e) => update('race_date', e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
                RACE DISTANCE (KM)
              </label>
              <input
                type="number"
                step="0.001"
                value={data.race_distance_km || ''}
                onChange={(e) => update('race_distance_km', parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
            </div>
            <textarea
              placeholder="Anything else? (optional) — e.g. 'Hilly course' or 'I want to run it as a time trial'"
              value={data.schedule_notes}
              onChange={(e) => update('schedule_notes', e.target.value)}
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm resize-none"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>
        )}

        {/* Step 2 — Fitness */}
        {step === 2 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>
              Your current fitness
            </h1>
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-muted)' }}>
                MOST RECENT BENCHMARK DISTANCE
              </label>
              <div className="grid grid-cols-3 gap-2">
                {BENCHMARK_DISTANCES.map((d) => (
                  <button
                    key={d.label}
                    onClick={() => {
                      if (d.value > 0) update('benchmark_distance_km', d.value);
                    }}
                    className="rounded-xl py-2 text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: data.benchmark_distance_km === d.value ? 'var(--accent)' : 'var(--bg-card)',
                      border: `1.5px solid ${data.benchmark_distance_km === d.value ? 'var(--accent)' : 'var(--border)'}`,
                      color: data.benchmark_distance_km === d.value ? '#fff' : 'var(--text)',
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {data.benchmark_distance_km === 0 && (
                <input
                  type="number"
                  placeholder="Distance in km"
                  value={customBenchmarkKm}
                  onChange={(e) => {
                    setCustomBenchmarkKm(e.target.value);
                    update('benchmark_distance_km', parseFloat(e.target.value) || 0);
                  }}
                  className="mt-2 w-full rounded-xl px-4 py-3 text-sm"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                />
              )}
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
                YOUR TIME FOR THAT DISTANCE (MM:SS or H:MM:SS)
              </label>
              <input
                type="text"
                placeholder="e.g. 48:30 or 1:45:00"
                value={benchmarkInput}
                onChange={(e) => {
                  setBenchmarkInput(e.target.value);
                  update('benchmark_time_seconds', parseTimeToSeconds(e.target.value));
                }}
                className="w-full rounded-xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
              {data.benchmark_time_seconds > 0 && (
                <p className="text-xs mt-1" style={{ color: 'var(--accent)' }}>
                  Got it: {formatSeconds(data.benchmark_time_seconds)}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
                RECENT PEAK WEEKLY MILEAGE (KM)
              </label>
              <input
                type="number"
                value={data.peak_weekly_km || ''}
                onChange={(e) => update('peak_weekly_km', parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
            </div>
            <textarea
              placeholder="Anything else? (optional) — e.g. 'I've been dealing with shin splints' or 'Just came back from 3 weeks off'"
              value={data.fitness_notes}
              onChange={(e) => update('fitness_notes', e.target.value)}
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm resize-none"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>
        )}

        {/* Step 3 — Schedule */}
        {step === 3 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>
              Your schedule
            </h1>
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-muted)' }}>
                TOTAL WEEKS
              </label>
              <div className="flex gap-2">
                {WEEK_OPTIONS.map((w) => (
                  <button
                    key={w}
                    onClick={() => update('total_weeks', w)}
                    className="flex-1 rounded-xl py-3 text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: data.total_weeks === w ? 'var(--accent)' : 'var(--bg-card)',
                      border: `1.5px solid ${data.total_weeks === w ? 'var(--accent)' : 'var(--border)'}`,
                      color: data.total_weeks === w ? '#fff' : 'var(--text)',
                    }}
                  >
                    {w}w
                  </button>
                ))}
                <button
                  onClick={() => {
                    const val = prompt('Enter number of weeks (e.g. 14)');
                    if (val && !isNaN(parseInt(val))) update('total_weeks', parseInt(val));
                  }}
                  className="flex-1 rounded-xl py-3 text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: ![8,12,16,20].includes(data.total_weeks) ? 'var(--accent)' : 'var(--bg-card)',
                    border: `1.5px solid ${![8,12,16,20].includes(data.total_weeks) ? 'var(--accent)' : 'var(--border)'}`,
                    color: ![8,12,16,20].includes(data.total_weeks) ? '#fff' : 'var(--text)',
                  }}
                >
                  {![8,12,16,20].includes(data.total_weeks) ? `${data.total_weeks}w` : 'Custom'}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-muted)' }}>
                DAYS PER WEEK
              </label>
              <div className="flex gap-2">
                {DAYS_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => update('days_per_week', d)}
                    className="flex-1 rounded-xl py-3 text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: data.days_per_week === d ? 'var(--accent)' : 'var(--bg-card)',
                      border: `1.5px solid ${data.days_per_week === d ? 'var(--accent)' : 'var(--border)'}`,
                      color: data.days_per_week === d ? '#fff' : 'var(--text)',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-muted)' }}>
                PREFERRED LONG RUN DAY
              </label>
              <div className="flex gap-2">
                {(['saturday', 'sunday'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => update('long_run_day', d)}
                    className="flex-1 rounded-xl py-3 text-sm font-semibold capitalize transition-all"
                    style={{
                      backgroundColor: data.long_run_day === d ? 'var(--accent)' : 'var(--bg-card)',
                      border: `1.5px solid ${data.long_run_day === d ? 'var(--accent)' : 'var(--border)'}`,
                      color: data.long_run_day === d ? '#fff' : 'var(--text)',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              placeholder="Anything else? (optional) — e.g. 'I travel for work in week 8' or 'I can only run before 7am on weekdays'"
              value={data.schedule_notes}
              onChange={(e) => update('schedule_notes', e.target.value)}
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm resize-none"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>
        )}

        {/* Step 4 — Template */}
        {step === 4 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>
              Training methodology
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              These shape how Claude structures your plan. Not sure? Pick Claude's Own.
            </p>
            <div className="space-y-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => update('template', t.value as WizardInput['template'])}
                  className="w-full rounded-xl p-4 text-left transition-all"
                  style={{
                    backgroundColor: data.template === t.value ? 'var(--bg-card)' : 'var(--bg-card)',
                    border: `1.5px solid ${data.template === t.value ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{t.label}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: t.badgeColor + '22', color: t.badgeColor }}
                    >
                      {t.badge}
                    </span>
                    {data.template === t.value && (
                      <span className="ml-auto text-xs font-semibold" style={{ color: 'var(--accent)' }}>✓ Selected</span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {t.description}
                  </p>
                </button>
              ))}
            </div>
            <textarea
              placeholder="Anything else? (optional) — e.g. 'I hate track workouts' or 'I prefer effort-based running over pace targets'"
              value={data.template_notes}
              onChange={(e) => update('template_notes', e.target.value)}
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm resize-none"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>
        )}

        {/* Step 5 — Aggressiveness */}
        {step === 5 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>
              Training load
            </h1>
            <div className="space-y-3">
              {AGGRESSIVENESS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => update('aggressiveness', a.value as WizardInput['aggressiveness'])}
                  className="w-full rounded-xl p-4 text-left transition-all"
                  style={{
                    border: `1.5px solid ${data.aggressiveness === a.value ? 'var(--accent)' : 'var(--border)'}`,
                    backgroundColor: 'var(--bg-card)',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{a.label}</span>
                    {data.aggressiveness === a.value && (
                      <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>✓ Selected</span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {a.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 6 — Review */}
        {step === 6 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>
              Review & generate
            </h1>
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              {[
                { label: 'Goal', value: GOAL_TYPES.find(g => g.value === data.goal_type)?.label },
                { label: 'Race date', value: data.race_date || '—' },
                { label: 'Distance', value: `${data.race_distance_km} km` },
                { label: 'Benchmark', value: data.benchmark_time_seconds > 0 ? `${formatSeconds(data.benchmark_time_seconds)} for ${data.benchmark_distance_km} km` : '—' },
                { label: 'Peak mileage', value: `${data.peak_weekly_km} km/week` },
                { label: 'Plan length', value: `${data.total_weeks} weeks` },
                { label: 'Days/week', value: `${data.days_per_week} days` },
                { label: 'Long run day', value: data.long_run_day },
                { label: 'Methodology', value: TEMPLATES.find(t => t.value === data.template)?.label },
                { label: 'Load', value: data.aggressiveness },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                  <span className="font-semibold capitalize" style={{ color: 'var(--text)' }}>{row.value}</span>
                </div>
              ))}
            </div>
            {[data.general_notes, data.fitness_notes, data.schedule_notes, data.template_notes].some(Boolean) && (
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>YOUR NOTES TO CLAUDE</p>
                {data.general_notes && <p className="text-sm mb-1" style={{ color: 'var(--text)' }}>{data.general_notes}</p>}
                {data.fitness_notes && <p className="text-sm mb-1" style={{ color: 'var(--text)' }}>{data.fitness_notes}</p>}
                {data.schedule_notes && <p className="text-sm mb-1" style={{ color: 'var(--text)' }}>{data.schedule_notes}</p>}
                {data.template_notes && <p className="text-sm" style={{ color: 'var(--text)' }}>{data.template_notes}</p>}
              </div>
            )}
            {error && (
              <p className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: '#F871711A', color: '#F87171', border: '1px solid #F8717133' }}>
                {error}
              </p>
            )}
            <button
              onClick={generate}
              disabled={generating}
              className="w-full rounded-xl py-4 font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating your plan…
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate plan
                </>
              )}
            </button>
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              This takes 15–30 seconds. You'll preview the plan before it goes live.
            </p>
          </div>
        )}

        {/* Nav buttons */}
        {step < 6 && (
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="flex-1 rounded-xl py-3 font-semibold flex items-center justify-center gap-2 transition-opacity"
              style={{
                backgroundColor: canAdvance() ? 'var(--accent)' : 'var(--border)',
                color: canAdvance() ? '#fff' : 'var(--text-muted)',
              }}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}