import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ProposedChange } from '@/lib/types'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: draftId } = await params

    const { data: draft, error: draftError } = await supabaseAdmin
      .from('adapt_drafts')
      .select('*')
      .eq('id', draftId)
      .single()

    if (draftError || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    if (draft.status !== 'pending') {
      return NextResponse.json({ error: 'Draft is not pending' }, { status: 400 })
    }

    const changes: ProposedChange[] = draft.proposed_changes ?? []

    for (const change of changes) {
      if (!change.workout_id) continue

      if (change.change_type === 'edited' && change.field_changed) {
        const updateValue =
          change.field_changed === 'distance_km' ||
          change.field_changed === 'pace_min_seconds' ||
          change.field_changed === 'pace_max_seconds'
            ? Number(change.new_value)
            : change.new_value

        await supabaseAdmin
          .from('workouts')
          .update({ [change.field_changed]: updateValue })
          .eq('id', change.workout_id)
      }

      if (change.change_type === 'skipped') {
        await supabaseAdmin
          .from('workouts')
          .update({ skipped: true, skipped_reason: change.reason ?? 'Auto-adapt' })
          .eq('id', change.workout_id)
      }

      if (change.change_type === 'moved' && change.to_date) {
        await supabaseAdmin
          .from('workouts')
          .update({ scheduled_date: change.to_date })
          .eq('id', change.workout_id)
      }

      await supabaseAdmin.from('plan_changes').insert({
        block_id: draft.block_id,
        workout_id: change.workout_id,
        change_type: change.change_type,
        from_date: change.from_date ?? null,
        to_date: change.to_date ?? null,
        field_changed: change.field_changed ?? null,
        old_value: change.old_value ?? null,
        new_value: change.new_value ?? null,
        source: 'auto_adapt',
        reason: change.reason ?? draft.rationale ?? null,
      })
    }

    await supabaseAdmin
      .from('adapt_drafts')
      .update({ status: 'accepted', resolved_at: new Date().toISOString() })
      .eq('id', draftId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('adapt/accept error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}