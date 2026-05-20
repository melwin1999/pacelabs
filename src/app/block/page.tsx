import { supabaseAdmin } from "@/lib/supabase";
import { Block, Workout, Phase } from "@/lib/types";
import AppShell from "@/components/layout/AppShell";
import WeekRow from "@/components/block/WeekRow";
import EmptyState from "@/components/plan/EmptyState";
import BlockAnimations from "@/components/block/BlockAnimations";

export const dynamic = "force-dynamic";

function getPhaseForWeek(phases: Phase[], weekNum: number): string | null {
  return phases.find(p => weekNum >= p.start_week && weekNum <= p.end_week)?.name ?? null;
}

const PHASE_COLORS: Record<string, string> = {
  Base: '#60A5FA', Build: '#FB923C', Peak: '#F87171', Taper: '#F97316',
};

export default async function BlockPage() {
  const { data: blocks } = await supabaseAdmin
    .from("blocks").select("*").eq("status", "active")
    .order("created_at", { ascending: false }).limit(1);
  const block = blocks?.[0] as Block | undefined;

  if (!block) return <AppShell><EmptyState /></AppShell>;

  const { data: workouts } = await supabaseAdmin
    .from("workouts").select("*").eq("block_id", block.id)
    .order("week_number", { ascending: true })
    .order("day_of_week", { ascending: true });

  const allWorkouts = (workouts ?? []) as Workout[];
  const phases = (block.phases ?? []) as Phase[];

  const weekSummaries = Array.from({ length: block.total_weeks }, (_, i) => {
    const weekNum = i + 1;
    const ww = allWorkouts.filter(w => w.week_number === weekNum);
    const nonRest = ww.filter(w => w.type !== "rest" && !w.skipped);
    return {
      weekNumber: weekNum,
      plannedKm: nonRest.reduce((s, w) => s + (w.distance_km ?? 0), 0),
      completedKm: nonRest.filter(w => w.is_complete).reduce((s, w) => s + (w.distance_km ?? 0), 0),
      sessionsTotal: nonRest.length,
      sessionsDone: nonRest.filter(w => w.is_complete).length,
    };
  });

  const totalKm = weekSummaries.reduce((s, w) => s + w.plannedKm, 0);
  const doneKm = weekSummaries.reduce((s, w) => s + w.completedKm, 0);
  const peakKm = Math.max(...weekSummaries.map(w => w.plannedKm));
  const weeksLeft = block.total_weeks - block.current_week;
  const currentPct = Math.min(100, Math.max(2, Math.round((block.current_week / block.total_weeks) * 100)));

  const uniquePhases: { label: string; color: string; startPct: number; endPct: number }[] = [];
  if (phases.length > 0) {
    const names = Array.from(new Set(phases.map(p => p.name)));
    names.forEach(name => {
      const pw = phases.filter(p => p.name === name);
      const s = Math.min(...pw.map(p => p.start_week));
      const e = Math.max(...pw.map(p => p.end_week));
      uniquePhases.push({
        label: name, color: PHASE_COLORS[name] ?? '#71717a',
        startPct: Math.round(((s - 1) / block.total_weeks) * 100),
        endPct: Math.round((e / block.total_weeks) * 100),
      });
    });
  } else {
    uniquePhases.push(
      { label: 'Base', color: '#60A5FA', startPct: 0, endPct: 25 },
      { label: 'Build', color: '#FB923C', startPct: 25, endPct: 62 },
      { label: 'Peak', color: '#F87171', startPct: 62, endPct: 87 },
      { label: 'Taper', color: '#F97316', startPct: 87, endPct: 100 },
    );
  }
  const currentPhaseLabel = uniquePhases.find(p => currentPct >= p.startPct && currentPct <= p.endPct)?.label
    ?? uniquePhases[uniquePhases.length - 1]?.label ?? '';

  const maxKm = Math.max(...weekSummaries.map(w => w.plannedKm), 1);

  return (
    <AppShell>
      <BlockAnimations />
      <div style={{ width: '100%', maxWidth: '950px', padding: '0 32px 40px' }}>
        <div style={{ position: 'relative', padding: '28px 0 22px' }}>
          {/* Orbs */}
          <div style={{
            position: 'absolute', width: '460px', height: '460px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.2) 0%, rgba(249,115,22,0.06) 38%, transparent 65%)',
            top: '-190px', right: '-100px', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', width: '200px', height: '200px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 65%)',
            bottom: '-80px', left: '-30px', pointerEvents: 'none',
          }} />

          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(249,115,22,0.85)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Active block
          </p>
          <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 900, color: '#f5f5f5', letterSpacing: '-0.5px', marginBottom: '2px' }}>
            {block.name}
          </h1>
          <p style={{ fontSize: '11px', color: '#52525b', marginBottom: '18px' }}>
            {block.total_weeks} week block · started {block.start_date
              ? new Date(block.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'}
          </p>

          {/* Stat cards */}
          <div className="block-stat-grid">
            {[
              { label: 'Total', value: totalKm.toFixed(0), unit: 'km', color: '#f5f5f5' },
              { label: 'Done', value: doneKm.toFixed(0), unit: 'km', color: '#10b981' },
              { label: 'Peak week', value: peakKm.toFixed(0), unit: 'km', color: '#f5f5f5' },
              { label: 'Weeks left', value: String(weeksLeft), unit: '', color: '#F97316' },
            ].map(({ label, value, unit, color }) => (
              <div key={label} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: '9px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '3px' }}>{label}</p>
                <p style={{ fontSize: '18px', fontWeight: 800, color, lineHeight: 1 }}>
                  {value}{unit && <span style={{ fontSize: '9px', color: '#52525b', fontWeight: 400 }}> {unit}</span>}
                </p>
              </div>
            ))}
          </div>

          {/* Race track bar — animated */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ height: '6px', borderRadius: '3px', background: '#1a1a1a', position: 'relative', overflow: 'visible' }}>
              <div
                className="track-fill-animate"
                style={{
                  height: '100%', borderRadius: '3px', position: 'relative',
                  background: 'linear-gradient(90deg, #60A5FA 0%, #FB923C 45%, #F87171 72%, #F97316 100%)',
                  '--target-width': `${currentPct}%`,
                } as React.CSSProperties}
              >
                <div className="pl-track-dot" style={{
                  position: 'absolute', right: '-7px', top: '-5px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: '#F97316', border: '2px solid #0a0a0a',
                }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
              {uniquePhases.map(p => (
                <span key={p.label} style={{
                  fontSize: '9px',
                  color: p.label === currentPhaseLabel ? p.color : '#52525b',
                  fontWeight: p.label === currentPhaseLabel ? 700 : 400,
                }}>
                  {p.label}
                </span>
              ))}
            </div>
          </div>

          {/* Volume bars — animated */}
          <p style={{ fontSize: '9px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Weekly volume</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '52px' }}>
            {weekSummaries.map((w, i) => {
              const phase = getPhaseForWeek(phases, w.weekNumber);
              const color = phase ? (PHASE_COLORS[phase] ?? '#71717a') : '#71717a';
              const heightPct = Math.max(4, Math.round((w.plannedKm / maxKm) * 100));
              const isCur = w.weekNumber === block.current_week;
              const upcoming = w.weekNumber > block.current_week;
              return (
                <div
                  key={i}
                  className="vol-bar-animate"
                  title={`W${w.weekNumber} · ${w.plannedKm.toFixed(0)} km${isCur ? ' (current)' : ''}`}
                  style={{
                    flex: 1,
                    borderRadius: '2px 2px 0 0',
                    background: upcoming ? '#1f1f1f' : color,
                    border: upcoming ? '1px dashed #2e2e2e' : isCur ? `1px solid ${color}` : 'none',
                    opacity: upcoming ? 1 : isCur ? 1 : 0.7,
                    cursor: 'pointer',
                    '--target-height': `${heightPct}%`,
                    animationDelay: `${i * 30}ms`,
                  } as React.CSSProperties}
                />
              );
            })}
          </div>
        </div>

        <div style={{ height: '1px', background: '#1a1a1a' }} />

        <div style={{ padding: '14px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#f5f5f5' }}>All weeks</span>
            <span style={{ fontSize: '10px', color: '#3f3f46' }}>Tap to expand</span>
          </div>
          {weekSummaries.map((summary) => {
            const weekWorkouts = allWorkouts.filter(w => w.week_number === summary.weekNumber);
            return (
              <WeekRow
                key={summary.weekNumber}
                weekNumber={summary.weekNumber}
                plannedKm={summary.plannedKm}
                completedKm={summary.completedKm}
                sessionsTotal={summary.sessionsTotal}
                sessionsDone={summary.sessionsDone}
                workouts={weekWorkouts}
                phaseName={getPhaseForWeek(phases, summary.weekNumber)}
                isCurrent={summary.weekNumber === block.current_week}
                allWorkouts={allWorkouts}
              />
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}