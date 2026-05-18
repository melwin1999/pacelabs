"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, History } from "lucide-react";
import InlineProposalCard from "@/components/coach/InlineProposalCard";
import { AdaptDraft } from "@/lib/types";

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  adapt_draft_id?: string | null;
  adapt_draft?: AdaptDraft | null;
};

const QUICK_QUESTIONS = [
  "How is my training going overall?",
  "What should I focus on this week?",
  "Am I on track for race day?",
  "How should I approach my next long run?",
];

// Simple markdown renderer: **bold**, *italic*, bullet lines
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Parse inline bold/italic
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const italicMatch = remaining.match(/\*(.+?)\*/);

      const boldIdx = boldMatch?.index ?? Infinity;
      const italicIdx = italicMatch?.index ?? Infinity;

      if (boldMatch && boldIdx <= italicIdx) {
        if (boldIdx > 0) parts.push(<span key={key++}>{remaining.slice(0, boldIdx)}</span>);
        parts.push(<strong key={key++} style={{ fontWeight: 700, color: '#f5f5f5' }}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldIdx + boldMatch[0].length);
      } else if (italicMatch && italicIdx < Infinity) {
        if (italicIdx > 0) parts.push(<span key={key++}>{remaining.slice(0, italicIdx)}</span>);
        parts.push(<em key={key++}>{italicMatch[1]}</em>);
        remaining = remaining.slice(italicIdx + italicMatch[0].length);
      } else {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }
    }

    // Bullet lines
    const isBullet = line.trimStart().startsWith('- ');
    if (isBullet) {
      return (
        <div key={i} style={{ display: 'flex', gap: '8px', marginTop: i > 0 ? '4px' : '0' }}>
          <span style={{ color: '#F97316', flexShrink: 0, marginTop: '1px' }}>·</span>
          <span>{parts}</span>
        </div>
      );
    }

    if (line.trim() === '') return <div key={i} style={{ height: '8px' }} />;
    return <div key={i} style={{ marginTop: i > 0 ? '2px' : '0' }}>{parts}</div>;
  });
}

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadHistory() {
    try {
      const res = await fetch("/api/chat/history");
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: trimmed }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      if (data.adapt_draft_id) {
        await loadHistory();
        setSending(false);
        return;
      }
      setMessages(prev => [...prev, {
        role: "assistant", content: data.reply,
        adapt_draft_id: data.adapt_draft_id ?? null, adapt_draft: null,
      }]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong.";
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${errorMessage}` }]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  return (
    <>
      <style>{`
        #coach-outer {
          height: calc(100vh - 62px);
        }
        @media (min-width: 768px) {
          #coach-outer {
            height: 100vh;
            padding-left: 32px !important;
            padding-right: 32px !important;
          }
        }
      `}</style>
      <div id="coach-outer" style={{
        display: 'flex', flexDirection: 'column',
        maxWidth: '780px', margin: '0 auto', padding: '32px 16px 0',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexShrink: 0 }}>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#f5f5f5', letterSpacing: '-0.5px' }}>Coach</h1>
          <Link href="/coach/history" style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', fontWeight: 500, padding: '8px 14px', borderRadius: '10px',
            color: '#a1a1aa', border: '1px solid #1f1f1f', textDecoration: 'none',
            background: '#111',
          }}>
            <History size={14} /> History
          </Link>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', paddingBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loadingHistory && (
            <p style={{ fontSize: '14px', color: '#52525b' }}>Loading conversation...</p>
          )}

          {!loadingHistory && messages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '14px', color: '#71717a' }}>Ask me anything about your training.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {QUICK_QUESTIONS.map(q => (
                  <button key={q} onClick={() => sendMessage(q)} style={{
                    textAlign: 'left', fontSize: '13px', padding: '14px 16px',
                    borderRadius: '12px', background: '#111', border: '1px solid #1f1f1f',
                    color: '#a1a1aa', cursor: 'pointer', lineHeight: 1.4,
                    transition: 'border-color 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#2e2e2e')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#1f1f1f')}
                  >{q}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={m.id ?? i}>
              <div style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '14px 18px', borderRadius: '18px',
                  fontSize: '14px', lineHeight: 1.6,
                  ...(m.role === 'user'
                    ? { background: '#F97316', color: '#09090B', borderBottomRightRadius: '4px', whiteSpace: 'pre-wrap' }
                    : { background: '#111', border: '1px solid #1f1f1f', color: '#a1a1aa', borderBottomLeftRadius: '4px' }
                  ),
                }}>
                  {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
                </div>
              </div>
              {m.role === 'assistant' && m.adapt_draft && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '8px' }}>
                  <div style={{ maxWidth: '80%', width: '100%' }}>
                    <InlineProposalCard draft={m.adapt_draft} onResolved={loadHistory} />
                  </div>
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '14px 18px', borderRadius: '18px', borderBottomLeftRadius: '4px',
                fontSize: '14px', background: '#111', border: '1px solid #1f1f1f', color: '#52525b',
              }}>Thinking...</div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid #1f1f1f', padding: '16px 0 24px', flexShrink: 0 }}>
          <div id="coach-input-row" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your coach..."
              rows={1} disabled={sending}
              style={{
                flex: 1, resize: 'none', padding: '14px 16px', borderRadius: '14px',
                background: '#111', border: '1px solid #1f1f1f', color: '#f5f5f5',
                fontSize: '14px', outline: 'none', lineHeight: 1.5,
                fontFamily: 'inherit',
              }}
            />
            <button onClick={() => sendMessage(input)} disabled={sending || !input.trim()}
              style={{
                padding: '14px', borderRadius: '14px', background: '#F97316',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', opacity: sending || !input.trim() ? 0.4 : 1,
                flexShrink: 0,
              }}>
              <Send size={18} color="#09090B" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}