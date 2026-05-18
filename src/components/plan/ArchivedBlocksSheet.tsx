'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, Trash2, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

type BlockItem = {
  id: string;
  name: string;
  type: string;
  total_weeks: number;
  race_date: string | null;
  start_date: string | null;
  status: string;
  created_at: string;
};

type Props = {
  onClose: () => void;
};

export default function ArchivedBlocksSheet({ onClose }: Props) {
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [selected, setSelected] = useState<BlockItem | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Fetch both archived and queued
    Promise.all([
      fetch('/api/blocks/archived').then(r => r.json()),
      fetch('/api/blocks/queued').then(r => r.json()).catch(() => ({ blocks: [] })),
    ]).then(([archivedData, queuedData]) => {
      const queued = (queuedData.blocks ?? []).map((b: BlockItem) => ({ ...b, status: 'queued' }));
      const archived = archivedData.blocks ?? [];
      // Queued first, then archived
      setBlocks([...queued, ...archived]);
      setLoading(false);
    });
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

  const queued = blocks.filter(b => b.status === 'queued');
  const archived = blocks.filter(b => b.status !== 'queued');

  function statusPill(status: string) {
    const isQueued = status === 'queued';
    return (
      <span style={{
        fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        color: isQueued ? '#F97316' : '#52525b',
        background: isQueued ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.04)',
        border: isQueued ? '1px solid rgba(249,115,22,0.2)' : '1px solid #1f1f1f',
      }}>
        {status}
      </span>
    );
  }

  function BlockList() {
    if (loading) return <p style={{ fontSize: '14px', color: '#52525b', padding: '20px 0', textAlign: 'center' }}>Loading…</p>;
    if (blocks.length === 0) return (
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#52525b' }}>No saved blocks yet.</p>
        <p style={{ fontSize: '12px', color: '#3f3f46', marginTop: '6px' }}>Queued and archived plans will appear here.</p>
      </div>
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {queued.length > 0 && (
          <div>
            <p style={{ fontSize: '10px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={11} /> Up next
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {queued.map(b => <BlockRow key={b.id} b={b} />)}
            </div>
          </div>
        )}
        {archived.length > 0 && (
          <div>
            {queued.length > 0 && <div style={{ height: '1px', background: '#1f1f1f', marginBottom: '16px' }} />}
            <p style={{ fontSize: '10px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Archived</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {archived.map(b => <BlockRow key={b.id} b={b} />)}
            </div>
          </div>
        )}
      </div>
    );
  }

  function BlockRow({ b }: { b: BlockItem }) {
    return (
      <button key={b.id} onClick={() => setSelected(b)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 16px', borderRadius: '12px', background: '#0d0d0d',
        border: b.status === 'queued' ? '1px solid rgba(249,115,22,0.2)' : '1px solid #1f1f1f',
        cursor: 'pointer', textAlign: 'left',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f5' }}>{b.name}</p>
            {statusPill(b.status)}
          </div>
          <p style={{ fontSize: '12px', color: '#71717a' }}>
            {b.total_weeks} weeks
            {b.status === 'queued' && b.start_date
              ? ` · Starts ${new Date(b.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : b.race_date
              ? ` · ${new Date(b.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : ''}
          </p>
        </div>
        <ChevronRight size={16} color="#3f3f46" />
      </button>
    );
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
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#f5f5f5' }}>My Blocks</p>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#71717a' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 16px 32px' }}>
          {selected ? (
            <div>
              <button onClick={() => setSelected(null)} style={{
                display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent',
                border: 'none', cursor: 'pointer', color: '#71717a', fontSize: '13px', marginBottom: '16px', padding: 0,
              }}>
                ← Back
              </button>
              <div style={{ background: '#0d0d0d', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  {statusPill(selected.status)}
                </div>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#f5f5f5', marginBottom: '4px' }}>{selected.name}</p>
                <p style={{ fontSize: '13px', color: '#71717a' }}>
                  {selected.total_weeks} weeks
                  {selected.status === 'queued' && selected.start_date
                    ? ` · Starts ${new Date(selected.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    : selected.race_date
                    ? ` · ${new Date(selected.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    : ''}
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
            <BlockList />
          )}
        </div>
      </div>
    </>
  );
}