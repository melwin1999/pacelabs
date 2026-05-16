"use client";

import { useState } from "react";
import { PlanChange } from "@/lib/types";

const SOURCE_LABELS: Record<string, string> = {
  manual_drag: "Manual drag", coach_chat: "Coach chat",
  auto_adapt: "Auto-adapt", skip: "Skipped",
};
const SOURCE_COLORS: Record<string, string> = {
  manual_drag: "#60A5FA", coach_chat: "#C084FC",
  auto_adapt: "#F97316", skip: "#A3A3A3",
};
const CHANGE_TYPE_LABELS: Record<string, string> = {
  moved: "Moved", swapped: "Swapped", skipped: "Skipped",
  edited: "Edited", added: "Added", removed: "Removed",
};
const SOURCE_FILTERS = [
  { key: "all", label: "All" },
  { key: "manual_drag", label: "Manual" },
  { key: "coach_chat", label: "Coach" },
  { key: "auto_adapt", label: "Auto-adapt" },
  { key: "skip", label: "Skips" },
];

type Props = {
  blockName: string;
  aggressiveness: string;
  changes: PlanChange[];
  workoutsById: Record<string, { name: string }>;
};

export default function SettingsClient({ blockName, aggressiveness, changes, workoutsById }: Props) {
  const [filter, setFilter] = useState("all");
  const filtered = changes.filter(c => filter === "all" || c.source === filter);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 32px' }}>

        <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#f5f5f5', letterSpacing: '-0.5px', marginBottom: '6px' }}>
          Settings
        </h1>
        {blockName && (
          <p style={{ fontSize: '14px', color: '#71717a', marginBottom: '36px' }}>
            {blockName} · Aggressiveness: <strong style={{ color: '#a1a1aa' }}>{aggressiveness}</strong>
          </p>
        )}

        <p style={{ fontSize: '11px', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
          Plan changes log
        </p>

        {/* Filter chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          {SOURCE_FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                padding: '7px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s',
                background: active ? '#F97316' : '#111',
                color: active ? '#09090B' : '#a1a1aa',
                border: active ? '1px solid #F97316' : '1px solid #1f1f1f',
              }}>
                {f.label}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p style={{ fontSize: '14px', color: '#52525b', padding: '24px 0' }}>
            No changes logged{filter !== "all" ? " for this filter" : ""} yet.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(c => {
            const wo = c.workout_id ? workoutsById[c.workout_id] : null;
            const col = SOURCE_COLORS[c.source] ?? "#71717A";
            const date = new Date(c.created_at).toLocaleString("en-GB", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            });
            return (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: '14px',
                padding: '14px 16px', borderRadius: '12px',
                background: '#111', border: '1px solid #1a1a1a',
              }}>
                <div style={{ width: '3px', flexShrink: 0, alignSelf: 'stretch', borderRadius: '2px', background: col, minHeight: '20px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.07em', padding: '2px 8px', borderRadius: '6px',
                        color: col, border: `1px solid ${col}`, background: 'rgba(255,255,255,0.04)',
                      }}>
                        {SOURCE_LABELS[c.source] ?? c.source}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#f5f5f5' }}>
                        {CHANGE_TYPE_LABELS[c.change_type] ?? c.change_type}
                      </span>
                      {wo && <span style={{ fontSize: '13px', color: '#71717a' }}>· {wo.name}</span>}
                    </div>
                    <span style={{ fontSize: '11px', color: '#52525b' }}>{date}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#71717a' }}>
                    {c.change_type === "edited" && c.field_changed && (
                      <span>{c.field_changed.replace("_", " ")}: {c.old_value} → {c.new_value}</span>
                    )}
                    {c.change_type === "moved" && <span>{c.from_date} → {c.to_date}</span>}
                    {c.change_type === "skipped" && c.reason && <span>Reason: {c.reason}</span>}
                  </div>
                  {c.reason && c.change_type !== "skipped" && (
                    <p style={{ fontSize: '12px', color: '#71717a', fontStyle: 'italic', marginTop: '3px' }}>{c.reason}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}