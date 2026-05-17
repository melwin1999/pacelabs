'use client';

import { useState, useEffect } from 'react';
import { X, Archive, ChevronRight, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ArchivedBlock = {
  id: string;
  name: string;
  type: string;
  total_weeks: number;
  race_date: string | null;
  status: string;
  created_at: string;
};

type Props = {
  onClose: () => void;
};

export default function ArchivedBlocksSheet({ onClose }: Props) {
  const [blocks, setBlocks] = useState<ArchivedBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [selected, setSelected] = useState<ArchivedBlock | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/blocks/archived')
      .then(r => r.json())
      .then(d => { setBlocks(d.blocks ?? []); setLoading(false); });
  }, []);

  async function deleteBlock(id: string) {
    setDeleting(id);
    await fetch(`/api/blocks/${id}/delete`, { method: 'DELETE' });
    setBlocks(prev => prev.filter(b => b.id !== id));
    setDeleting(null);
    if (selected?.id === id) setSelected(null);
  }

  async function activateBlock(id: string) {
    setActivating(id);
    const res = await fetch(`/api/blocks/${id}/activate`, { method: 'POST' });
    if (res.ok) { onClose(); router.push('/'); router.refresh(); }
    else setActivating(null);
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(0,0,0,0.6)' }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 49,
        background: '#111', borderRadius: '20px 20px 0 0', border: '1px solid #2e2e2e',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ width: '36px', height: '4px', background: '#2e2e2e', borderRadius: '2px', margin: '12px auto 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #1f1f1f' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Archive size={16} color="#F97316" />
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#f5f5f5' }}>Archived blocks</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#71717a' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px 32px' }}>
          {loading && <p style={{ fontSize: '14px', color: '#52525b', padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
          {!loading && blocks.length === 0 && (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#52525b' }}>No archived blocks yet.</p>
              <p style={{ fontSize: '12px', color: '#3f3f46', marginTop: '6px' }}>Completed or replaced plans will appear here.</p>
            </div>
          )}

          {selected ? (
            <div>
              <button onClick={() => setSelected(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#71717a', fontSize: '13px', marginBottom: '16px', padding: 0 }}>
                ← Back
              </button>
              <div style={{ background: '#0d0d0d', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
                <p style={{ fontSize: '11px', color: '#F97316', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{selected.status}</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#f5f5f5', marginBottom: '4px' }}>{selected.name}</p>
                <p style={{ fontSize: '13px', color: '#71717a' }}>
                  {selected.total_weeks} weeks
                  {selected.race_date ? ` · ${new Date(selected.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => activateBlock(selected.id)}
                  disabled={!!activating}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
                    cursor: 'pointer', background: '#F97316', border: 'none', color: '#fff',
                    opacity: activating ? 0.7 : 1,
                  }}
                >
                  {activating === selected.id ? 'Activating…' : 'Activate this block'}
                </button>
                <button
                  onClick={() => deleteBlock(selected.id)}
                  disabled={!!deleting}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                    cursor: 'pointer', background: 'transparent', border: '1px solid #3f3f46', color: '#71717a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    opacity: deleting ? 0.7 : 1,
                  }}
                >
                  <Trash2 size={15} />
                  {deleting === selected.id ? 'Deleting…' : 'Delete this block'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {blocks.map(b => (
                <button key={b.id} onClick={() => setSelected(b)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', borderRadius: '12px', background: '#0d0d0d',
                  border: '1px solid #1f1f1f', cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f5', marginBottom: '3px' }}>{b.name}</p>
                    <p style={{ fontSize: '12px', color: '#71717a' }}>
                      {b.total_weeks} weeks
                      {b.race_date ? ` · ${new Date(b.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                      {' · '}<span style={{ color: '#52525b', textTransform: 'capitalize' }}>{b.status}</span>
                    </p>
                  </div>
                  <ChevronRight size={16} color="#3f3f46" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}