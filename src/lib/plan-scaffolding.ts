// src/lib/plan-scaffolding.ts
// All plan maths lives here. No Claude, no Supabase, no Next.js.
// Input: WizardInput → Output: PlanSkeleton
//
// Design principle: each methodology + aggressiveness combination maps to a real-world
// canonical training plan tier. Volume and long run progression mirror the actual plans.

import { WizardInput, PlanSkeleton, PlanSkeletonWeek, Phase } from '@/lib/types'
import { estimateVdot, getRaceTime, interpolatePaceZones } from '@/lib/vdot-tables'

// ─── Methodology tiers ────────────────────────────────────────────────────────
// Maps (template, aggressiveness) → real-world plan name + peak weekly volume (km)
// + minimum recommended starting volume (km/wk)

type Tier = { label: string; peakKm: number; minBaseKm: number; peakLongRunKm: number }

const METHODOLOGY_TIERS: Record<string, Record<string, Tier>> = {
  higdon: {
    conservative: { label: 'Novice Supreme', peakKm: 45, minBaseKm: 5, peakLongRunKm: 32 },
    moderate:     { label: 'Novice 1',       peakKm: 50, minBaseKm: 15, peakLongRunKm: 32 },
    aggressive:   { label: 'Intermediate 1', peakKm: 65, minBaseKm: 30, peakLongRunKm: 32 },
  },
  daniels: {
    conservative: { label: 'Novice (run/walk)', peakKm: 55, minBaseKm: 15, peakLongRunKm: 29 },
    moderate:     { label: '2Q 18/55',          peakKm: 70, minBaseKm: 40, peakLongRunKm: 29 },
    aggressive:   { label: '2Q 18/70+',         peakKm: 90, minBaseKm: 60, peakLongRunKm: 32 },
  },
  pfitzinger: {
    conservative: { label: '18/55',  peakKm: 88,  minBaseKm: 40, peakLongRunKm: 32 },
    moderate:     { label: '18/70',  peakKm: 112, minBaseKm: 50, peakLongRunKm: 35 },
    aggressive:   { label: '18/85+', peakKm: 136, minBaseKm: 65, peakLongRunKm: 35 },
  },
  hansons: {
    conservative: { label: 'Just Finish', peakKm: 65, minBaseKm: 15, peakLongRunKm: 26 },
    moderate:     { label: 'Beginner',    peakKm: 80, minBaseKm: 30, peakLongRunKm: 26 },
    aggressive:   { label: 'Advanced',    peakKm: 95, minBaseKm: 50, peakLongRunKm: 26 },
  },
  norwegian: {
    conservative: { label: 'Norwegian (low)',  peakKm: 75,  minBaseKm: 40, peakLongRunKm: 32 },
    moderate:     { label: 'Norwegian (mid)',  peakKm: 95,  minBaseKm: 55, peakLongRunKm: 32 },
    aggressive:   { label: 'Norwegian (high)', peakKm: 120, minBaseKm: 70, peakLongRunKm: 32 },
  },
  claude: {
    conservative: { label: "Claude's Own — gentle",   peakKm: 55, minBaseKm: 5,  peakLongRunKm: 32 },
    moderate:     { label: "Claude's Own — balanced", peakKm: 75, minBaseKm: 20, peakLongRunKm: 32 },
    aggressive:   { label: "Claude's Own — strong",   peakKm: 95, minBaseKm: 40, peakLongRunKm: 35 },
  },
}

export function getTierLabel(template: WizardInput['template'], aggressiveness: WizardInput['aggressiveness']): string {
  return METHODOLOGY_TIERS[template]?.[aggressiveness]?.label ?? ''
}

// ─── 1. Phase distribution ────────────────────────────────────────────────────

export function computePhases(totalWeeks: number): Phase[] {
  if (totalWeeks < 6) throw new Error('Minimum plan length is 6 weeks')
  if (totalWeeks > 24) throw new Error('Maximum plan length is 24 weeks')

  const taperWeeks = totalWeeks === 6 ? 1 : 2
  const remaining = totalWeeks - taperWeeks
  const peakWeeks = Math.min(4, Math.max(2, Math.round(remaining * 0.18)))

  let baseWeeks: number
  if (totalWeeks <= 8) baseWeeks = 0
  else if (totalWeeks <= 12) baseWeeks = Math.round((remaining - peakWeeks) * 0.25)
  else baseWeeks = Math.round((remaining - peakWeeks) * 0.35)

  const buildWeeks = totalWeeks - taperWeeks - peakWeeks - baseWeeks

  const phases: Phase[] = []
  let cursor = 1
  if (baseWeeks > 0) {
    phases.push({ name: 'Base', start_week: cursor, end_week: cursor + baseWeeks - 1 })
    cursor += baseWeeks
  }
  phases.push({ name: 'Build', start_week: cursor, end_week: cursor + buildWeeks - 1 })
  cursor += buildWeeks
  phases.push({ name: 'Peak', start_week: cursor, end_week: cursor + peakWeeks - 1 })
  cursor += peakWeeks
  phases.push({ name: 'Taper', start_week: cursor, end_week: cursor + taperWeeks - 1 })

  return phases
}

function getPhaseForWeek(phases: Phase[], weekNumber: number): string {
  const p = phases.find(p => weekNumber >= p.start_week && weekNumber <= p.end_week)
  return p?.name ?? 'Build'
}

// ─── 2. Volume curve ──────────────────────────────────────────────────────────
// Target peak volume from methodology tier.
// Ramp rate: 15% for low base (<30km), 12% mid (30-60km), 10% high (60+km).
// Cutback week every 4 weeks drops 20% from previous.

function buildVolumeCurve(input: WizardInput, phases: Phase[]): number[] {
  const { total_weeks, current_weekly_km, aggressiveness, template } = input
  const tier = METHODOLOGY_TIERS[template][aggressiveness]
  const targetPeak = tier.peakKm

  // Determine ramp rate based on starting volume
  const baseLevel = current_weekly_km
  const rampRate = baseLevel < 30 ? 0.15 : baseLevel < 60 ? 0.12 : 0.10

  const week1Volume = Math.max(8, Math.round(current_weekly_km * 0.9))
  const peakVolume = targetPeak

  const taperStart = phases.find(p => p.name === 'Taper')!.start_week
  const buildUpWeeks = taperStart - 1

  const volumes: number[] = []
  let base = week1Volume
  let cutbackCounter = 0

  for (let w = 1; w <= total_weeks; w++) {
    const phase = getPhaseForWeek(phases, w)

    if (phase === 'Taper') {
      const taperWeekIndex = w - taperStart
      const taperTotal = phases.find(p => p.name === 'Taper')!.end_week - taperStart + 1
      const dropPct = taperTotal === 1 ? 0.50 : (taperWeekIndex === 0 ? 0.40 : 0.65)
      volumes.push(Math.round(peakVolume * (1 - dropPct)))
      continue
    }

    if (phase === 'Peak') {
      cutbackCounter++
      volumes.push(cutbackCounter % 4 === 0 ? Math.round(peakVolume * 0.80) : peakVolume)
      continue
    }

    // Base / Build — progressive ramp limited by rampRate, target on smooth curve
    const progressFraction = Math.min(1, (w - 1) / Math.max(1, buildUpWeeks - 1))
    const target = Math.round(week1Volume + (peakVolume - week1Volume) * progressFraction)

    cutbackCounter++
    if (cutbackCounter % 4 === 0) {
      const cutback = Math.round(target * 0.80)
      volumes.push(cutback)
      base = cutback
    } else {
      const maxThisWeek = Math.round(base * (1 + rampRate))
      const actual = Math.min(target, maxThisWeek)
      volumes.push(actual)
      base = actual
    }
  }

  return volumes
}

// ─── 3. Long run ──────────────────────────────────────────────────────────────
// Long run follows its own progression curve from methodology tier's peakLongRunKm.
// Cutback weeks drop the long run by ~30%.

function longRunKm(
  weeklyVolumeKm: number,
  raceDistanceKm: number,
  template: WizardInput['template'],
  aggressiveness: WizardInput['aggressiveness'],
  weekNumber: number,
  totalWeeks: number,
  phase: string,
  isCutbackWeek: boolean
): number {
  // Hansons: hard cap at 26km by design
  if (template === 'hansons') {
    const hansonsPeak = 26
    const planFrac = (weekNumber - 1) / Math.max(1, totalWeeks - 1)
    const start = 13
    let target = start + (hansonsPeak - start) * Math.min(1, planFrac * 1.5)
    if (phase === 'Taper') target = planFrac > 0.95 ? 8 : 14
    if (isCutbackWeek) target *= 0.70
    return Math.round(Math.min(target, weeklyVolumeKm * 0.42))
  }

  // Taper: short long run
  if (phase === 'Taper') {
    const taperFrac = weekNumber / totalWeeks
    return raceDistanceKm >= 42
      ? (taperFrac > 0.95 ? 10 : 19)
      : raceDistanceKm >= 21
      ? (taperFrac > 0.95 ? 8 : 14)
      : 10
  }

  // Get methodology-specific peak long run
  const tier = METHODOLOGY_TIERS[template][aggressiveness]
  const peakLongRun = raceDistanceKm >= 42
    ? tier.peakLongRunKm
    : raceDistanceKm >= 21 ? 21
    : raceDistanceKm >= 10 ? 15
    : 12

  // Starting long run scales with race distance
  const startLongRun = raceDistanceKm >= 42 ? 12 : raceDistanceKm >= 21 ? 8 : 6

  // Long run follows a curve through the plan
  const planFraction = (weekNumber - 1) / Math.max(1, totalWeeks - 1)
  let targetLongRun: number

  if (phase === 'Base') {
    // Build to ~50% of peak in base
    targetLongRun = startLongRun + (peakLongRun * 0.50 - startLongRun) * Math.min(1, planFraction * 2.5)
  } else if (phase === 'Build') {
    // Build from 50% to 95% of peak
    const buildStart = peakLongRun * 0.50
    targetLongRun = buildStart + (peakLongRun * 0.95 - buildStart) * Math.min(1, (planFraction - 0.2) * 2)
  } else {
    // Peak phase — hit peak
    targetLongRun = peakLongRun
  }

  // Cutback week: drop long run 30%
  if (isCutbackWeek) targetLongRun *= 0.70

  // Sanity cap: long run can't exceed 55% of weekly volume
  const volumeCap = weeklyVolumeKm * 0.55

  return Math.round(Math.min(targetLongRun, volumeCap, peakLongRun))
}

// ─── 4. Quality session count ─────────────────────────────────────────────────

function qualityCount(
  phase: string,
  weekNumber: number,
  taperEndWeek: number,
  template: WizardInput['template'],
  daysPerWeek: number
): number {
  if (template === 'hansons') return Math.min(2, daysPerWeek - 2)
  if (template === 'higdon') return daysPerWeek <= 4 ? 0 : 1
  if (template === 'pfitzinger') return Math.min(2, daysPerWeek - 3)

  const base: Record<string, number> = { Base: 1, Build: 2, Peak: 2, Taper: 1 }
  let count = base[phase] ?? 1
  if (weekNumber === taperEndWeek) count = 0
  if (daysPerWeek < 4) count = Math.min(count, 1)
  return count
}

// ─── 5. B-race adjustments ────────────────────────────────────────────────────

function applyBRaceFlags(
  weeks: PlanSkeletonWeek[],
  bRaces: WizardInput['b_races'],
  startDate: string
): PlanSkeletonWeek[] {
  if (!bRaces || bRaces.length === 0) return weeks
  const start = new Date(startDate)
  for (const bRace of bRaces) {
    const raceDate = new Date(bRace.race_date)
    const daysDiff = Math.floor((raceDate.getTime() - start.getTime()) / 86400000)
    const raceWeek = Math.floor(daysDiff / 7) + 1
    for (let i = 0; i < weeks.length; i++) {
      if (weeks[i].week_number === raceWeek) {
        weeks[i] = { ...weeks[i], is_b_race_week: true }
        if (bRace.effort_level === 'full_send') {
          if (i > 0) weeks[i - 1] = { ...weeks[i - 1], is_b_race_taper_week: true, target_volume_km: Math.round(weeks[i - 1].target_volume_km * 0.70), notes: weeks[i - 1].notes + ' (mini taper — B-race next week)' }
          if (i < weeks.length - 1) weeks[i + 1] = { ...weeks[i + 1], is_b_race_recovery_week: true, target_volume_km: Math.round(weeks[i + 1].target_volume_km * 0.50), notes: weeks[i + 1].notes + ' (recovery — B-race last week)' }
        } else if (bRace.effort_level === 'hard') {
          if (i < weeks.length - 1) weeks[i + 1] = { ...weeks[i + 1], is_b_race_recovery_week: true, target_volume_km: Math.round(weeks[i + 1].target_volume_km * 0.75), notes: weeks[i + 1].notes + ' (post B-race recovery)' }
        }
      }
    }
  }
  return weeks
}

// ─── 6. VDOT progression ──────────────────────────────────────────────────────

function vdotFractionForWeek(phase: string, phases: Phase[], weekNumber: number): number {
  const phaseObj = phases.find(p => p.name === phase)
  if (!phaseObj) return 0.5
  const phaseLen = phaseObj.end_week - phaseObj.start_week + 1
  const weekInPhase = weekNumber - phaseObj.start_week
  const fractionInPhase = phaseLen > 1 ? weekInPhase / (phaseLen - 1) : 1
  if (phase === 'Base') return fractionInPhase * 0.20
  if (phase === 'Build') return 0.20 + fractionInPhase * 0.60
  if (phase === 'Peak') return 0.80 + fractionInPhase * 0.20
  return 1.0
}

// ─── 7. HR zones ──────────────────────────────────────────────────────────────

function hrZonesForPhase(phase: string): PlanSkeletonWeek['hr_zones'] {
  if (phase === 'Base') return { easy: 'Z1-Z2', long: 'Z2', threshold: 'Z3-Z4', interval: 'Z4' }
  if (phase === 'Build') return { easy: 'Z2', long: 'Z2-Z3', threshold: 'Z4', interval: 'Z4-Z5' }
  if (phase === 'Peak') return { easy: 'Z1-Z2', long: 'Z2-Z3', threshold: 'Z4', interval: 'Z5' }
  return { easy: 'Z1-Z2', long: 'Z2', threshold: 'Z3', interval: 'Z4' }
}

// ─── 8. Elevation penalty ─────────────────────────────────────────────────────

const ELEVATION_BY_COURSE: Record<string, number> = {
  flat: 50, rolling: 200, hilly: 500, mountainous: 1000,
}

function elevationPenaltySeconds(input: WizardInput): number {
  const gainM = input.elevation_gain_m ?? ELEVATION_BY_COURSE[input.course_type] ?? 50
  return Math.round((gainM / 100) * 105)
}

// ─── 9. VDOT gain ─────────────────────────────────────────────────────────────

function computeVdotGain(input: WizardInput): number {
  const { aggressiveness, template, current_weekly_km } = input
  const baseGain = { conservative: 2.5, moderate: 4.5, aggressive: 7.0 }[aggressiveness]
  const methodMult = { pfitzinger: 1.1, norwegian: 1.1, daniels: 1.0, hansons: 0.95, higdon: 0.9, claude: 1.0 }[template]
  const tier = METHODOLOGY_TIERS[template][aggressiveness]
  const volumeFactor = Math.min(1.0, current_weekly_km / Math.max(1, tier.peakKm * 0.5))
  return Math.round((baseGain * methodMult * volumeFactor) * 10) / 10
}

// ─── 10. Block name ───────────────────────────────────────────────────────────

function generateBlockName(input: WizardInput): string {
  const typeLabels: Record<string, string> = { marathon: 'Marathon', half: 'Half Marathon', '10k': '10K', '5k': '5K', base: 'Base Building', other: 'Training' }
  const templateLabels: Record<string, string> = { pfitzinger: 'Pfitzinger', daniels: 'Daniels', hansons: 'Hansons', higdon: 'Higdon', norwegian: 'Norwegian', claude: 'Custom' }
  return `${input.total_weeks}-Week ${templateLabels[input.template]} ${typeLabels[input.goal_type]} Block`
}

// ─── 11. Validation ───────────────────────────────────────────────────────────

const MIN_DAYS_FOR_METHODOLOGY: Record<string, number> = {
  pfitzinger: 5, norwegian: 5, daniels: 4, hansons: 5, higdon: 3, claude: 3,
}

export function validateWizardInput(input: WizardInput): string | null {
  const minDays = MIN_DAYS_FOR_METHODOLOGY[input.template]
  if (input.days_per_week < minDays) {
    const labels: Record<string, string> = { pfitzinger: 'Pfitzinger', norwegian: 'Norwegian', daniels: 'Daniels', hansons: 'Hansons', higdon: 'Higdon', claude: "Claude's Own" }
    return `${labels[input.template]} requires at least ${minDays} running days per week. Consider Higdon, Daniels, or Claude's Own for ${input.days_per_week} days per week.`
  }
  if (input.total_weeks < 6) return 'Plan must be at least 6 weeks.'
  if (input.total_weeks > 24) return 'Plan cannot exceed 24 weeks. For longer plans (true beginner couch-to-marathon or comeback from injury), we recommend Higdon\'s Novice Supreme (30 weeks) at halhigdon.com.'
  if (!input.race_date) return 'Race date is required.'
  if (!input.start_date) return 'Start date is required.'
  if (input.benchmark_time_seconds <= 0) return 'Please enter a benchmark time.'
  return null
}

export function getWizardWarnings(input: WizardInput): string[] {
  const warnings: string[] = []
  const tier = METHODOLOGY_TIERS[input.template]?.[input.aggressiveness]
  if (tier && input.current_weekly_km < tier.minBaseKm) {
    warnings.push(
      `${tier.label} typically assumes you can already run ${tier.minBaseKm}km/week. ` +
      `Your current volume (${input.current_weekly_km}km/week) is lower — the plan will start gentler ` +
      `but may not reach the canonical peak. Consider a base-building block first, or pick a more ` +
      `conservative aggressiveness.`
    )
  }
  return warnings
}

// ─── 12. Main skeleton builder ────────────────────────────────────────────────

export function buildPlanSkeleton(input: WizardInput): PlanSkeleton {
  const validationError = validateWizardInput(input)
  if (validationError) throw new Error(validationError)

  const startVdot = estimateVdot(input.benchmark_distance_km, input.benchmark_time_seconds)
  const vdotGain = computeVdotGain(input)
  const targetVdot = startVdot + vdotGain
  const estNowSeconds = getRaceTime(startVdot, input.race_distance_km)
  const raceProjSeconds = getRaceTime(targetVdot, input.race_distance_km) + elevationPenaltySeconds(input)

  const phases = computePhases(input.total_weeks)
  const volumeCurve = buildVolumeCurve(input, phases)
  const taperPhase = phases.find(p => p.name === 'Taper')!
  const weeks: PlanSkeletonWeek[] = []

  for (let w = 1; w <= input.total_weeks; w++) {
    const phase = getPhaseForWeek(phases, w)
    const targetVolumeKm = volumeCurve[w - 1]
    const isCutback = w > 1 && targetVolumeKm < volumeCurve[w - 2] * 0.95
    const vdotFraction = vdotFractionForWeek(phase, phases, w)
    const paceZones = interpolatePaceZones(startVdot, targetVdot, vdotFraction)

    weeks.push({
      week_number: w,
      phase,
      cutback: isCutback,
      is_b_race_week: false,
      is_b_race_taper_week: false,
      is_b_race_recovery_week: false,
      target_volume_km: targetVolumeKm,
      long_run_km: longRunKm(targetVolumeKm, input.race_distance_km, input.template, input.aggressiveness, w, input.total_weeks, phase, isCutback),
      quality_session_count: qualityCount(phase, w, taperPhase.end_week, input.template, input.days_per_week),
      pace_zones: paceZones,
      hr_zones: hrZonesForPhase(phase),
      notes: isCutback ? 'Cutback week — reduced volume for recovery' : '',
    })
  }

  const adjustedWeeks = applyBRaceFlags(weeks, input.b_races ?? [], input.start_date)
  const peakVol = Math.max(...volumeCurve)
  const warnings = getWizardWarnings(input)
  const tierLabel = getTierLabel(input.template, input.aggressiveness)

  const whySummary = [
    `${input.total_weeks}-week plan modelled on ${tierLabel}.`,
    `Builds weekly volume from ${volumeCurve[0]}km to ${peakVol}km peak.`,
    `Starting VDOT ${startVdot}, target VDOT ${Math.round(targetVdot * 10) / 10}.`,
    `Projected finish: ${formatSeconds(raceProjSeconds)}.`,
    ...(warnings.length > 0 ? [`Note: ${warnings[0]}`] : []),
  ].join(' ')

  return {
    block_meta: {
      name: generateBlockName(input),
      total_weeks: input.total_weeks,
      race_date: input.race_date,
      race_distance_km: input.race_distance_km,
      est_now_seconds: estNowSeconds,
      race_proj_seconds: raceProjSeconds,
      vdot_start: startVdot,
      vdot_target: Math.round(targetVdot * 10) / 10,
      phases,
      why_summary: whySummary,
    },
    weeks: adjustedWeeks,
  }
}

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}