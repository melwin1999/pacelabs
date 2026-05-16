'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { WizardInput } from '@/lib/types';
import { ChevronRight, ChevronLeft, Sparkles, Loader2, Plus, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'pacelabs_wizard_v2';
const STEPS = ['Goal', 'Race details', 'Your fitness', 'Schedule', 'Template', 'Training load', 'B-Races', 'Review & generate'];

const GOAL_TYPES = [
  { value: 'marathon', label: 'Marathon', emoji: '🏃' },
  { value: 'half', label: 'Half Marathon', emoji: '🏅' },
  { value: '10k', label: '10K', emoji: '⚡' },
  { value: '5k', label: '5K', emoji: '🔥' },
  { value: 'base', label: 'Base Building', emoji: '🏗️' },
  { value: 'other', label: 'Other', emoji: '🎯' },
];

const RACE_DISTANCES: Record<string, number> = {
  marathon: 42.2, half: 21.1, '10k': 10, '5k': 5, base: 0, other: 0,
};

const BENCHMARK_DISTANCES = [
  { label: '5K', value: 5 },
  { label: '10K', value: 10 },
  { label: 'Half Marathon', value: 21.1 },
  { label: 'Marathon', value: 42.2 },
  { label: 'Other', value: 0 },
];

const TEMPLATES = [
  { value: 'claude', label: "Claude's Own", badge: 'Fully Customised', badgeColor: '#F97316', description: "Hybrid approach built from scratch based on your inputs. Borrows from published methodologies and optimises for your specific situation, fitness level, and schedule." },
  { value: 'higdon', label: 'Hal Higdon', badge: 'Beginner-friendly', badgeColor: '#22C55E', description: 'Long runs are the centrepiece, almost everything else is easy. Built around consistency and finishing feeling good. The most accessible marathon methodology.' },
  { value: 'hansons', label: 'Hansons', badge: 'Intermediate', badgeColor: '#FB923C', description: 'Cumulative fatigue philosophy. Long runs capped at 26km, but you run 6 days/week and rarely feel fresh. Two quality sessions per week. More demanding than it looks.' },
  { value: 'daniels', label: 'Daniels 2Q', badge: 'Intermediate–Advanced', badgeColor: '#22C55E', description: 'Two structured Quality sessions per week (Q1 = long quality run, Q2 = threshold/intervals). Everything else is strictly easy filler. VDOT-based paces scale to your fitness.' },
  { value: 'norwegian', label: 'Norwegian', badge: 'Advanced', badgeColor: '#F87171', description: 'High-volume, double-threshold model. Two threshold sessions at lactate threshold per week. High easy volume, HR-controlled. Assumes a very strong aerobic base.' },
  { value: 'pfitzinger', label: 'Pfitzinger', badge: 'Advanced', badgeColor: '#F87171', description: 'Medium-long midweek runs, lactate threshold sessions, long runs with marathon-pace segments. High volume. Pfitz himself says you should be within 5-10mi of peak before starting.' },
];

const TIER_LABELS: Record<string, Record<string, string>> = {
  higdon:     { conservative: 'Novice Supreme', moderate: 'Novice 1', aggressive: 'Intermediate 1' },
  daniels:    { conservative: 'Novice (run/walk)', moderate: '2Q 18/55', aggressive: '2Q 18/70+' },
  pfitzinger: { conservative: 'Pfitz 18/55', moderate: 'Pfitz 18/70', aggressive: 'Pfitz 18/85+' },
  hansons:    { conservative: 'Just Finish', moderate: 'Beginner', aggressive: 'Advanced' },
  norwegian:  { conservative: 'Low volume', moderate: 'Mid volume', aggressive: 'High volume' },
  claude:     { conservative: 'Gentle', moderate: 'Balanced', aggressive: 'Strong' },
};

const TIER_PEAKS: Record<string, Record<string, string>> = {
  higdon:     { conservative: '~45km/wk peak', moderate: '~55km/wk peak', aggressive: '~65km/wk peak' },
  daniels:    { conservative: '~55km/wk peak', moderate: '~70km/wk peak', aggressive: '~90km/wk peak' },
  pfitzinger: { conservative: '~88km/wk peak · needs 40km+ base', moderate: '~112km/wk peak · needs 50km+ base', aggressive: '~136km/wk peak · needs 65km+ base' },
  hansons:    { conservative: '~65km/wk peak', moderate: '~80km/wk peak · needs 20km+ base', aggressive: '~95km/wk peak · needs 40km+ base' },
  norwegian:  { conservative: '~75km/wk peak · needs 35km+ base', moderate: '~95km/wk peak · needs 45km+ base', aggressive: '~120km/wk peak · needs 60km+ base' },
  claude:     { conservative: '~55km/wk peak', moderate: '~75km/wk peak', aggressive: '~95km/wk peak' },
};

const AGGRESSIVENESS = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'aggressive', label: 'Aggressive' },
];

const MIN_DAYS: Record<string, number> = {
  pfitzinger: 5, norwegian: 5, daniels: 4, hansons: 5, higdon: 3, claude: 3,
};

const QUICK_WEEKS = [12, 16, 20, 24];
const DAYS_OPTIONS = [3, 4, 5, 6, 7];

function parseRawTimeInput(raw: string): { display: string; seconds: number } {
  const digits = raw.replace(/\D/g, '').slice(0, 6);
  if (!digits) return { display: '', seconds: 0 };
  const padded = digits.padStart(6, '0');
  const h = parseInt(padded.slice(0, 2), 10);
  const m = parseInt(padded.slice(2, 4), 10);
  const s = parseInt(padded.slice(4, 6), 10);
  if (m > 59 || s > 59) return { display: digits, seconds: 0 };
  const totalSeconds = h * 3600 + m * 60 + s;
  const display = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
  return { display, seconds: totalSeconds };
}

function formatSecondsDisplay(s: number): string {
  if (s <= 0) return '';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
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
  goal_type: 'marathon', general_notes: '', race_date: '', race_distance_km: 42.2,
  course_type: 'flat', elevation_gain_m: undefined, race_notes: '',
  benchmark_distance_km: 10, benchmark_time_seconds: 0, current_weekly_km: 40,
  current_runs_per_week: 4, peak_history_note: '', fitness_notes: '',
  total_weeks: 16, start_date: '', days_per_week: 4, long_run_day: 'sunday',
  schedule_notes: '', template: 'claude', template_notes: '', aggressiveness: 'moderate',
  advanced_load: false, volume_aggressiveness: undefined, quality_aggressiveness: undefined,
  b_races: [],
};

// Shared inline style helpers
const inp: React.CSSProperties = {
  width: '100%', borderRadius: '12px', padding: '13px 16px',
  fontSize: '14px', outline: 'none', background: '#111',
  border: '1px solid #1f1f1f', color: '#f5f5f5', fontFamily: 'inherit',
};
const card: React.CSSProperties = { background: '#111', border: '1px solid #1f1f1f', borderRadius: '16px', padding: '20px' };
const label: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '8px' };
const sectionGap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '24px' };

function selBtn(active: boolean, color = '#F97316'): React.CSSProperties {
  return {
    borderRadius: '12px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
    transition: 'all 0.15s', fontSize: '14px', fontWeight: 600,
    background: active ? `${color}18` : '#0d0d0d',
    border: `1.5px solid ${active ? color : '#1f1f1f'}`,
    color: active ? color : '#f5f5f5',
  };
}

export default function NewPlanPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardInput>(defaultWizard);
  const [benchmarkRaw, setBenchmarkRaw] = useState('');
  const [benchmarkDisplay, setBenchmarkDisplay] = useState('');
  const [customBenchmarkKm, setCustomBenchmarkKm] = useState('');
  const [customWeeks, setCustomWeeks] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [methodologyError, setMethodologyError] = useState('');
  const [progress, setProgress] = useState<{ message: string; percent: number; weeksComplete?: number; totalWeeks?: number } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { try { setData(JSON.parse(saved)); } catch {} }
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);

  function update<K extends keyof WizardInput>(key: K, value: WizardInput[K]) {
    setData(prev => ({ ...prev, [key]: value }));
  }

  function setWeeks(weeks: number) {
    const clamped = Math.max(6, Math.min(24, weeks));
    update('total_weeks', clamped);
    if (data.race_date) {
      const race = new Date(data.race_date);
      race.setDate(race.getDate() - clamped * 7);
      update('start_date', race.toISOString().split('T')[0]);
    }
  }

  function setStartDate(val: string) {
    update('start_date', val);
    if (data.race_date && val) update('total_weeks', weeksBetween(val, data.race_date));
  }

  function setRaceDate(val: string) {
    update('race_date', val);
    if (data.start_date && val) update('total_weeks', weeksBetween(data.start_date, val));
  }

  function getHardBlock(template: string, aggressiveness: string, currentKm: number): string | null {
    const blocks: Record<string, Record<string, { km: number; canOverride: boolean }>> = {
      higdon:     { aggressive: { km: 15, canOverride: true } },
      daniels:    { moderate: { km: 25, canOverride: true }, aggressive: { km: 45, canOverride: true } },
      pfitzinger: { conservative: { km: 40, canOverride: false }, moderate: { km: 50, canOverride: false }, aggressive: { km: 65, canOverride: false } },
      hansons:    { moderate: { km: 20, canOverride: true }, aggressive: { km: 40, canOverride: false } },
      norwegian:  { conservative: { km: 35, canOverride: false }, moderate: { km: 45, canOverride: false }, aggressive: { km: 60, canOverride: false } },
    };
    const b = blocks[template]?.[aggressiveness];
    if (!b || currentKm >= b.km) return null;
    const names: Record<string, string> = { pfitzinger: 'Pfitzinger', norwegian: 'Norwegian', daniels: 'Daniels 2Q', hansons: 'Hansons', higdon: 'Higdon', claude: "Claude's Own" };
    const tierLabels: Record<string, Record<string, string>> = {
      higdon: { aggressive: 'Intermediate 1' },
      daniels: { moderate: '2Q 18/55', aggressive: '2Q 18/70+' },
      pfitzinger: { conservative: 'Pfitz 18/55', moderate: 'Pfitz 18/70', aggressive: 'Pfitz 18/85+' },
      hansons: { moderate: 'Beginner', aggressive: 'Advanced' },
      norwegian: { conservative: 'Low', moderate: 'Mid', aggressive: 'High' },
    };
    const tier = tierLabels[template]?.[aggressiveness] ?? aggressiveness;
    return `${names[template]} ${tier} requires at least ${b.km}km/week base. You're at ${currentKm}km/week. ${b.canOverride ? 'Try a more conservative level instead.' : 'Build your base first or choose a different methodology.'}`;
  }

  function canAdvance(): boolean {
    if (step === 0) return !!data.goal_type;
    if (step === 1) return !!data.race_date && data.race_distance_km > 0;
    if (step === 2) return data.benchmark_time_seconds > 0 && data.benchmark_distance_km > 0 && data.current_weekly_km > 0;
    if (step === 3) return data.total_weeks >= 6 && data.total_weeks <= 24 && data.days_per_week > 0;
    if (step === 4) {
      const min = MIN_DAYS[data.template];
      if (data.days_per_week < min) { setMethodologyError(`${data.template.charAt(0).toUpperCase() + data.template.slice(1)} requires at least ${min} days/week.`); return false; }
      setMethodologyError(''); return !!data.template;
    }
    if (step === 5) {
      const block = getHardBlock(data.template, data.aggressiveness, data.current_weekly_km);
      if (block) { setMethodologyError(block); return false; }
      setMethodologyError(''); return !!data.aggressiveness;
    }
    return true;
  }

  function next() { if (canAdvance()) setStep(s => s + 1); }
  function back() { setStep(s => s - 1); setMethodologyError(''); }

  async function generate() {
    setGenerating(true); setError(''); setProgress(null);
    try {
      const res = await fetch('/api/blocks/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok || !res.body) throw new Error('Request failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === 'progress') setProgress(msg);
            if (msg.type === 'error') throw new Error(msg.error);
            if (msg.type === 'complete') { localStorage.removeItem(STORAGE_KEY); router.push(`/plan/new/preview?id=${msg.block_id}`); return; }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== 'Unexpected token') throw parseErr;
          }
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setGenerating(false); setProgress(null);
    }
  }

  const tierLabel = TIER_LABELS[data.template]?.[data.aggressiveness] ?? '';
  const tierPeak = TIER_PEAKS[data.template]?.[data.aggressiveness] ?? '';

  return (
    <AppShell>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 32px 80px' }}>

        {/* Progress bar */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#71717a' }}>Step {step + 1} of {STEPS.length}</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#F97316' }}>{STEPS[step]}</span>
          </div>
          <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: '#1a1a1a' }}>
            <div style={{ height: '100%', borderRadius: '3px', background: '#F97316', width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Step 0 — Goal */}
        {step === 0 && (
          <div style={sectionGap}>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#f5f5f5', letterSpacing: '-0.5px' }}>What are you training for?</h1>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {GOAL_TYPES.map(g => (
                <button key={g.value}
                  onClick={() => { update('goal_type', g.value as WizardInput['goal_type']); update('race_distance_km', RACE_DISTANCES[g.value] ?? 0); }}
                  style={{ ...selBtn(data.goal_type === g.value), padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '28px' }}>{g.emoji}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{g.label}</span>
                </button>
              ))}
            </div>
            <div>
              <label style={label}>Notes (optional)</label>
              <textarea placeholder="e.g. 'First marathon' or 'Want to go sub-4'"
                value={data.general_notes} onChange={e => update('general_notes', e.target.value)}
                rows={3} style={{ ...inp, resize: 'none' }} />
            </div>
          </div>
        )}

        {/* Step 1 — Race details */}
        {step === 1 && (
          <div style={sectionGap}>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#f5f5f5', letterSpacing: '-0.5px' }}>Race details</h1>
            <div>
              <label style={label}>Race date</label>
              <input type="date" value={data.race_date} onChange={e => setRaceDate(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={label}>Race distance (km)</label>
              <input type="number" step="0.1" value={data.race_distance_km || ''} onChange={e => update('race_distance_km', parseFloat(e.target.value) || 0)} style={inp} />
            </div>
            <div>
              <label style={label}>Course type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {(['flat', 'rolling', 'hilly', 'mountainous'] as const).map(c => (
                  <button key={c} onClick={() => update('course_type', c)} style={{ ...selBtn(data.course_type === c), textTransform: 'capitalize', textAlign: 'center' }}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={label}>Elevation gain (m, optional)</label>
              <input type="number" placeholder="Leave blank to use course type estimate" value={data.elevation_gain_m ?? ''} onChange={e => update('elevation_gain_m', e.target.value ? Number(e.target.value) : undefined)} style={inp} />
            </div>
            <div>
              <label style={label}>Race notes (optional)</label>
              <input type="text" placeholder="e.g. point-to-point, altitude, known fast course..." value={data.race_notes} onChange={e => update('race_notes', e.target.value)} style={inp} />
            </div>
          </div>
        )}

        {/* Step 2 — Fitness */}
        {step === 2 && (
          <div style={sectionGap}>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#f5f5f5', letterSpacing: '-0.5px' }}>Your current fitness</h1>
            <div>
              <label style={label}>Recent benchmark race distance</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                {BENCHMARK_DISTANCES.map(d => (
                  <button key={d.label} onClick={() => { if (d.value > 0) update('benchmark_distance_km', d.value); setCustomBenchmarkKm(''); }}
                    style={{ ...selBtn(data.benchmark_distance_km === d.value && d.value > 0), textAlign: 'center', padding: '12px 8px', fontSize: '13px' }}>
                    {d.label}
                  </button>
                ))}
              </div>
              <input type="text" placeholder="Custom distance (km)" value={customBenchmarkKm}
                onChange={e => { setCustomBenchmarkKm(e.target.value); const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) update('benchmark_distance_km', v); }}
                style={{ ...inp, marginBottom: '16px' }} />
              <label style={label}>Finish time — type digits (e.g. 24500 = 2:45:00)</label>
              <input type="text" inputMode="numeric" placeholder="e.g. 4530 for 45:30, 14500 for 1:45:00"
                value={benchmarkDisplay}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setBenchmarkRaw(raw);
                  const { display, seconds } = parseRawTimeInput(raw);
                  setBenchmarkDisplay(display || raw);
                  if (seconds > 0) update('benchmark_time_seconds', seconds);
                }}
                onBlur={() => { if (data.benchmark_time_seconds > 0) setBenchmarkDisplay(formatSecondsDisplay(data.benchmark_time_seconds)); }}
                style={inp} />
              {data.benchmark_time_seconds > 0 && (
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#F97316', marginTop: '8px' }}>
                  ✓ {formatSecondsDisplay(data.benchmark_time_seconds)} for {data.benchmark_distance_km}km
                </p>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={label}>Current weekly km</label>
                <input type="number" placeholder="4-week avg" value={data.current_weekly_km || ''} onChange={e => update('current_weekly_km', parseFloat(e.target.value) || 0)} style={inp} />
              </div>
              <div>
                <label style={label}>Runs per week</label>
                <input type="number" placeholder="avg" value={data.current_runs_per_week || ''} onChange={e => update('current_runs_per_week', parseInt(e.target.value) || 0)} style={inp} />
              </div>
            </div>
            <div>
              <label style={label}>Peak training history (optional)</label>
              <input type="text" placeholder="e.g. hit 65km/wk for 8 weeks in summer 2025" value={data.peak_history_note} onChange={e => update('peak_history_note', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={label}>Fitness notes (optional)</label>
              <textarea placeholder="Injuries, recent illness, anything relevant..." value={data.fitness_notes} onChange={e => update('fitness_notes', e.target.value)} rows={2} style={{ ...inp, resize: 'none' }} />
            </div>
          </div>
        )}

        {/* Step 3 — Schedule */}
        {step === 3 && (
          <div style={sectionGap}>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#f5f5f5', letterSpacing: '-0.5px' }}>Your schedule</h1>
            <div style={card}>
              <p style={{ ...label, marginBottom: '16px' }}>Plan length</p>
              <p style={{ fontSize: '12px', color: '#52525b', marginBottom: '10px' }}>Quick select</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {QUICK_WEEKS.map(w => (
                  <button key={w} onClick={() => setWeeks(w)}
                    style={{ ...selBtn(data.total_weeks === w), padding: '10px 20px', fontSize: '14px', fontWeight: 700 }}>
                    {w}w
                  </button>
                ))}
                <input type="number" min={6} max={24} placeholder="Custom" value={customWeeks}
                  onChange={e => { setCustomWeeks(e.target.value); const v = parseInt(e.target.value); if (!isNaN(v) && v >= 6 && v <= 24) setWeeks(v); }}
                  style={{ ...inp, width: '100px', padding: '10px 14px' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ flex: 1, height: '1px', background: '#1a1a1a' }} />
                <span style={{ fontSize: '12px', color: '#52525b' }}>or set by dates</span>
                <div style={{ flex: 1, height: '1px', background: '#1a1a1a' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={label}>Start date</label>
                  <input type="date" value={data.start_date} onChange={e => setStartDate(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={label}>Race date</label>
                  <input type="date" value={data.race_date} onChange={e => setRaceDate(e.target.value)} style={inp} />
                </div>
              </div>
              {data.start_date && data.race_date && data.total_weeks >= 6 && (
                <div style={{ marginTop: '14px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#71717a' }}>{formatDateDisplay(data.start_date)} → {formatDateDisplay(data.race_date)}</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#F97316' }}>{data.total_weeks}w</span>
                </div>
              )}
              {data.total_weeks > 0 && data.total_weeks < 6 && <p style={{ fontSize: '13px', color: '#F87171', marginTop: '10px' }}>Minimum 6 weeks.</p>}
            </div>

            <div style={card}>
              <p style={{ ...label, marginBottom: '16px' }}>Days per week</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {DAYS_OPTIONS.map(d => (
                  <button key={d} onClick={() => update('days_per_week', d)}
                    style={{ ...selBtn(data.days_per_week === d), flex: 1, padding: '12px 8px', textAlign: 'center', fontSize: '15px', fontWeight: 700 }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div style={card}>
              <p style={{ ...label, marginBottom: '16px' }}>Long run day</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {(['saturday', 'sunday'] as const).map(d => (
                  <button key={d} onClick={() => update('long_run_day', d)}
                    style={{ ...selBtn(data.long_run_day === d), textTransform: 'capitalize', textAlign: 'center', padding: '14px' }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={label}>Schedule notes (optional)</label>
              <textarea placeholder="Days you can't run, travel, work commitments..." value={data.schedule_notes} onChange={e => update('schedule_notes', e.target.value)} rows={3} style={{ ...inp, resize: 'none' }} />
            </div>
          </div>
        )}

        {/* Step 4 — Template */}
        {step === 4 && (
          <div style={sectionGap}>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#f5f5f5', letterSpacing: '-0.5px' }}>Training methodology</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {TEMPLATES.map(t => (
                <button key={t.value} onClick={() => { update('template', t.value as WizardInput['template']); setMethodologyError(''); }}
                  style={{
                    borderRadius: '14px', padding: '18px 16px', textAlign: 'left', cursor: 'pointer',
                    background: data.template === t.value ? 'rgba(249,115,22,0.08)' : '#111',
                    border: `1.5px solid ${data.template === t.value ? '#F97316' : '#1f1f1f'}`,
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#f5f5f5' }}>{t.label}</span>
                    <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', fontWeight: 600, background: t.badgeColor + '22', color: t.badgeColor }}>{t.badge}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#71717a', lineHeight: 1.5 }}>{t.description}</p>
                </button>
              ))}
            </div>
            {methodologyError && (
              <p style={{ fontSize: '14px', padding: '14px 16px', borderRadius: '12px', background: '#7f1d1d', color: '#fca5a5' }}>{methodologyError}</p>
            )}
            <div>
              <label style={label}>Methodology notes (optional)</label>
              <textarea placeholder="Any specific preferences within this approach..." value={data.template_notes} onChange={e => update('template_notes', e.target.value)} rows={2} style={{ ...inp, resize: 'none' }} />
            </div>
          </div>
        )}

        {/* Step 5 — Training load */}
        {step === 5 && (
          <div style={sectionGap}>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#f5f5f5', letterSpacing: '-0.5px' }}>Training load</h1>
            <p style={{ fontSize: '14px', color: '#71717a', lineHeight: 1.5 }}>
              For <span style={{ color: '#f5f5f5', fontWeight: 600 }}>{TEMPLATES.find(t => t.value === data.template)?.label}</span>, each level corresponds to a real-world plan tier:
            </p>
            <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid #1f1f1f' }}>
              {AGGRESSIVENESS.map((a, idx) => {
                const lbl = TIER_LABELS[data.template]?.[a.value] ?? '';
                const peak = TIER_PEAKS[data.template]?.[a.value] ?? '';
                const isSelected = data.aggressiveness === a.value;
                return (
                  <button key={a.value} onClick={() => update('aggressiveness', a.value as WizardInput['aggressiveness'])}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
                      padding: '18px 20px', textAlign: 'left', cursor: 'pointer',
                      background: isSelected ? 'rgba(249,115,22,0.08)' : '#111',
                      borderBottom: idx < 2 ? '1px solid #1f1f1f' : 'none',
                      borderLeft: isSelected ? '3px solid #F97316' : '3px solid transparent',
                      transition: 'all 0.15s',
                    }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: isSelected ? '#F97316' : '#f5f5f5' }}>{a.label}</span>
                        <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', fontWeight: 600, background: isSelected ? '#F97316' : '#1a1a1a', color: isSelected ? '#fff' : '#71717a' }}>{lbl}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#71717a' }}>{peak}</p>
                    </div>
                    {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F97316', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
            {methodologyError && (
              <p style={{ fontSize: '14px', padding: '14px 16px', borderRadius: '12px', background: '#7f1d1d', color: '#fca5a5' }}>{methodologyError}</p>
            )}
            {tierLabel && (
              <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
                <p style={{ fontSize: '13px', color: '#F97316', lineHeight: 1.5 }}>
                  Your plan will be modelled on <strong>{tierLabel}</strong> — {tierPeak}. Want something different? Just ask Claude in the coach chat.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 6 — B-Races */}
        {step === 6 && (
          <div style={sectionGap}>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#f5f5f5', letterSpacing: '-0.5px' }}>B-Races</h1>
            <p style={{ fontSize: '14px', color: '#71717a', lineHeight: 1.5 }}>Optional tune-up races during your block. Claude will adjust surrounding weeks automatically.</p>
            {data.b_races.map((b, i) => (
              <div key={i} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#f5f5f5' }}>B-Race {i + 1}</span>
                  <button onClick={() => update('b_races', data.b_races.filter((_, j) => j !== i))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#71717a' }}><Trash2 size={16} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={label}>Date</label>
                    <input type="date" value={b.race_date} onChange={e => { const r = [...data.b_races]; r[i] = { ...r[i], race_date: e.target.value }; update('b_races', r); }} style={inp} />
                  </div>
                  <div>
                    <label style={label}>Distance (km)</label>
                    <input type="number" value={b.race_distance_km} onChange={e => { const r = [...data.b_races]; r[i] = { ...r[i], race_distance_km: Number(e.target.value) }; update('b_races', r); }} style={inp} />
                  </div>
                </div>
                <label style={{ ...label, marginBottom: '10px' }}>Effort level</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {([['tune_up', 'Tune-up', 'Replaces a quality session, no surrounding changes'], ['hard', 'Hard effort', 'Slight taper before, 2–3 easy days after'], ['full_send', 'Full send', 'Mini taper before, full recovery week after']] as const).map(([val, lbl, desc]) => (
                    <button key={val} onClick={() => { const r = [...data.b_races]; r[i] = { ...r[i], effort_level: val }; update('b_races', r); }}
                      style={{ ...selBtn(b.effort_level === val), padding: '12px 14px' }}>
                      <span style={{ fontWeight: 700 }}>{lbl}</span>
                      <span style={{ color: '#71717a', fontWeight: 400 }}> — {desc}</span>
                    </button>
                  ))}
                </div>
                <label style={label}>Notes (optional)</label>
                <input type="text" placeholder="e.g. local 10K, just for fun" value={b.notes} onChange={e => { const r = [...data.b_races]; r[i] = { ...r[i], notes: e.target.value }; update('b_races', r); }} style={inp} />
              </div>
            ))}
            <button onClick={() => update('b_races', [...data.b_races, { race_date: '', race_distance_km: 10, effort_level: 'tune_up', notes: '' }])}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '16px', borderRadius: '14px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: '#0d0d0d', border: '1px dashed #2e2e2e', color: '#71717a' }}>
              <Plus size={16} /> Add B-race
            </button>
            <p style={{ fontSize: '13px', color: '#52525b' }}>No B-races? Just tap Next.</p>
          </div>
        )}

        {/* Step 7 — Review */}
        {step === 7 && (
          <div style={sectionGap}>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#f5f5f5', letterSpacing: '-0.5px' }}>Ready to generate</h1>
            <div style={card}>
              {[
                { label: 'Goal', value: data.goal_type },
                { label: 'Race date', value: data.race_date ? formatDateDisplay(data.race_date) : '—' },
                { label: 'Start date', value: data.start_date ? formatDateDisplay(data.start_date) : '—' },
                { label: 'Plan length', value: `${data.total_weeks} weeks` },
                { label: 'Course', value: data.course_type },
                { label: 'Benchmark', value: data.benchmark_time_seconds > 0 ? `${formatSecondsDisplay(data.benchmark_time_seconds)} for ${data.benchmark_distance_km}km` : '—' },
                { label: 'Weekly km', value: `${data.current_weekly_km}km avg` },
                { label: 'Days/week', value: String(data.days_per_week) },
                { label: 'Long run', value: data.long_run_day },
                { label: 'Methodology', value: data.template },
                { label: 'Level', value: tierLabel },
                { label: 'B-races', value: data.b_races.length > 0 ? `${data.b_races.length} race(s)` : 'None' },
              ].map((row, idx, arr) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx < arr.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                  <span style={{ fontSize: '14px', color: '#71717a' }}>{row.label}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f5', textTransform: 'capitalize' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {error && <p style={{ fontSize: '14px', padding: '14px 16px', borderRadius: '12px', background: '#7f1d1d', color: '#fca5a5' }}>{error}</p>}

            {!generating ? (
              <button onClick={generate} style={{ width: '100%', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', background: '#F97316', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Sparkles size={18} /> Generate Plan
              </button>
            ) : (
              <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <p style={{ ...label, marginBottom: 0 }}>Building your plan</p>
                {progress?.totalWeeks ? (
                  <div>
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '52px' }}>
                      {Array.from({ length: progress.totalWeeks }, (_, i) => {
                        const done = (progress.weeksComplete ?? 0) >= i + 1;
                        const phaseColors = ['#60A5FA','#60A5FA','#60A5FA','#60A5FA','#FB923C','#FB923C','#FB923C','#FB923C','#FB923C','#FB923C','#F87171','#F87171','#F87171','#F87171','#A3A3A3','#A3A3A3','#A3A3A3','#A3A3A3','#A3A3A3','#A3A3A3','#A3A3A3','#A3A3A3','#A3A3A3','#A3A3A3'];
                        const color = done ? (phaseColors[i] ?? '#F97316') : '#27272a';
                        const heightPct = 40 + Math.sin(i * 0.8) * 20 + (i / (progress.totalWeeks ?? 1)) * 30;
                        return (
                          <div key={i} style={{ flex: 1, height: `${Math.round(heightPct)}%`, background: color, borderRadius: '3px 3px 0 0', transition: 'background-color 0.4s ease', position: 'relative', overflow: 'hidden' }}>
                            {!done && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.25) 50%, transparent 100%)', animation: `shimmer ${1.5 + i * 0.05}s ease-in-out infinite`, animationDelay: `${i * 0.06}s` }} />}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#52525b' }}>Week 1</span>
                      <span style={{ fontSize: '11px', color: '#52525b' }}>Week {progress.totalWeeks}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ height: '52px', borderRadius: '8px', background: '#1a1a1a' }} />
                )}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#71717a' }}>
                      {progress?.weeksComplete != null && progress.totalWeeks ? `${progress.weeksComplete} of ${progress.totalWeeks} weeks written` : 'Starting…'}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#F97316' }}>{progress?.percent ?? 0}%</span>
                  </div>
                  <div style={{ height: '4px', borderRadius: '2px', background: '#1a1a1a', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '2px', background: '#F97316', width: `${progress?.percent ?? 0}%`, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Loader2 size={16} style={{ color: '#F97316', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                  <p style={{ fontSize: '14px', color: '#f5f5f5' }}>{progress?.message ?? 'Starting…'}</p>
                </div>
                <style>{`
                  @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
                  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                `}</style>
              </div>
            )}
            {!generating && <p style={{ fontSize: '13px', color: '#52525b', textAlign: 'center' }}>Claude will generate all workouts. This takes ~60–90 seconds.</p>}
          </div>
        )}

        {/* Nav */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '48px' }}>
          {step > 0 && (
            <button onClick={back} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '14px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: '#111', border: '1px solid #1f1f1f', color: '#f5f5f5' }}>
              <ChevronLeft size={16} /> Back
            </button>
          )}
          {step < STEPS.length - 1 && (
            <button onClick={next} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', background: '#F97316', border: 'none', color: '#fff' }}>
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>

      </div>
    </AppShell>
  );
}