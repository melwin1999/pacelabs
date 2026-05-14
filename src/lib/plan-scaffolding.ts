// src/lib/plan-scaffolding.ts
// All plan maths lives here. No Claude, no Supabase, no Next.js.
// Input: WizardInput → Output: PlanSkeleton

import { WizardInput, PlanSkeleton, PlanSkeletonWeek, Phase } from '@/lib/types'
import { estimateVdot, getRaceTime, interpolatePaceZones } from '@/lib/vdot-tables'

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

function buildVolumeCurve(input: WizardInput, phases: Phase[]): number[] {
  const { total_weeks, current_weekly_km, aggressiveness, volume_aggressiveness, advanced_load } = input
  const agg = (advanced_load && volume_aggressiveness) ? volume_aggressiveness : aggressiveness

  const raceBoost = input.race_distance_km >= 42 ? 1.25 : input.race_distance_km >= 21 ? 1.1 : 1.0
  const basePeakMultiplier = { conservative: 1.2, moderate: 1.5, aggressive: 1.8 }[agg]
  const targetPeakMultiplier = Math.min(basePeakMultiplier * raceBoost, 2.2)
  const typicalIncrease = { conservative: 0.07, moderate: 0.10, aggressive: 0.12 }[agg]

  const week1Volume = Math.round(current_weekly_km * 0.85)
  const peakVolume = Math.round(current_weekly_km * targetPeakMultiplier)

  const taperStart = phases.find(p => p.name === 'Taper')!.start_week
  const peakStart = phases.find(p => p.name === 'Peak')!.start_week
  const buildUpWeeks = taperStart - 1 // weeks 1 through last peak week

  const volumes: number[] = []
  let base = week1Volume
  let cutbackCounter = 0

  for (let w = 1; w <= total_weeks; w++) {
    const phase = getPhaseForWeek(phases, w)

    if (phase === 'Taper') {
      // Taper: drop from peak
      const taperWeekIndex = w - taperStart // 0, 1
      const taperTotal = phases.find(p => p.name === 'Taper')!.end_week - taperStart + 1
      const dropPct = taperTotal === 1 ? 0.50 : (taperWeekIndex === 0 ? 0.40 : 0.60)
      volumes.push(Math.round(peakVolume * (1 - dropPct)))
      continue
    }

    if (phase === 'Peak') {
      // Peak holds at peakVolume (with possible cutback)
      cutbackCounter++
      if (cutbackCounter % 4 === 0) {
        volumes.push(Math.round(peakVolume * 0.80))
      } else {
        volumes.push(peakVolume)
      }
      continue
    }

    // Base / Build — progressive ramp
    const progressFraction = Math.min(1, (w - 1) / (buildUpWeeks - 1))
    const target = Math.round(week1Volume + (peakVolume - week1Volume) * progressFraction)

    cutbackCounter++
    if (cutbackCounter % 4 === 0) {
      // Cutback week
      volumes.push(Math.round(target * 0.80))
      base = Math.round(target * 0.80)
    } else {
      // Cap weekly increase
      const maxThisWeek = Math.round(base * (1 + typicalIncrease))
      const actual = Math.min(target, maxThisWeek)
      volumes.push(actual)
      base = actual
    }
  }

  return volumes
}

// ─── 3. Long run ──────────────────────────────────────────────────────────────

function longRunKm(weeklyVolumeKm: number, raceDistanceKm: number, template: WizardInput['template']): number {
  // Hansons: hard cap at 26km by design (cumulative fatigue model)
  if (template === 'hansons') {
    return Math.round(Math.min(weeklyVolumeKm * 0.40, 26))
  }

  let pctOfWeekly: number
  if (weeklyVolumeKm <= 50) pctOfWeekly = 0.45
  else if (weeklyVolumeKm <= 75) pctOfWeekly = 0.38
  else pctOfWeekly = 0.32

  const fromWeekly = weeklyVolumeKm * pctOfWeekly
  const fromRace = raceDistanceKm * 0.85
  const hardCap = raceDistanceKm >= 42 ? 38 : raceDistanceKm >= 21 ? 28 : 22

  // Minimum long run floors for marathon/half — prevents absurdly short long runs
  // even at low volume (the runner needs to build to this before race day)
  const floor = raceDistanceKm >= 42 ? Math.min(weeklyVolumeKm * 0.35, 24)
    : raceDistanceKm >= 21 ? Math.min(weeklyVolumeKm * 0.35, 18)
    : 0

  return Math.round(Math.max(floor, Math.min(fromWeekly, fromRace, hardCap)))
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

  // Daniels, Norwegian, Claude
  const base: Record<string, number> = { Base: 1, Build: 2, Peak: 2, Taper: 1 }
  let count = base[phase] ?? 1

  // Last taper week = 0 quality
  if (weekNumber === taperEndWeek) count = 0

  // Can't have 2 quality on fewer than 4 days
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
      const w = weeks[i]
      if (w.week_number === raceWeek) {
        weeks[i] = { ...w, is_b_race_week: true }

        if (bRace.effort_level === 'full_send') {
          // Mini taper before
          if (i > 0) weeks[i - 1] = { ...weeks[i - 1], is_b_race_taper_week: true, target_volume_km: Math.round(weeks[i - 1].target_volume_km * 0.70), notes: weeks[i - 1].notes + ' (mini taper — B-race next week)' }
          // Recovery after
          if (i < weeks.length - 1) weeks[i + 1] = { ...weeks[i + 1], is_b_race_recovery_week: true, target_volume_km: Math.round(weeks[i + 1].target_volume_km * 0.50), notes: weeks[i + 1].notes + ' (recovery — B-race last week)' }
        } else if (bRace.effort_level === 'hard') {
          if (i < weeks.length - 1) weeks[i + 1] = { ...weeks[i + 1], is_b_race_recovery_week: true, target_volume_km: Math.round(weeks[i + 1].target_volume_km * 0.75), notes: weeks[i + 1].notes + ' (post B-race recovery)' }
        }
        // tune_up: no surrounding adjustment
      }
    }
  }

  return weeks
}

// ─── 6. VDOT progression fraction per week ───────────────────────────────────

function vdotFractionForWeek(phase: string, phases: Phase[], weekNumber: number): number {
  // Base phase: 0–20% of gain
  // Build phase: 20–80% of gain
  // Peak phase: 80–100% of gain
  // Taper: stays at 100%
  const phaseObj = phases.find(p => p.name === phase)
  if (!phaseObj) return 0.5

  const phaseLen = phaseObj.end_week - phaseObj.start_week + 1
  const weekInPhase = weekNumber - phaseObj.start_week
  const fractionInPhase = phaseLen > 1 ? weekInPhase / (phaseLen - 1) : 1

  if (phase === 'Base') return 0 + fractionInPhase * 0.20
  if (phase === 'Build') return 0.20 + fractionInPhase * 0.60
  if (phase === 'Peak') return 0.80 + fractionInPhase * 0.20
  return 1.0 // Taper
}

// ─── 7. HR zones (simple string labels) ──────────────────────────────────────

function hrZonesForPhase(phase: string): PlanSkeletonWeek['hr_zones'] {
  if (phase === 'Base') return { easy: 'Z1-Z2', long: 'Z2', threshold: 'Z3-Z4', interval: 'Z4' }
  if (phase === 'Build') return { easy: 'Z2', long: 'Z2-Z3', threshold: 'Z4', interval: 'Z4-Z5' }
  if (phase === 'Peak') return { easy: 'Z1-Z2', long: 'Z2-Z3', threshold: 'Z4', interval: 'Z5' }
  return { easy: 'Z1-Z2', long: 'Z2', threshold: 'Z3', interval: 'Z4' } // Taper
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

function computeVdotGain(input: WizardInput, startVdot: number): number {
  const { aggressiveness, template, current_weekly_km, advanced_load, volume_aggressiveness } = input
  const agg = (advanced_load && volume_aggressiveness) ? volume_aggressiveness : aggressiveness

  const baseGain = { conservative: 2.5, moderate: 4.5, aggressive: 7.0 }[agg]
  const methodMult = {
    pfitzinger: 1.1, norwegian: 1.1, daniels: 1.0,
    hansons: 0.95, higdon: 0.9, claude: 1.0,
  }[template]

  // Volume factor: penalise if current volume is very low relative to plan
  const targetPeak = current_weekly_km * { conservative: 1.2, moderate: 1.5, aggressive: 1.8 }[agg]
  const volumeFactor = Math.min(1.0, current_weekly_km / Math.max(1, targetPeak * 0.6))

  return Math.round((baseGain * methodMult * volumeFactor) * 10) / 10
}

// ─── 10. Block name ───────────────────────────────────────────────────────────

function generateBlockName(input: WizardInput): string {
  const typeLabels: Record<string, string> = {
    marathon: 'Marathon', half: 'Half Marathon', '10k': '10K',
    '5k': '5K', base: 'Base Building', other: 'Training',
  }
  const templateLabels: Record<string, string> = {
    pfitzinger: 'Pfitzinger', daniels: 'Daniels', hansons: 'Hansons',
    higdon: 'Higdon', norwegian: 'Norwegian', claude: 'Custom',
  }
  return `${input.total_weeks}-Week ${templateLabels[input.template]} ${typeLabels[input.goal_type]} Block`
}

// ─── 11. Methodology validation ──────────────────────────────────────────────

const MIN_DAYS_FOR_METHODOLOGY: Record<string, number> = {
  pfitzinger: 5, norwegian: 5, daniels: 4, hansons: 5, higdon: 3, claude: 3,
}

export function validateWizardInput(input: WizardInput): string | null {
  const min = MIN_DAYS_FOR_METHODOLOGY[input.template]
  if (input.days_per_week < min) {
    const labels: Record<string, string> = {
      pfitzinger: 'Pfitzinger', norwegian: 'Norwegian', daniels: 'Daniels',
      hansons: 'Hansons', higdon: 'Higdon', claude: "Claude's Own",
    }
    return `${labels[input.template]} requires at least ${min} running days per week. Consider Higdon, Daniels, or Claude's Own for ${input.days_per_week} days per week.`
  }
  if (input.total_weeks < 6) return 'Plan must be at least 6 weeks.'
  if (input.total_weeks > 24) return 'Plan cannot exceed 24 weeks.'
  if (!input.race_date) return 'Race date is required.'
  if (!input.start_date) return 'Start date is required.'
  if (input.benchmark_time_seconds <= 0) return 'Please enter a benchmark time.'
  return null
}

// ─── 12. Main skeleton builder ────────────────────────────────────────────────

export function buildPlanSkeleton(input: WizardInput): PlanSkeleton {
  const validationError = validateWizardInput(input)
  if (validationError) throw new Error(validationError)

  const startVdot = estimateVdot(input.benchmark_distance_km, input.benchmark_time_seconds)
  const vdotGain = computeVdotGain(input, startVdot)
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

    const weekData: PlanSkeletonWeek = {
      week_number: w,
      phase,
      cutback: isCutback,
      is_b_race_week: false,
      is_b_race_taper_week: false,
      is_b_race_recovery_week: false,
      target_volume_km: targetVolumeKm,
      long_run_km: longRunKm(targetVolumeKm, input.race_distance_km, input.template),
      quality_session_count: qualityCount(
        phase, w, taperPhase.end_week, input.template, input.days_per_week
      ),
      pace_zones: paceZones,
      hr_zones: hrZonesForPhase(phase),
      notes: isCutback ? 'Cutback week — reduced volume for recovery' : '',
    }

    weeks.push(weekData)
  }

  // Apply B-race adjustments
  const adjustedWeeks = applyBRaceFlags(weeks, input.b_races ?? [], input.start_date)

  const whySummary = [
    `${input.total_weeks}-week ${input.template === 'claude' ? "Claude's Own" : input.template.charAt(0).toUpperCase() + input.template.slice(1)} plan.`,
    `Builds weekly volume from ${volumeCurve[0]}km to ${Math.max(...volumeCurve)}km peak.`,
    `Starting VDOT ${startVdot}, target VDOT ${Math.round(targetVdot * 10) / 10}.`,
    `Projected ${input.goal_type === 'marathon' ? 'marathon' : input.goal_type === 'half' ? 'half marathon' : input.goal_type} time: ${formatSeconds(raceProjSeconds)}.`,
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