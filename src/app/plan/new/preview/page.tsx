'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { Block, Workout, AdaptDraft, ProposedChange } from '@/lib/types';
import { formatWorkoutPace } from '@/lib/utils';
import { CheckCircle2, Loader2, Sparkles, Send, ChevronDown, ChevronUp } from 'lucide-react';

const TYPE_COLOURS: Record<string, string> = {
  easy: '#86EFAC', long: '#FCD34D', tempo: '#FB923C', threshold: '#F87171',
  intervals: '#C084FC', recovery: '#93C5FD', race: '#F97316',
  rest: '#3F3F46', strides: '#86EFAC', fartlek: '#67E8F9',
  progression: '#A3E635', custom: '#A3A3A3',
};

const PHASE_COLOURS: Record<string, string> = {
  Base: '#60A5FA', Build: '#FB923C', Peak: '#F87171',
  Taper: '#A3A3A3', Maintain: '#A3E635',
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  draft?: AdaptDraft | null;
};

function formatTime(s: number): string {
  if (!s) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function getPhaseForWeek(block: Block, weekNum: number): string | null {
  if (!block.phases) return null;
  const p = block.phases.find(p => weekNum >= p.start_week && weekNum <= p.end_week);
  return p?.name ?? null;
}

function PreviewPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const blockId = searchParams.get('id');

  const [block, setBlock] = useState<Block | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [activating, setActivating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hasActiveBlock, setHasActiveBlock] = useState(false);
  const [draftStates, setDraftStates] = useState<Record<string, 'pending' | 'accepted' | 'rejected'>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadBlock = useCallback(async () => {
    if (!blockId) return;
    const res = await fetch(`/api/blocks/${blockId}`);
    if (!res.ok) return;
    const json = await res.json();
    setBlock(json.block);
    setWorkouts(json.workouts);
    setLoading(false);
    const activeRes = await fetch('/api/blocks/active');
    if (activeRes.ok) {
      const activeJson = await activeRes.json();
      setHasActiveBlock(!!activeJson.block && activeJson.block.id !== blockId);
    }
  }, [blockId]);

  useEffect(() => { loadBlock(); }, [loadBlock]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function toggleWeek(w: number) {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      next.has(w) ? next.delete(w) : next.add(w);
      return next;
    });
  }

  async function sendMessage() {
    if (!input.trim() || sending || !blockId) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setSending(true);
    try {
      const res = await fetch('/api/chat/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block_id: blockId, message: userMsg, history: messages }),
      });
      const json = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: json.reply, draft: json.draft ?? null }]);
      if (json.draft) setDraftStates(prev => ({ ...prev, [json.draft.id]: 'pending' }));
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }]);
    }
    setSending(false);
  }

  async function acceptDraft(draft: AdaptDraft) {
    const res = await fetch(`/api/adapt/${draft.id}/accept`, { method: 'POST' });
    if (res.ok) { setDraftStates(prev => ({ ...prev, [draft.id]: 'accepted' })); loadBlock(); }
  }

  async function rejectDraft(draft: AdaptDraft) {
    const res = await fetch(`/api/adapt/${draft.id}/reject`, { method: 'POST' });
    if (res.ok) setDraftStates(prev => ({ ...prev, [draft.id]: 'rejected' }));
  }

  async function activate() {
    if (!blockId) return;
    if (hasActiveBlock && !showConfirm) { setShowConfirm(true); return; }
    setShowConfirm(false);
    setActivating(true);
    const res = await fetch(`/api/blocks/${blockId}/activate`, { method: 'POST' });
    if (res.ok) {
      const json = await res.json();
      router.push(json.queued ? '/?queued=1' : '/');
    } else {
      setActivating(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <Loader2 size={32} style={{ color: '#F97316', animation: 'spin 1s linear infinite' }} />
        </div>
      </AppShell>
    );
  }

  if (!block) {
    return (
      <AppShell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <p style={{ color: '#71717a' }}>Plan not found.</p>
        </div>
      </AppShell>
    );
  }

  const weekSummaries = Array.from({ length: block.total_weeks }, (_, i) => {
    const wn = i + 1;
    const ww = workouts.filter(w => w.week_number === wn && w.type !== 'rest' && !w.skipped);
    return {
      weekNumber: wn,
      totalKm: ww.reduce((s, w) => s + (w.distance_km ?? 0), 0),
      sessions: ww.length,
      phase: getPhaseForWeek(block, wn),
    };
  });

  return (
    <AppShell>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 24px 60px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Header */}
        <div>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'rgba(249,115,22,0.1)', color: '#F97316', letterSpacing: '0.08em' }}>
              DRAFT
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 900, color: '#f5f5f5', letterSpacing: '-0.5px', marginBottom: '4px' }}>{block.name}</h1>
          <p style={{ fontSize: '13px', color: '#71717a' }}>{block.total_weeks} weeks · {block.adaptation_aggressiveness}</p>
        </div>

        {/* Why this plan */}
        {block.goal && (
          <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '16px 18px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F97316', marginBottom: '8px' }}>Why this plan?</p>
            <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6 }}>{block.goal}</p>
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#111', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '16px 18px' }}>
          {[
            { label: 'Est. now', value: block.est_now_seconds ? formatTime(block.est_now_seconds) : '—' },
            { label: 'Race proj.', value: block.race_proj_seconds ? formatTime(block.race_proj_seconds) : '—' },
            { label: 'Race date', value: block.race_date ? new Date(block.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#f5f5f5', letterSpacing: '-0.5px' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Week list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {weekSummaries.map(({ weekNumber, totalKm, sessions, phase }) => {
            const phaseColor = phase ? (PHASE_COLOURS[phase] ?? '#A3A3A3') : '#A3A3A3';
            const isExpanded = expandedWeeks.has(weekNumber);
            const weekWorkouts = workouts
                      .filter(w => w.week_number === weekNumber && w.type !== 'rest')
                      .sort((a, b) => a.day_of_week - b.day_of_week);

            return (
              <div key={weekNumber} style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #1a1a1a' }}>
                <button
                  onClick={() => toggleWeek(weekNumber)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', background: '#111', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ width: '3px', height: '32px', borderRadius: '2px', flexShrink: 0, background: phaseColor }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#f5f5f5' }}>Week {weekNumber}</span>
                      {phase && (
                        <span style={{
                          fontSize: '9px', padding: '2px 7px', borderRadius: '10px', fontWeight: 600,
                          color: phaseColor, background: `${phaseColor}22`,
                        }}>{phase}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#52525b' }}>{totalKm.toFixed(0)} km · {sessions} sessions</div>
                  </div>
                  {isExpanded
                    ? <ChevronUp size={14} style={{ color: '#52525b', flexShrink: 0 }} />
                    : <ChevronDown size={14} style={{ color: '#52525b', flexShrink: 0 }} />
                  }
                </button>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid #1a1a1a' }}>
                    {weekWorkouts.map((w, idx) => (
                      <div
                        key={w.id}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '12px',
                          padding: '12px 14px',
                          borderBottom: idx < weekWorkouts.length - 1 ? '1px solid #1a1a1a' : 'none',
                          background: '#0d0d0d',
                        }}
                      >
                        <div style={{
                          width: '8px', height: '8px', borderRadius: '50%', marginTop: '5px', flexShrink: 0,
                          background: TYPE_COLOURS[w.type] ?? '#A3A3A3',
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#52525b' }}>{DAY_LABELS[w.day_of_week]}</span>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f5f5f5' }}>{w.name}</span>
                          </div>
                          {w.type !== 'rest' && (
                            <div style={{ fontSize: '11px', color: '#71717a', marginBottom: w.description ? '4px' : '0' }}>
                              {(w.distance_km ?? 0) > 0 ? `${w.distance_km} km` : ''}
                              {w.pace_min_seconds ? ` · ${formatWorkoutPace(w.pace_min_seconds, w.pace_max_seconds ?? w.pace_min_seconds, null)}` : ''}
                            </div>
                          )}
                          {w.description && (
                            <p style={{ fontSize: '12px', color: '#71717a', lineHeight: 1.5, margin: 0 }}>{w.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Refine with AI */}
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #1f1f1f' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 16px', background: '#111', borderBottom: messages.length > 0 ? '1px solid #1f1f1f' : 'none',
          }}>
            <Sparkles size={14} style={{ color: '#F97316' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f5f5f5' }}>Refine with AI</span>
          </div>

          {messages.length > 0 && (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto', background: '#111' }}>
              {messages.map((m, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '85%', borderRadius: '14px', padding: '10px 14px',
                      fontSize: '13px', lineHeight: 1.5,
                      ...(m.role === 'user'
                        ? { background: '#F97316', color: '#09090B', borderBottomRightRadius: '4px' }
                        : { background: '#0d0d0d', border: '1px solid #1f1f1f', color: '#a1a1aa', borderBottomLeftRadius: '4px' }
                      ),
                    }}>
                      {m.content}
                    </div>
                  </div>

                  {m.draft && draftStates[m.draft.id] === 'pending' && (
                    <div style={{
                      marginTop: '8px', borderRadius: '10px', padding: '12px 14px',
                      border: '1.5px solid #F97316', background: '#111',
                      display: 'flex', flexDirection: 'column', gap: '8px',
                    }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#F97316', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Proposed changes</p>
                      {m.draft.proposed_changes.map((c: ProposedChange, ci: number) => (
                        <div key={ci} style={{ fontSize: '12px', color: '#f5f5f5' }}>
                          <span style={{ fontWeight: 600 }}>{c.workout_name}</span>
                          {c.field_changed && <span style={{ color: '#71717a' }}> — {c.field_changed}: {c.old_value} → {c.new_value}</span>}
                          {c.reason && <span style={{ color: '#71717a' }}> ({c.reason})</span>}
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          onClick={() => acceptDraft(m.draft!)}
                          style={{ flex: 1, padding: '9px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, background: '#F97316', border: 'none', color: '#fff', cursor: 'pointer' }}
                        >Accept</button>
                        <button
                          onClick={() => rejectDraft(m.draft!)}
                          style={{ flex: 1, padding: '9px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: 'transparent', border: '1px solid #2e2e2e', color: '#71717a', cursor: 'pointer' }}
                        >Reject</button>
                      </div>
                    </div>
                  )}
                  {m.draft && draftStates[m.draft.id] === 'accepted' && (
                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={13} style={{ color: '#10b981' }} />
                      <span style={{ fontSize: '12px', color: '#10b981' }}>Changes accepted</span>
                    </div>
                  )}
                  {m.draft && draftStates[m.draft.id] === 'rejected' && (
                    <div style={{ marginTop: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#52525b' }}>Changes rejected</span>
                    </div>
                  )}
                </div>
              ))}
              {sending && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '10px 14px', borderRadius: '14px', borderBottomLeftRadius: '4px', background: '#0d0d0d', border: '1px solid #1f1f1f' }}>
                    <Loader2 size={14} style={{ color: '#52525b', animation: 'spin 1s linear infinite' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', padding: '12px', background: '#111', borderTop: messages.length > 0 ? '1px solid #1f1f1f' : 'none' }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="e.g. Make week 8 lighter, I have a wedding"
              style={{
                flex: 1, padding: '11px 14px', borderRadius: '10px', fontSize: '13px',
                background: '#0d0d0d', border: '1px solid #1f1f1f', color: '#f5f5f5', outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              style={{
                padding: '11px 14px', borderRadius: '10px', background: '#F97316',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: !input.trim() || sending ? 0.4 : 1, flexShrink: 0,
              }}
            >
              <Send size={16} color="#09090B" />
            </button>
          </div>
        </div>

        {/* Activate */}
        <div style={{ borderRadius: '12px', padding: '20px', background: '#111', border: '1px solid #1f1f1f', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13px', color: '#71717a', lineHeight: 1.5, margin: 0 }}>
            Happy with the plan? Accepting will set this as your active block.
            {hasActiveBlock && <span style={{ color: '#F97316' }}> Your current active block will be archived.</span>}
          </p>
          <button
            onClick={activate}
            disabled={activating}
            style={{
              width: '100%', padding: '16px', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
              cursor: 'pointer', background: '#F97316', border: 'none', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: activating ? 0.7 : 1,
            }}
          >
            {activating
              ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Activating…</>
              : <><CheckCircle2 size={18} /> Accept plan & start training</>
            }
          </button>
        </div>

        {/* Confirmation modal */}
        {showConfirm && (
          <div
            onClick={() => setShowConfirm(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '420px', borderRadius: '20px', padding: '28px', background: '#111', border: '1px solid #2e2e2e', display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              <div>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#f5f5f5', marginBottom: '8px' }}>Switch active plan?</p>
                <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: 1.5, margin: 0 }}>
                  You already have an active training block. Accepting this plan will archive your current block and start this one. This cannot be undone.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{ flex: 1, padding: '13px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: '#0d0d0d', border: '1px solid #2e2e2e', color: '#71717a' }}
                >Cancel</button>
                <button
                  onClick={activate}
                  disabled={activating}
                  style={{ flex: 1, padding: '13px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', background: '#F97316', border: 'none', color: '#fff' }}
                >
                  {activating ? 'Activating…' : 'Yes, switch plan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} style={{ color: '#F97316', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <PreviewPageInner />
    </Suspense>
  );
}