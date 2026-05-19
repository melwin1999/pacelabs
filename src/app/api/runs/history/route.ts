import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data: blocks } = await supabaseAdmin
    .from('blocks')
    .select('id, name, status, start_date, race_date, type')
    .in('status', ['active', 'archived', 'completed'])
    .order('start_date', { ascending: false })

  if (!blocks || blocks.length === 0) {
    return NextResponse.json({ sections: [] })
  }

  const blockIds = blocks.map((b: any) => b.id)
  const today = new Date().toISOString().split('T')[0]

  const { data: plannedWorkouts } = await supabaseAdmin
    .from('workouts')
    .select('*')
    .in('block_id', blockIds)
    .neq('type', 'rest')
    .order('scheduled_date', { ascending: false })

  const { data: freeRuns } = await supabaseAdmin
    .from('workouts')
    .select('*')
    .eq('type', 'free_run')
    .is('block_id', null)
    .order('scheduled_date', { ascending: false })

  const workoutsByBlock: Record<string, any[]> = {}
  for (const w of plannedWorkouts ?? []) {
    if (!workoutsByBlock[w.block_id]) workoutsByBlock[w.block_id] = []
    workoutsByBlock[w.block_id].push(w)
  }

  function groupByWeek(rows: any[]) {
    const weekMap: Record<string, any[]> = {}
    for (const row of rows) {
      const d = new Date(row.scheduled_date)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(d)
      monday.setDate(diff)
      const weekKey = monday.toISOString().split('T')[0]
      if (!weekMap[weekKey]) weekMap[weekKey] = []
      weekMap[weekKey].push(row)
    }
    return Object.entries(weekMap)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([weekStart, rows]) => ({ weekStart, rows }))
  }

  const assignedFreeRunIds = new Set<string>()

  const sections = blocks.map((block: any) => {
    const bWorkouts = workoutsByBlock[block.id] ?? []

    const visible = bWorkouts.filter((w: any) => {
      if (w.strava_activity_id) return true
      if (w.scheduled_date <= today && !w.skipped) return true
      return false
    })

    const blockFreeRuns = (freeRuns ?? []).filter((r: any) => {
      if (!block.start_date) return false
      if (r.scheduled_date < block.start_date) return false
      if (block.race_date && r.scheduled_date > block.race_date) return false
      assignedFreeRunIds.add(r.id)
      return true
    })

    const allRows = [...visible, ...blockFreeRuns].sort(
      (a: any, b: any) =>
        new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
    )

    return {
      block_id: block.id,
      block_name: block.name,
      block_status: block.status,
      block_type: block.type,
      start_date: block.start_date,
      race_date: block.race_date,
      weeks: groupByWeek(allRows),
      total_rows: allRows.length,
    }
  }).filter((s: any) => s.total_rows > 0)

  const orphaned = (freeRuns ?? []).filter((r: any) => !assignedFreeRunIds.has(r.id))
  if (orphaned.length > 0) {
    sections.push({
      block_id: 'orphaned',
      block_name: 'Other runs',
      block_status: 'misc',
      block_type: null,
      start_date: null,
      race_date: null,
      weeks: groupByWeek(orphaned),
      total_rows: orphaned.length,
    })
  }

  return NextResponse.json({ sections })
}