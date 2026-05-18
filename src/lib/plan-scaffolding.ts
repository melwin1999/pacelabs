// src/lib/plan-scaffolding.ts
import { WizardInput, PlanSkeleton, PlanSkeletonWeek, Phase } from '@/lib/types'
import { estimateVdot, getRaceTime, interpolatePaceZones } from '@/lib/vdot-tables'

// ─── Methodology tiers ────────────────────────────────────────────────────────

type Tier = {
  label: string
  peakKm: number
  minBaseKm: number       // soft warning below this
  hardBlockKm: number     // hard block below this — plan is unsafe
  peakLongRunKm: number
  canOverride: boolean    // can user override the hard block with warning?
}

const METHODOLOGY_TIERS: Record<string, Record<string, Tier>> = {
  higdon: {
    conservative: { label: 'Novice Supreme', peakKm: 45,  minBaseKm: 5,  hardBlockKm: 0,  peakLongRunKm: 32, canOverride: false },
    moderate:     { label: 'Novice 1',       peakKm: 55,  minBaseKm: 15, hardBlockKm: 0,  peakLongRunKm: 32, canOverride: false },
    aggressive:   { label: 'Intermediate 1', peakKm: 65,  minBaseKm: 30, hardBlockKm: 15, peakLongRunKm: 32, canOverride: true },
  },
  daniels: {
    conservative: { label: 'Novice (run/walk)', peakKm: 55,  minBaseKm: 15, hardBlockKm: 0,  peakLongRunKm: 29, canOverride: false },
    moderate:     { label: '2Q 18/55',          peakKm: 70,  minBaseKm: 40, hardBlockKm: 25, peakLongRunKm: 29, canOverride: true },
    aggressive:   { label: '2Q 18/70+',         peakKm: 90,  minBaseKm: 60, hardBlockKm: 45, peakLongRunKm: 32, canOverride: true },
  },
  pfitzinger: {
    conservative: { label: '18/55',  peakKm: 88,  minBaseKm: 48, hardBlockKm: 40, peakLongRunKm: 32, canOverride: false },
    moderate:     { label: '18/70',  peakKm: 112, minBaseKm: 65, hardBlockKm: 50, peakLongRunKm: 35, canOverride: false },
    aggressive:   { label: '18/85+', peakKm: 136, minBaseKm: 80, hardBlockKm: 65, peakLongRunKm: 35, canOverride: false },
  },
  hansons: {
    conservative: { label: 'Just Finish', peakKm: 65,  minBaseKm: 20, hardBlockKm: 0,  peakLongRunKm: 26, canOverride: false },
    moderate:     { label: 'Beginner',    peakKm: 80,  minBaseKm: 30, hardBlockKm: 20, peakLongRunKm: 26, canOverride: true },
    aggressive:   { label: 'Advanced',    peakKm: 95,  minBaseKm: 50, hardBlockKm: 40, peakLongRunKm: 26, canOverride: false },
  },
  norwegian: {
    conservative: { label: 'Norwegian (low)',  peakKm: 75,  minBaseKm: 40, hardBlockKm: 35, peakLongRunKm: 32, canOverride: false },
    moderate:     { label: 'Norwegian (mid)',  peakKm: 95,  minBaseKm: 55, hardBlockKm: 45, peakLongRunKm: 32, canOverride: false },
    aggressive:   { label: 'Norwegian (high)', peakKm: 120, minBaseKm: 70, hardBlockKm: 60, peakLongRunKm: 32, canOverride: false },
  },
  claude: {
    conservative: { label: 'Gentle',   peakKm: 55,  minBaseKm: 5,  hardBlockKm: 0, peakLongRunKm: 32, canOverride: false },
    moderate:     { label: 'Balanced', peakKm: 75,  minBaseKm: 20, hardBlockKm: 0, peakLongRunKm: 32, canOverride: false },
    aggressive:   { label: 'Strong',   peakKm: 95,  minBaseKm: 40, hardBlockKm: 0, peakLongRunKm: 35, canOverride: false },
  },
}

export function getTierLabel(template: WizardInput['template'], aggressiveness: WizardInput['aggressiveness']): string {
  return METHODOLOGY_TIERS[template]?.[aggressiveness]?.label ?? ''
}

export function getTier(template: WizardInput['template'], aggressiveness: WizardInput['aggressiveness']): Tier {
  return METHODOLOGY_TIERS[template]?.[aggressiveness]
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

function buildVolumeCurve(input: WizardInput, phases: Phase[]): number[] {
  const { total_weeks, current_weekly_km, aggressiveness, template } = input
  const tier = METHODOLOGY_TIERS[template][aggressiveness]
  const targetPeak = tier.peakKm
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

    const progressFraction = Math.min(1, (w - 1) / Math.max(1, buildUpWeeks - 1))
    const target = Math.round(week1Volume + (peakVolume - week1Volume) * progressFraction)

    cutbackCounter++
    if (cutbackCounter % 4 === 0) {
      const prevWeekVol = volumes.length > 0 ? volumes[volumes.length - 1] : target
      const cutback = Math.round(prevWeekVol * 0.75)
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
  if (template === 'hansons') {
    const hansonsPeak = 26
    const planFrac = (weekNumber - 1) / Math.max(1, totalWeeks - 1)
    const start = 13
    let target = start + (hansonsPeak - start) * Math.min(1, planFrac * 1.5)
    if (phase === 'Taper') target = planFrac > 0.95 ? 8 : 14
    if (isCutbackWeek) target *= 0.70
    return Math.round(Math.min(target, weeklyVolumeKm * 0.42))
  }

  if (phase === 'Taper') {
    const taperFrac = weekNumber / totalWeeks
    return raceDistanceKm >= 42 ? (taperFrac > 0.95 ? 10 : 19)
      : raceDistanceKm >= 21 ? (taperFrac > 0.95 ? 8 : 14)
      : 10
  }

  const tier = METHODOLOGY_TIERS[template][aggressiveness]
  const peakLongRun = raceDistanceKm >= 42 ? tier.peakLongRunKm
    : raceDistanceKm >= 21 ? 18   // HM: peak long run 18km (shorter than race dist)
    : raceDistanceKm >= 10 ? 13   // 10K: peak long run 13km
    : 10                           // 5K: peak long run 10km

  const startLongRun = raceDistanceKm >= 42 ? 12 : raceDistanceKm >= 21 ? 8 : 6
  const planFraction = (weekNumber - 1) / Math.max(1, totalWeeks - 1)

  let targetLongRun: number
  if (phase === 'Base') {
    targetLongRun = startLongRun + (peakLongRun * 0.50 - startLongRun) * Math.min(1, planFraction * 2.5)
  } else if (phase === 'Build') {
    const buildStart = peakLongRun * 0.50
    targetLongRun = buildStart + (peakLongRun * 0.95 - buildStart) * Math.min(1, (planFraction - 0.2) * 2)
  } else {
    targetLongRun = peakLongRun
  }

  if (isCutbackWeek) targetLongRun *= 0.70
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
  if (template === 'daniels') return 2 // Always 2Q — that's the whole point

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
  const { aggressiveness, template, current_weekly_km, total_weeks } = input
  const baseGain = { conservative: 2.5, moderate: 4.5, aggressive: 7.0 }[aggressiveness]
  const methodMult = { pfitzinger: 1.1, norwegian: 1.1, daniels: 1.0, hansons: 0.95, higdon: 0.9, claude: 1.0 }[template]
  const tier = METHODOLOGY_TIERS[template][aggressiveness]
  const relativeVolume = current_weekly_km / Math.max(1, tier.peakKm)
  let volumeFactor: number
  if (relativeVolume >= 0.8) {
    volumeFactor = 0.7
  } else if (relativeVolume >= 0.5) {
    volumeFactor = 0.85
  } else {
    const planBoost = Math.min(0.2, (total_weeks - 12) * 0.01)
    volumeFactor = Math.min(1.2, 1.0 + planBoost)
  }
  return Math.round((baseGain * methodMult * volumeFactor) * 10) / 10
}

// ─── 10. Block name ───────────────────────────────────────────────────────────

function generateBlockName(input: WizardInput): string {
  const typeLabels: Record<string, string> = { marathon: 'Marathon', half: 'Half Marathon', '10k': '10K', '5k': '5K', base: 'Base Building', other: 'Training' }
  const templateLabels: Record<string, string> = { pfitzinger: 'Pfitzinger', daniels: 'Daniels 2Q', hansons: 'Hansons', higdon: 'Higdon', norwegian: 'Norwegian', claude: 'Custom' }
  return `${input.total_weeks}-Week ${templateLabels[input.template]} ${typeLabels[input.goal_type]} Block`
}

// ─── 11. Validation ───────────────────────────────────────────────────────────

const MIN_DAYS_FOR_METHODOLOGY: Record<string, number> = {
  pfitzinger: 5, norwegian: 5, daniels: 4, hansons: 5, higdon: 3, claude: 3,
}

export function validateWizardInput(input: WizardInput): string | null {
  const minDays = MIN_DAYS_FOR_METHODOLOGY[input.template]
  if (input.days_per_week < minDays) {
    const labels: Record<string, string> = { pfitzinger: 'Pfitzinger', norwegian: 'Norwegian', daniels: 'Daniels 2Q', hansons: 'Hansons', higdon: 'Higdon', claude: "Claude's Own" }
    return `${labels[input.template]} requires at least ${minDays} running days per week. Consider Higdon, Daniels, or Claude's Own for ${input.days_per_week} days per week.`
  }
  if (input.total_weeks < 6) return 'Plan must be at least 6 weeks.'
  if (input.total_weeks > 24) return 'Plan cannot exceed 24 weeks. For longer plans (true beginner couch-to-marathon), we recommend Higdon\'s Novice Supreme (30 weeks) at halhigdon.com.'
  if (!input.race_date) return 'Race date is required.'
  if (!input.start_date) return 'Start date is required.'
  if (input.benchmark_time_seconds <= 0) return 'Please enter a benchmark time.'

  // Hard base mileage blocks
  const tier = METHODOLOGY_TIERS[input.template]?.[input.aggressiveness]
  if (tier && tier.hardBlockKm > 0 && input.current_weekly_km < tier.hardBlockKm) {
    const methodLabels: Record<string, string> = { pfitzinger: 'Pfitzinger', norwegian: 'Norwegian', daniels: 'Daniels 2Q', hansons: 'Hansons', higdon: 'Higdon', claude: "Claude's Own" }
    return `${methodLabels[input.template]} ${tier.label} requires a base of at least ${tier.hardBlockKm}km/week before starting. You're currently at ${input.current_weekly_km}km/week. ${tier.canOverride ? 'Consider a more conservative aggressiveness level, or build your base first.' : 'Build your base first, or choose a less demanding methodology.'}`
  }

  return null
}

export function getWizardWarnings(input: WizardInput): string[] {
  const warnings: string[] = []
  const tier = METHODOLOGY_TIERS[input.template]?.[input.aggressiveness]
  if (tier && input.current_weekly_km < tier.minBaseKm && input.current_weekly_km >= tier.hardBlockKm) {
    warnings.push(
      `${tier.label} typically assumes ${tier.minBaseKm}km/week base. ` +
      `Your current ${input.current_weekly_km}km/week is below this — your plan will start conservatively but may feel challenging. Consider building your base first for best results.`
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