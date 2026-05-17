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
    // Check if there's already an active block
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
    if (hasActiveBlock && !showConfirm) {
      setShowConfirm(true);
      return;
    }
    setShowConfirm(false);
    setActivating(true);
    const res = await fetch(`/api/blocks/${blockId}/activate`, { method: 'POST' });
    if (res.ok) {
      const json = await res.json();
      if (json.queued) {
        router.push('/?queued=1');
      } else {
        router.push('/');
      }
    } else {
      setActivating(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      </AppShell>
    );
  }

  if (!block) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p style={{ color: 'var(--text-muted)' }}>Plan not found.</p>
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
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#F9731622', color: 'var(--accent)' }}>
              DRAFT
            </span>
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>{block.name}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{block.total_weeks} weeks · {block.adaptation_aggressiveness}</p>
        </div>

        {block.goal && (
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--accent)' }}>Why this plan?</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{block.goal}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {[
            { label: 'Est. now', value: block.est_now_seconds ? formatTime(block.est_now_seconds) : '—' },
            { label: 'Race proj.', value: block.race_proj_seconds ? formatTime(block.race_proj_seconds) : '—' },
            { label: 'Race date', value: block.race_date ? new Date(block.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-lg font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.04em' }}>{s.value}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {weekSummaries.map(({ weekNumber, totalKm, sessions, phase }) => {
            const phaseColor = phase ? (PHASE_COLOURS[phase] ?? '#A3A3A3') : '#A3A3A3';
            const isExpanded = expandedWeeks.has(weekNumber);
            const weekWorkouts = workouts.filter(w => w.week_number === weekNumber).sort((a, b) => a.day_of_week - b.day_of_week);
            return (
              <div key={weekNumber} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <button onClick={() => toggleWeek(weekNumber)} className="w-full px-4 py-3 flex items-center gap-3 text-left" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: phaseColor }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Week {weekNumber}</span>
                      {phase && <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: phaseColor + '22', color: phaseColor }}>{phase}</span>}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{totalKm.toFixed(1)} km · {sessions} sessions</div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} /> : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />}
                </button>
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {weekWorkouts.map(w => (
                      <div key={w.id} className="px-4 py-3 flex items-start gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: TYPE_COLOURS[w.type] ?? '#A3A3A3' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{DAY_LABELS[w.day_of_week]}</span>
                            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{w.name}</span>
                          </div>
                          {w.type !== 'rest' && (
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {(w.distance_km ?? 0) > 0 ? `${w.distance_km} km` : ''}
                              {w.pace_min_seconds ? ` · ${formatWorkoutPace(w.pace_min_seconds, w.pace_max_seconds ?? w.pace_min_seconds, null)}` : ''}
                            </div>
                          )}
                          {w.description && <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{w.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
            <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Refine with Claude</span>
          </div>
          {messages.length > 0 && (
            <div className="px-4 py-3 space-y-4 max-h-96 overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)' }}>
              {messages.map((m, i) => (
                <div key={i}>
                  <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: m.role === 'user' ? 'var(--accent)' : 'var(--bg)', color: m.role === 'user' ? '#fff' : 'var(--text)', border: m.role === 'assistant' ? '1px solid var(--border)' : 'none' }}>
                      {m.content}
                    </div>
                  </div>
                  {m.draft && draftStates[m.draft.id] === 'pending' && (
                    <div className="mt-2 rounded-xl p-3 space-y-2" style={{ border: '1.5px solid var(--accent)', backgroundColor: 'var(--bg-card)' }}>
                      <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>PROPOSED CHANGES</p>
                      {m.draft.proposed_changes.map((c: ProposedChange, ci: number) => (
                        <div key={ci} className="text-xs" style={{ color: 'var(--text)' }}>
                          <span className="font-semibold">{c.workout_name}</span>
                          {c.field_changed && <span style={{ color: 'var(--text-muted)' }}> — {c.field_changed}: {c.old_value} → {c.new_value}</span>}
                          {c.reason && <span style={{ color: 'var(--text-muted)' }}> ({c.reason})</span>}
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => acceptDraft(m.draft!)} className="flex-1 rounded-lg py-1.5 text-xs font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>Accept</button>
                        <button onClick={() => rejectDraft(m.draft!)} className="flex-1 rounded-lg py-1.5 text-xs font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text)', backgroundColor: 'transparent' }}>Reject</button>
                      </div>
                    </div>
                  )}
                  {m.draft && draftStates[m.draft.id] === 'accepted' && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
                      <span className="text-xs" style={{ color: 'var(--success)' }}>Changes accepted</span>
                    </div>
                  )}
                  {m.draft && draftStates[m.draft.id] === 'rejected' && (
                    <div className="mt-2"><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Changes rejected</span></div>
                  )}
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
          <div className="px-3 py-3 flex gap-2" style={{ backgroundColor: 'var(--bg-card)', borderTop: messages.length > 0 ? '1px solid var(--border)' : 'none' }}>
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder="e.g. Make week 8 lighter, I have a wedding" className="flex-1 rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            <button onClick={sendMessage} disabled={!input.trim() || sending} className="rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div style={{ borderRadius: '12px', padding: '20px', background: '#111', border: '1px solid #1f1f1f', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '14px', color: '#71717a', lineHeight: 1.5 }}>
            Happy with the plan? Accepting will set this as your active block.
            {hasActiveBlock && <span style={{ color: '#F97316' }}> Your current active block will be archived.</span>}
          </p>
          <button onClick={activate} disabled={activating} style={{
            width: '100%', padding: '16px', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
            cursor: 'pointer', background: '#F97316', border: 'none', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            opacity: activating ? 0.7 : 1,
          }}>
            {activating
              ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Activating…</>
              : <><CheckCircle2 size={18} /> Accept plan & start training</>
            }
          </button>
        </div>

        {/* Confirmation modal */}
        {showConfirm && (
          <div onClick={() => setShowConfirm(false)} style={{
            position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              width: '100%', maxWidth: '420px', borderRadius: '20px', padding: '28px',
              background: '#111', border: '1px solid #2e2e2e', display: 'flex', flexDirection: 'column', gap: '20px',
            }}>
              <div>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#f5f5f5', marginBottom: '8px' }}>Switch active plan?</p>
                <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: 1.5 }}>
                  You already have an active training block. Accepting this plan will archive your current block and start this one. This cannot be undone.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowConfirm(false)} style={{
                  flex: 1, padding: '13px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', background: '#0d0d0d', border: '1px solid #2e2e2e', color: '#71717a',
                }}>Cancel</button>
                <button onClick={activate} disabled={activating} style={{
                  flex: 1, padding: '13px', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', background: '#F97316', border: 'none', color: '#fff',
                }}>
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
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} /></div>}>
      <PreviewPageInner />
    </Suspense>
  );
}