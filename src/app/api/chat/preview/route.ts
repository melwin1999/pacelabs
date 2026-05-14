import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase';

const anthropic = new Anthropic();

const PUSHBACK_RULES = `
PUSHBACK RULES — When the runner asks for any of the following, do NOT propose the change immediately. Ask why, explain the risk, suggest safer alternatives, and only use the tool if they explicitly confirm.
- Skipping more than 2 quality sessions in a row
- Removing >30% of weekly volume during Build or Peak phase
- Deleting any long run within 6 weeks of race day
- Adding a B-race in the Peak phase
- Volume jumps >20% week-over-week
Be direct but not preachy.`;

export async function POST(req: NextRequest) {
  try {
    const { block_id, message, history } = await req.json();

    const { data: block } = await supabaseAdmin.from('blocks').select('*').eq('id', block_id).single();
    if (!block) return NextResponse.json({ error: 'Block not found' }, { status: 404 });

    const { data: workouts } = await supabaseAdmin
      .from('workouts').select('*').eq('block_id', block_id)
      .order('week_number', { ascending: true }).order('day_of_week', { ascending: true });

    const workoutSummary = (workouts ?? [])
      .filter((w: { type: string }) => w.type !== 'rest')
      .map((w: { week_number: number; day_of_week: number; name: string; type: string; distance_km: number; id: string }) =>
        `W${w.week_number}D${w.day_of_week} [${w.id}] ${w.name} (${w.type}, ${w.distance_km}km)`)
      .join('\n');

    const system = `You are PaceLabs coach reviewing a DRAFT training plan before it goes live.
The runner wants to make changes before accepting.

Current plan: ${block.name}, ${block.total_weeks} weeks, ${block.adaptation_aggressiveness}
Workouts (use IDs when proposing changes):
${workoutSummary}

${PUSHBACK_RULES}

You have the propose_plan_change tool. Use it when the runner asks for specific changes.
For general questions, answer conversationally. Keep responses concise.`;

    const tools: Anthropic.Tool[] = [{
      name: 'propose_plan_change',
      description: 'Propose changes to one or more workouts in the draft plan',
      input_schema: {
        type: 'object' as const,
        properties: {
          rationale: { type: 'string' },
          changes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                workout_id: { type: 'string' },
                workout_name: { type: 'string' },
                change_type: { type: 'string', enum: ['edited', 'moved', 'skipped', 'swapped', 'added', 'removed'] },
                field_changed: { type: 'string' },
                old_value: { type: 'string' },
                new_value: { type: 'string' },
                from_date: { type: 'string' },
                to_date: { type: 'string' },
                reason: { type: 'string' },
              },
              required: ['workout_id', 'workout_name', 'change_type'],
            },
          },
        },
        required: ['rationale', 'changes'],
      },
    }];

    const apiMessages: Anthropic.MessageParam[] = [
      ...(history ?? []).map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: message },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system,
      tools,
      messages: apiMessages,
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    const textBlock = response.content.find(b => b.type === 'text');
    const reply = textBlock ? (textBlock as { type: 'text'; text: string }).text : '';

    if (toolUse && toolUse.type === 'tool_use') {
      const toolInput = toolUse.input as { rationale: string; changes: Record<string, unknown>[] };
      const { data: draft, error: draftErr } = await supabaseAdmin
        .from('adapt_drafts')
        .insert({ block_id, triggered_by: 'coach_chat', status: 'pending', rationale: toolInput.rationale, proposed_changes: toolInput.changes })
        .select().single();

      if (draftErr || !draft) {
        return NextResponse.json({ reply: reply || "Hit an error saving changes. Try again.", draft: null });
      }

      let finalReply = reply;
      if (!finalReply) {
        const followUp = await anthropic.messages.create({
          model: 'claude-sonnet-4-6', max_tokens: 300, system,
          messages: [...apiMessages, { role: 'assistant', content: response.content }, { role: 'user', content: 'Briefly summarise the changes you just proposed in one sentence.' }],
        });
        const fb = followUp.content.find(b => b.type === 'text');
        finalReply = fb ? (fb as { type: 'text'; text: string }).text : "Here are my proposed changes.";
      }

      return NextResponse.json({ reply: finalReply, draft });
    }

    return NextResponse.json({ reply, draft: null });
  } catch (err) {
    console.error('Preview chat error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}