// src/app/plan/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { WizardInput } from '@/lib/types'

const STORAGE_KEY = 'pacelabs_wizard_input'

const defaultInput: WizardInput = {
  goal_type: 'marathon',
  general_notes: '',
  race_date: '',
  race_distance_km: 42.195,
  course_type: 'flat',
  elevation_gain_m: undefined,
  race_notes: '',
  benchmark_distance_km: 10,
  benchmark_time_seconds: 0,
  current_weekly_km: 40,
  current_runs_per_week: 4,
  peak_history_note: '',
  fitness_notes: '',
  total_weeks: 16,
  start_date: '',
  days_per_week: 4,
  long_run_day: 'sunday',
  schedule_notes: '',
  template: 'claude',
  template_notes: '',
  aggressiveness: 'moderate',
  advanced_load: false,
  volume_aggressiveness: undefined,
  quality_aggressiveness: undefined,
  b_races: [],
}

export default function NewPlanPage() {
  const router = useRouter()
  const [input, setInput] = useState<WizardInput>(defaultInput)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try { setInput(JSON.parse(saved)) } catch {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(input))
  }, [input])

  function update(patch: Partial<WizardInput>) {
    setInput(prev => ({ ...prev, ...patch }))
  }

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/blocks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      localStorage.removeItem(STORAGE_KEY)
      router.push(`/plan/new/preview?id=${data.block_id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto" style={{ color: 'var(--text)' }}>
      <h1 className="text-2xl font-bold mb-6">New Training Plan</h1>

      <div className="space-y-6">

        {/* Goal */}
        <section className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-3">Goal</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Race type</label>
              <select
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={input.goal_type}
                onChange={e => update({ goal_type: e.target.value as WizardInput['goal_type'], race_distance_km: e.target.value === 'marathon' ? 42.195 : e.target.value === 'half' ? 21.0975 : e.target.value === '10k' ? 10 : e.target.value === '5k' ? 5 : 42.195 })}
              >
                <option value="marathon">Marathon</option>
                <option value="half">Half Marathon</option>
                <option value="10k">10K</option>
                <option value="5k">5K</option>
                <option value="base">Base Building</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Notes (optional)</label>
              <textarea
                className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                rows={2}
                placeholder="Anything else about your goal..."
                value={input.general_notes}
                onChange={e => update({ general_notes: e.target.value })}
              />
            </div>
          </div>
        </section>

        {/* Race details */}
        <section className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-3">Race Details</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Race date</label>
              <input
                type="date"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={input.race_date}
                onChange={e => update({ race_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Course type</label>
              <select
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={input.course_type}
                onChange={e => update({ course_type: e.target.value as WizardInput['course_type'] })}
              >
                <option value="flat">Flat</option>
                <option value="rolling">Rolling</option>
                <option value="hilly">Hilly</option>
                <option value="mountainous">Mountainous</option>
              </select>
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Elevation gain (m, optional)</label>
              <input
                type="number"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                placeholder="Leave blank to use course type estimate"
                value={input.elevation_gain_m ?? ''}
                onChange={e => update({ elevation_gain_m: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Race notes (optional)</label>
              <textarea
                className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                rows={2}
                placeholder="e.g. point-to-point, altitude, weather..."
                value={input.race_notes}
                onChange={e => update({ race_notes: e.target.value })}
              />
            </div>
          </div>
        </section>

        {/* Fitness */}
        <section className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-3">Current Fitness</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Benchmark distance (km)</label>
                <input
                  type="number"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  value={input.benchmark_distance_km}
                  onChange={e => update({ benchmark_distance_km: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Benchmark time (seconds)</label>
                <input
                  type="number"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  value={input.benchmark_time_seconds}
                  onChange={e => update({ benchmark_time_seconds: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Current weekly km (4-week avg)</label>
                <input
                  type="number"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  value={input.current_weekly_km}
                  onChange={e => update({ current_weekly_km: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Runs per week (avg)</label>
                <input
                  type="number"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  value={input.current_runs_per_week}
                  onChange={e => update({ current_runs_per_week: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Peak training history (optional)</label>
              <input
                type="text"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                placeholder="e.g. hit 65km/wk for 8 weeks in summer 2025"
                value={input.peak_history_note}
                onChange={e => update({ peak_history_note: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Fitness notes (optional)</label>
              <textarea
                className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                rows={2}
                placeholder="Injuries, recent illness, anything relevant..."
                value={input.fitness_notes}
                onChange={e => update({ fitness_notes: e.target.value })}
              />
            </div>
          </div>
        </section>

        {/* Schedule */}
        <section className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-3">Schedule</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Plan start date</label>
                <input
                  type="date"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  value={input.start_date}
                  onChange={e => update({ start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Plan length (weeks)</label>
                <input
                  type="number"
                  min={6}
                  max={24}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  value={input.total_weeks}
                  onChange={e => update({ total_weeks: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Days per week</label>
                <input
                  type="number"
                  min={3}
                  max={7}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  value={input.days_per_week}
                  onChange={e => update({ days_per_week: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Long run day</label>
                <select
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  value={input.long_run_day}
                  onChange={e => update({ long_run_day: e.target.value as 'saturday' | 'sunday' })}
                >
                  <option value="saturday">Saturday</option>
                  <option value="sunday">Sunday</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Schedule notes (optional)</label>
              <textarea
                className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                rows={2}
                placeholder="Days you can't run, travel, work commitments..."
                value={input.schedule_notes}
                onChange={e => update({ schedule_notes: e.target.value })}
              />
            </div>
          </div>
        </section>

        {/* Methodology */}
        <section className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-3">Methodology</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Training approach</label>
              <select
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={input.template}
                onChange={e => update({ template: e.target.value as WizardInput['template'] })}
              >
                <option value="claude">Claude&apos;s Own — Fully Customised</option>
                <option value="daniels">Daniels</option>
                <option value="pfitzinger">Pfitzinger</option>
                <option value="hansons">Hansons</option>
                <option value="higdon">Higdon</option>
                <option value="norwegian">Norwegian</option>
              </select>
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Methodology notes (optional)</label>
              <textarea
                className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                rows={2}
                placeholder="Any preferences within this approach..."
                value={input.template_notes}
                onChange={e => update({ template_notes: e.target.value })}
              />
            </div>
          </div>
        </section>

        {/* Aggressiveness */}
        <section className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-3">Training Load</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Aggressiveness</label>
              <select
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={input.aggressiveness}
                onChange={e => update({ aggressiveness: e.target.value as WizardInput['aggressiveness'] })}
              >
                <option value="conservative">Conservative — safe progression, injury prevention first</option>
                <option value="moderate">Moderate — balanced progression</option>
                <option value="aggressive">Aggressive — maximum adaptation, higher injury risk</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={input.advanced_load}
                onChange={e => update({ advanced_load: e.target.checked })}
              />
              Customise volume and intensity separately
            </label>
            {input.advanced_load && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Volume aggressiveness</label>
                  <select
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    value={input.volume_aggressiveness ?? input.aggressiveness}
                    onChange={e => update({ volume_aggressiveness: e.target.value as WizardInput['aggressiveness'] })}
                  >
                    <option value="conservative">Conservative</option>
                    <option value="moderate">Moderate</option>
                    <option value="aggressive">Aggressive</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm mb-1 block" style={{ color: 'var(--text-muted)' }}>Quality aggressiveness</label>
                  <select
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    value={input.quality_aggressiveness ?? input.aggressiveness}
                    onChange={e => update({ quality_aggressiveness: e.target.value as WizardInput['aggressiveness'] })}
                  >
                    <option value="conservative">Conservative</option>
                    <option value="moderate">Moderate</option>
                    <option value="aggressive">Aggressive</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* B-races */}
        <section className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-3">B-Races (optional)</h2>
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Tune-up races during your block. Claude will adjust surrounding weeks accordingly.</p>
          {input.b_races.map((b, i) => (
            <div key={i} className="mb-3 p-3 rounded-lg space-y-2" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg px-2 py-1 text-sm"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    value={b.race_date}
                    onChange={e => { const r = [...input.b_races]; r[i] = { ...r[i], race_date: e.target.value }; update({ b_races: r }) }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Distance (km)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg px-2 py-1 text-sm"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    value={b.race_distance_km}
                    onChange={e => { const r = [...input.b_races]; r[i] = { ...r[i], race_distance_km: Number(e.target.value) }; update({ b_races: r }) }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Effort level</label>
                <select
                  className="w-full rounded-lg px-2 py-1 text-sm"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  value={b.effort_level}
                  onChange={e => { const r = [...input.b_races]; r[i] = { ...r[i], effort_level: e.target.value as 'full_send' | 'hard' | 'tune_up' }; update({ b_races: r }) }}
                >
                  <option value="tune_up">Tune-up — replaces a quality session, no surrounding changes</option>
                  <option value="hard">Hard — slight taper before, 2-3 easy days after</option>
                  <option value="full_send">Full send — mini taper before, full recovery week after</option>
                </select>
              </div>
              <button
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => update({ b_races: input.b_races.filter((_, j) => j !== i) })}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            className="text-sm px-3 py-2 rounded-lg"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
            onClick={() => update({ b_races: [...input.b_races, { race_date: '', race_distance_km: 21.0975, effort_level: 'tune_up', notes: '' }] })}
          >
            + Add B-race
          </button>
        </section>

        {/* Generate */}
        {error && (
          <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#7f1d1d', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        <button
          className="w-full py-3 rounded-xl font-semibold text-white"
          style={{ background: loading ? 'var(--border)' : 'var(--accent)' }}
          disabled={loading}
          onClick={handleGenerate}
        >
          {loading ? 'Generating your plan…' : 'Generate Plan'}
        </button>

        <p className="text-xs text-center pb-8" style={{ color: 'var(--text-muted)' }}>
          This replaces the old multi-step wizard. All fields are optional except race date and goal type.
        </p>

      </div>
    </div>
  )
}