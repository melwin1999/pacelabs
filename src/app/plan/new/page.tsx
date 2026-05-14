'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { WizardInput } from '@/lib/types';
import { ChevronRight, ChevronLeft, Sparkles, Loader2, Plus, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'pacelabs_wizard_v2';

const STEPS = ['Goal', 'Race details', 'Your fitness', 'Schedule', 'Template', 'Aggressiveness', 'B-Races', 'Review & generate'];

const GOAL_TYPES = [
  { value: 'marathon', label: 'Marathon' },
  { value: 'half', label: 'Half Marathon' },
  { value: '10k', label: '10K' },
  { value: '5k', label: '5K' },
  { value: 'base', label: 'Base Building' },
  { value: 'other', label: 'Other' },
];

const RACE_DISTANCES: Record<string, number> = {
  marathon: 42.195, half: 21.0975, '10k': 10, '5k': 5, base: 0, other: 0,
};

const BENCHMARK_DISTANCES = [
  { label: '5K', value: 5 },
  { label: '10K', value: 10 },
  { label: 'Half Marathon', value: 21.0975 },
  { label: 'Marathon', value: 42.195 },
  { label: 'Other', value: 0 },
];

const TEMPLATES = [
  { value: 'claude', label: "Claude's Own", badge: 'Recommended', badgeColor: '#F97316', description: "Hybrid approach built from scratch based on your inputs. Borrows from published methodologies and optimises for your specific situation, fitness level, and schedule." },
  { value: 'daniels', label: 'Daniels (VDOT)', badge: 'All levels', badgeColor: '#22C55E', description: 'Every workout has an exact pace target derived from your current fitness. Strong threshold and interval work, moderate volume. Great if you like data and structure.' },
  { value: 'pfitzinger', label: 'Pfitzinger', badge: 'Advanced', badgeColor: '#F87171', description: 'Medium-long runs mid-week, lactate threshold sessions, long runs with marathon-pace segments. High volume. Best for runners at 60+ km/week.' },
  { value: 'hansons', label: 'Hansons', badge: 'Intermediate', badgeColor: '#FB923C', description: 'Cumulative fatigue philosophy. Long runs capped shorter but you run frequently. Two quality sessions per week.' },
  { value: 'higdon', label: 'Hal Higdon', badge: 'Beginner-friendly', badgeColor: '#22C55E', description: 'Long runs are the centrepiece, almost everything else is easy. Built around consistency and finishing feeling good.' },
  { value: 'norwegian', label: 'Norwegian', badge: 'Advanced', badgeColor: '#F87171', description: 'High-volume, threshold-heavy. Double threshold days. Not recommended for beginners — assumes a strong aerobic base.' },
];

const MIN_DAYS: Record<string, number> = {
  pfitzinger: 5, norwegian: 5, daniels: 4, hansons: 5, higdon: 3, claude: 3,
};

const AGGRESSIVENESS = [
  { value: 'conservative', label: 'Conservative', description: 'Prioritises consistency and injury prevention. Lower peak volume, more recovery.' },
  { value: 'moderate', label: 'Moderate', description: 'Balanced progression. Standard training load with room to adapt. Good for most runners.' },
  { value: 'aggressive', label: 'Aggressive', description: 'Higher volume and intensity progression. Pushes closer to your limits. Best with a strong base.' },
];

const QUICK_WEEKS = [12, 16, 20, 24];
const DAYS_OPTIONS = [3, 4, 5, 6, 7];

function parseTimeToSeconds(val: string): number {
  const parts = val.split(':');
  if (parts.length === 3) { const [h, m, s] = parts.map(Number); if (!isNaN(h) && !isNaN(m) && !isNaN(s)) return h * 3600 + m * 60 + s; }
  if (parts.length === 2) { const [m, s] = parts.map(Number); if (!isNaN(m) && !isNaN(s)) return m * 60 + s; }
  return 0;
}

function formatSeconds(s: number): string {
  if (s <= 0) return '';
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function addWeeks(dateStr: string, weeks: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split('T')[0];
}

function weeksBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const days = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
  return Math.max(6, Math.min(24, Math.floor(days / 7)));
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const defaultWizard: WizardInput = {
  goal_type: 'marathon', general_notes: '', race_date: '', race_distance_km: 42.195,
  course_type: 'flat', elevation_gain_m: undefined, race_notes: '',
  benchmark_distance_km: 10, benchmark_time_seconds: 0, current_weekly_km: 40,
  current_runs_per_week: 4, peak_history_note: '', fitness_notes: '',
  total_weeks: 16, start_date: '', days_per_week: 4, long_run_day: 'sunday',
  schedule_notes: '', template: 'claude', template_notes: '', aggressiveness: 'moderate',
  advanced_load: false, volume_aggressiveness: undefined, quality_aggressiveness: undefined, b_races: [],
};

export default function NewPlanPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardInput>(defaultWizard);
  const [benchmarkInput, setBenchmarkInput] = useState('');
  const [customBenchmarkKm, setCustomBenchmarkKm] = useState('');
  const [customWeeks, setCustomWeeks] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [methodologyError, setMethodologyError] = useState('');
  // Track which input was last touched: 'weeks' or 'dates'
  const [scheduleMode, setScheduleMode] = useState<'weeks' | 'dates'>('weeks');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { try { setData(JSON.parse(saved)); } catch {} }
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);

  function update<K extends keyof WizardInput>(key: K, value: WizardInput[K]) {
    setData(prev => ({ ...prev, [key]: value }));
  }

  // When weeks change → recompute end date from start date
  function setWeeks(weeks: number) {
    const clamped = Math.max(6, Math.min(24, weeks));
    setScheduleMode('weeks');
    update('total_weeks', clamped);
    if (data.start_date) update('race_date', addWeeks(data.start_date, clamped));
  }

  // When start date changes → recompute weeks from start→race, or push race date
  function setStartDate(val: string) {
    setScheduleMode('dates');
    update('start_date', val);
    if (data.race_date && val) {
      const w = weeksBetween(val, data.race_date);
      update('total_weeks', w);
    } else if (val && data.total_weeks) {
      update('race_date', addWeeks(val, data.total_weeks));
    }
  }

  // When race date changes → recompute weeks
  function setRaceDate(val: string) {
    setScheduleMode('dates');
    update('race_date', val);
    if (data.start_date && val) {
      const w = weeksBetween(data.start_date, val);
      update('total_weeks', w);
    }
  }

  function canAdvance(): boolean {
    if (step === 0) return !!data.goal_type;
    if (step === 1) return !!data.race_date && data.race_distance_km > 0;
    if (step === 2) return data.benchmark_time_seconds > 0 && data.benchmark_distance_km > 0 && data.current_weekly_km > 0;
    if (step === 3) return data.total_weeks >= 6 && !!data.start_date && !!data.race_date && data.days_per_week > 0;
    if (step === 4) {
      const min = MIN_DAYS[data.template];
      if (data.days_per_week < min) { setMethodologyError(`${data.template.charAt(0).toUpperCase() + data.template.slice(1)} requires at least ${min} days/week. Choose a different methodology or increase days per week.`); return false; }
      setMethodologyError(''); return !!data.template;
    }
    if (step === 5) return !!data.aggressiveness;
    return true;
  }

  function next() { if (canAdvance()) setStep(s => s + 1); }
  function back() { setStep(s => s - 1); setMethodologyError(''); }

  async function generate() {
    setGenerating(true); setError('');
    try {
      const res = await fetch('/api/blocks/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Generation failed');
      localStorage.removeItem(STORAGE_KEY);
      router.push(`/plan/new/preview?id=${json.block_id}`);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Something went wrong'); setGenerating(false); }
  }

  const inp = "w-full rounded-xl px-4 py-3 text-sm outline-none";
  const inpStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' };
  const card = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' };

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Step {step + 1} of {STEPS.length}</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{STEPS[step]}</span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: 'var(--border)' }}>
            <div className="h-1.5 rounded-full transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%`, backgroundColor: 'var(--accent)' }} />
          </div>
        </div>

        {/* Step 0 — Goal */}
        {step === 0 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>What are you training for?</h1>
            <div className="grid grid-cols-2 gap-3">
              {GOAL_TYPES.map(g => (
                <button key={g.value} onClick={() => { update('goal_type', g.value as WizardInput['goal_type']); update('race_distance_km', RACE_DISTANCES[g.value] ?? 0); }}
                  className="rounded-xl p-4 text-left transition-all"
                  style={{ backgroundColor: data.goal_type === g.value ? 'var(--accent)' : 'var(--bg-card)', border: `1.5px solid ${data.goal_type === g.value ? 'var(--accent)' : 'var(--border)'}`, color: data.goal_type === g.value ? '#fff' : 'var(--text)' }}>
                  <div className="font-semibold text-sm">{g.label}</div>
                </button>
              ))}
            </div>
            <textarea placeholder="Anything else? (optional) — e.g. 'First marathon' or 'Want to go sub-4'"
              value={data.general_notes} onChange={e => update('general_notes', e.target.value)}
              rows={3} className={inp} style={inpStyle} />
          </div>
        )}

        {/* Step 1 — Race details */}
        {step === 1 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>Race details</h1>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>RACE DATE</label>
              <input type="date" value={data.race_date} onChange={e => setRaceDate(e.target.value)} className={inp} style={inpStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>RACE DISTANCE (KM)</label>
              <input type="number" step="0.001" value={data.race_distance_km || ''} onChange={e => update('race_distance_km', parseFloat(e.target.value) || 0)} className={inp} style={inpStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>COURSE TYPE</label>
              <div className="grid grid-cols-2 gap-2">
                {(['flat', 'rolling', 'hilly', 'mountainous'] as const).map(c => (
                  <button key={c} onClick={() => update('course_type', c)}
                    className="rounded-xl px-3 py-2.5 text-sm font-semibold capitalize transition-all"
                    style={{ backgroundColor: data.course_type === c ? 'var(--accent)' : 'var(--bg-card)', border: `1.5px solid ${data.course_type === c ? 'var(--accent)' : 'var(--border)'}`, color: data.course_type === c ? '#fff' : 'var(--text)' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>ELEVATION GAIN (M, OPTIONAL)</label>
              <input type="number" placeholder="Leave blank to use course type estimate" value={data.elevation_gain_m ?? ''} onChange={e => update('elevation_gain_m', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>RACE NOTES (OPTIONAL)</label>
              <input type="text" placeholder="e.g. point-to-point, altitude, known fast course..." value={data.race_notes} onChange={e => update('race_notes', e.target.value)} className={inp} style={inpStyle} />
            </div>
          </div>
        )}

        {/* Step 2 — Fitness */}
        {step === 2 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>Your current fitness</h1>
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-muted)' }}>RECENT BENCHMARK RACE</label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {BENCHMARK_DISTANCES.map(d => (
                  <button key={d.label} onClick={() => { if (d.value > 0) update('benchmark_distance_km', d.value); setCustomBenchmarkKm(''); }}
                    className="rounded-xl px-2 py-2 text-xs font-semibold transition-all"
                    style={{ backgroundColor: data.benchmark_distance_km === d.value && d.value > 0 ? 'var(--accent)' : 'var(--bg-card)', border: `1.5px solid ${data.benchmark_distance_km === d.value && d.value > 0 ? 'var(--accent)' : 'var(--border)'}`, color: data.benchmark_distance_km === d.value && d.value > 0 ? '#fff' : 'var(--text)' }}>
                    {d.label}
                  </button>
                ))}
              </div>
              <input type="text" placeholder="Custom distance (km)" value={customBenchmarkKm}
                onChange={e => { setCustomBenchmarkKm(e.target.value); const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) update('benchmark_distance_km', v); }}
                className={inp + ' mb-3'} style={inpStyle} />
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>FINISH TIME (MM:SS or H:MM:SS)</label>
              <input type="text" placeholder="e.g. 48:30 or 1:52:00" value={benchmarkInput}
                onChange={e => { setBenchmarkInput(e.target.value); update('benchmark_time_seconds', parseTimeToSeconds(e.target.value)); }}
                className={inp} style={inpStyle} />
              {data.benchmark_time_seconds > 0 && (
                <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--accent)' }}>Parsed: {formatSeconds(data.benchmark_time_seconds)}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>CURRENT WEEKLY KM</label>
                <input type="number" placeholder="4-week avg" value={data.current_weekly_km || ''} onChange={e => update('current_weekly_km', parseFloat(e.target.value) || 0)} className={inp} style={inpStyle} />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>RUNS PER WEEK</label>
                <input type="number" placeholder="avg" value={data.current_runs_per_week || ''} onChange={e => update('current_runs_per_week', parseInt(e.target.value) || 0)} className={inp} style={inpStyle} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>PEAK TRAINING HISTORY (OPTIONAL)</label>
              <input type="text" placeholder="e.g. hit 65km/wk for 8 weeks in summer 2025" value={data.peak_history_note} onChange={e => update('peak_history_note', e.target.value)} className={inp} style={inpStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>FITNESS NOTES (OPTIONAL)</label>
              <textarea placeholder="Injuries, recent illness, anything relevant..." value={data.fitness_notes} onChange={e => update('fitness_notes', e.target.value)} rows={2} className={inp} style={inpStyle} />
            </div>
          </div>
        )}

        {/* Step 3 — Schedule */}
        {step === 3 && (
          <div className="space-y-5">
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>Your schedule</h1>

            {/* Plan length card */}
            <div className="rounded-2xl p-4 space-y-4" style={card}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Plan length</p>

              {/* Quick-select chips */}
              <div>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Quick select</p>
                <div className="flex gap-2 flex-wrap">
                  {QUICK_WEEKS.map(w => (
                    <button key={w} onClick={() => setWeeks(w)}
                      className="rounded-xl px-4 py-2 text-sm font-bold transition-all"
                      style={{ backgroundColor: data.total_weeks === w ? 'var(--accent)' : 'var(--bg)', border: `1.5px solid ${data.total_weeks === w ? 'var(--accent)' : 'var(--border)'}`, color: data.total_weeks === w ? '#fff' : 'var(--text)' }}>
                      {w}w
                    </button>
                  ))}
                  {/* Custom weeks input */}
                  <div className="relative">
                    <input
                      type="number" min={6} max={24}
                      placeholder="Custom"
                      value={customWeeks}
                      onChange={e => {
                        setCustomWeeks(e.target.value);
                        const v = parseInt(e.target.value);
                        if (!isNaN(v) && v >= 6 && v <= 24) setWeeks(v);
                      }}
                      className="rounded-xl px-3 py-2 text-sm font-bold w-24 outline-none"
                      style={{ backgroundColor: 'var(--bg)', border: `1.5px solid ${!QUICK_WEEKS.includes(data.total_weeks) && data.total_weeks > 0 ? 'var(--accent)' : 'var(--border)'}`, color: 'var(--text)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>or set by dates</span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
              </div>

              {/* Date pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>START DATE</label>
                  <input type="date" value={data.start_date} onChange={e => setStartDate(e.target.value)} className={inp} style={inpStyle} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>RACE DATE</label>
                  <input type="date" value={data.race_date} onChange={e => setRaceDate(e.target.value)} className={inp} style={inpStyle} />
                </div>
              </div>

              {/* Live summary */}
              {data.start_date && data.race_date && data.total_weeks >= 6 && (
                <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#F9731611', border: '1px solid #F9731633' }}>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateDisplay(data.start_date)} → {formatDateDisplay(data.race_date)}</p>
                  </div>
                  <p className="text-lg font-extrabold" style={{ color: 'var(--accent)', letterSpacing: '-0.04em' }}>{data.total_weeks}w</p>
                </div>
              )}
              {data.total_weeks > 0 && data.total_weeks < 6 && (
                <p className="text-xs" style={{ color: '#F87171' }}>Minimum plan length is 6 weeks.</p>
              )}
              {data.total_weeks > 24 && (
                <p className="text-xs" style={{ color: '#F87171' }}>Maximum plan length is 24 weeks.</p>
              )}
            </div>

            {/* Days per week */}
            <div className="rounded-2xl p-4 space-y-3" style={card}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Days per week</p>
              <div className="flex gap-2">
                {DAYS_OPTIONS.map(d => (
                  <button key={d} onClick={() => update('days_per_week', d)}
                    className="rounded-xl px-4 py-2.5 text-sm font-bold transition-all flex-1"
                    style={{ backgroundColor: data.days_per_week === d ? 'var(--accent)' : 'var(--bg)', border: `1.5px solid ${data.days_per_week === d ? 'var(--accent)' : 'var(--border)'}`, color: data.days_per_week === d ? '#fff' : 'var(--text)' }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Long run day */}
            <div className="rounded-2xl p-4 space-y-3" style={card}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Long run day</p>
              <div className="grid grid-cols-2 gap-2">
                {(['saturday', 'sunday'] as const).map(d => (
                  <button key={d} onClick={() => update('long_run_day', d)}
                    className="rounded-xl px-4 py-3 text-sm font-bold capitalize transition-all"
                    style={{ backgroundColor: data.long_run_day === d ? 'var(--accent)' : 'var(--bg)', border: `1.5px solid ${data.long_run_day === d ? 'var(--accent)' : 'var(--border)'}`, color: data.long_run_day === d ? '#fff' : 'var(--text)' }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>SCHEDULE NOTES (OPTIONAL)</label>
              <textarea placeholder="Days you can't run, travel, work commitments..." value={data.schedule_notes} onChange={e => update('schedule_notes', e.target.value)} rows={2} className={inp} style={inpStyle} />
            </div>
          </div>
        )}

        {/* Step 4 — Template */}
        {step === 4 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>Training methodology</h1>
            <div className="space-y-3">
              {TEMPLATES.map(t => (
                <button key={t.value} onClick={() => { update('template', t.value as WizardInput['template']); setMethodologyError(''); }}
                  className="w-full rounded-xl p-4 text-left transition-all"
                  style={{ backgroundColor: data.template === t.value ? '#F9731611' : 'var(--bg-card)', border: `1.5px solid ${data.template === t.value ? 'var(--accent)' : 'var(--border)'}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{t.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: t.badgeColor + '22', color: t.badgeColor }}>{t.badge}</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{t.description}</p>
                </button>
              ))}
            </div>
            {methodologyError && <p className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: '#7f1d1d', color: '#fca5a5' }}>{methodologyError}</p>}
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>METHODOLOGY NOTES (OPTIONAL)</label>
              <textarea placeholder="Any specific preferences within this approach..." value={data.template_notes} onChange={e => update('template_notes', e.target.value)} rows={2} className={inp} style={inpStyle} />
            </div>
          </div>
        )}

        {/* Step 5 — Aggressiveness */}
        {step === 5 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>Training load</h1>
            <div className="space-y-3">
              {AGGRESSIVENESS.map(a => (
                <button key={a.value} onClick={() => update('aggressiveness', a.value as WizardInput['aggressiveness'])}
                  className="w-full rounded-xl p-4 text-left transition-all"
                  style={{ backgroundColor: data.aggressiveness === a.value ? '#F9731611' : 'var(--bg-card)', border: `1.5px solid ${data.aggressiveness === a.value ? 'var(--accent)' : 'var(--border)'}` }}>
                  <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>{a.label}</div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.description}</p>
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text)' }}>
              <input type="checkbox" checked={data.advanced_load} onChange={e => update('advanced_load', e.target.checked)} />
              Customise volume and intensity separately
            </label>
            {data.advanced_load && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>VOLUME</label>
                  <select value={data.volume_aggressiveness ?? data.aggressiveness} onChange={e => update('volume_aggressiveness', e.target.value as WizardInput['aggressiveness'])} className={inp} style={inpStyle}>
                    <option value="conservative">Conservative</option>
                    <option value="moderate">Moderate</option>
                    <option value="aggressive">Aggressive</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>INTENSITY</label>
                  <select value={data.quality_aggressiveness ?? data.aggressiveness} onChange={e => update('quality_aggressiveness', e.target.value as WizardInput['aggressiveness'])} className={inp} style={inpStyle}>
                    <option value="conservative">Conservative</option>
                    <option value="moderate">Moderate</option>
                    <option value="aggressive">Aggressive</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 6 — B-Races */}
        {step === 6 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>B-Races</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Optional tune-up races during your block. Claude will adjust surrounding weeks automatically.</p>
            {data.b_races.map((b, i) => (
              <div key={i} className="rounded-xl p-4 space-y-3" style={card}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>B-Race {i + 1}</span>
                  <button onClick={() => update('b_races', data.b_races.filter((_, j) => j !== i))} style={{ color: 'var(--text-muted)' }}><Trash2 size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>DATE</label>
                    <input type="date" value={b.race_date} onChange={e => { const r = [...data.b_races]; r[i] = { ...r[i], race_date: e.target.value }; update('b_races', r); }} className={inp} style={inpStyle} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>DISTANCE (KM)</label>
                    <input type="number" value={b.race_distance_km} onChange={e => { const r = [...data.b_races]; r[i] = { ...r[i], race_distance_km: Number(e.target.value) }; update('b_races', r); }} className={inp} style={inpStyle} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>EFFORT LEVEL</label>
                  <div className="space-y-1.5">
                    {([['tune_up', 'Tune-up', 'Replaces a quality session, no surrounding changes'], ['hard', 'Hard effort', 'Slight taper before, 2–3 easy days after'], ['full_send', 'Full send', 'Mini taper before, full recovery week after']] as const).map(([val, label, desc]) => (
                      <button key={val} onClick={() => { const r = [...data.b_races]; r[i] = { ...r[i], effort_level: val }; update('b_races', r); }}
                        className="w-full rounded-lg px-3 py-2.5 text-left text-xs transition-all"
                        style={{ backgroundColor: b.effort_level === val ? '#F9731611' : 'var(--bg)', border: `1px solid ${b.effort_level === val ? 'var(--accent)' : 'var(--border)'}`, color: 'var(--text)' }}>
                        <span className="font-semibold">{label}</span><span style={{ color: 'var(--text-muted)' }}> — {desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>NOTES (OPTIONAL)</label>
                  <input type="text" placeholder="e.g. local 10K, just for fun" value={b.notes} onChange={e => { const r = [...data.b_races]; r[i] = { ...r[i], notes: e.target.value }; update('b_races', r); }} className={inp} style={inpStyle} />
                </div>
              </div>
            ))}
            <button onClick={() => update('b_races', [...data.b_races, { race_date: '', race_distance_km: 10, effort_level: 'tune_up', notes: '' }])}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold w-full justify-center transition-all"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
              <Plus size={16} /> Add B-race
            </button>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No B-races? Just tap Next.</p>
          </div>
        )}

        {/* Step 7 — Review */}
        {step === 7 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>Ready to generate</h1>
            <div className="rounded-xl p-4 space-y-2.5" style={card}>
              {[
                { label: 'Goal', value: data.goal_type },
                { label: 'Race date', value: data.race_date ? formatDateDisplay(data.race_date) : '—' },
                { label: 'Start date', value: data.start_date ? formatDateDisplay(data.start_date) : '—' },
                { label: 'Plan length', value: `${data.total_weeks} weeks` },
                { label: 'Course', value: data.course_type },
                { label: 'Benchmark', value: data.benchmark_time_seconds > 0 ? `${formatSeconds(data.benchmark_time_seconds)} for ${data.benchmark_distance_km}km` : '—' },
                { label: 'Weekly km', value: `${data.current_weekly_km}km avg` },
                { label: 'Days/week', value: String(data.days_per_week) },
                { label: 'Long run', value: data.long_run_day },
                { label: 'Methodology', value: data.template },
                { label: 'Aggressiveness', value: data.aggressiveness },
                { label: 'B-races', value: data.b_races.length > 0 ? `${data.b_races.length} race(s)` : 'None' },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                  <span className="font-semibold capitalize" style={{ color: 'var(--text)' }}>{row.value}</span>
                </div>
              ))}
            </div>
            {error && <p className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: '#7f1d1d', color: '#fca5a5' }}>{error}</p>}
            <button onClick={generate} disabled={generating}
              className="w-full rounded-xl py-4 font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ backgroundColor: generating ? 'var(--border)' : 'var(--accent)', color: '#fff' }}>
              {generating
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating your plan… (up to 60s)</>
                : <><Sparkles className="w-5 h-5" /> Generate Plan</>}
            </button>
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>Claude will generate all workouts. This takes ~30–60 seconds.</p>
          </div>
        )}

        {/* Nav */}
        <div className="flex gap-3 mt-8 pb-8">
          {step > 0 && (
            <button onClick={back} className="flex items-center gap-1 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          {step < STEPS.length - 1 && (
            <button onClick={next} className="flex-1 flex items-center justify-center gap-1 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </AppShell>
  );
}