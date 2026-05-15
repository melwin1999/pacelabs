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

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      // If a draft was created, fetch it so we can render the inline card immediately
      let draft: AdaptDraft | null = null;
      if (data.adapt_draft_id) {
        // Easiest: reload full history so message ids + draft data are correct
        await loadHistory();
        setSending(false);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          adapt_draft_id: data.adapt_draft_id ?? null,
          adapt_draft: draft,
        },
      ]);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${errorMessage}` },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div
      className="flex flex-col h-screen"
      style={{ maxWidth: '860px', margin: '0 auto', padding: '20px 24px', color: 'var(--text)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h1
          className="text-2xl sm:text-3xl font-extrabold tracking-tight"
          style={{ letterSpacing: "-0.04em" }}
        >
          Coach
        </h1>
        <Link
          href="/coach/history"
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
          }}
        >
          <History size={14} />
          History
        </Link>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {loadingHistory && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Loading conversation...
          </p>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Ask me anything about your training.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-sm px-3 py-2 rounded-lg transition"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={m.id ?? i}>
            <div
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className="max-w-[85%] px-4 py-2.5 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed"
                style={
                  m.role === "user"
                    ? { background: "var(--accent)", color: "#09090B" }
                    : {
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }
                }
              >
                {m.content}
              </div>
            </div>

            {/* Inline proposal card for assistant messages with a linked draft */}
            {m.role === "assistant" && m.adapt_draft && (
              <div className="flex justify-start mt-2">
                <div className="max-w-[85%] w-full">
                  <InlineProposalCard
                    draft={m.adapt_draft}
                    onResolved={loadHistory}
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div
              className="px-4 py-2.5 rounded-2xl text-sm"
              style={{
                background: "var(--bg-card)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="pt-3" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your coach..."
            rows={1}
            disabled={sending}
            className="flex-1 resize-none px-3 py-2 rounded-lg focus:outline-none text-sm"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={sending || !input.trim()}
            className="p-2 rounded-lg disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#09090B" }}
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}