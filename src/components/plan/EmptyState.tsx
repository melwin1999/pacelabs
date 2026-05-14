import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{
          background: "linear-gradient(135deg, var(--accent), #FB923C)",
        }}
      >
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      <h1
        className="text-3xl mb-3"
        style={{ color: "var(--text)", fontWeight: 800, letterSpacing: "-0.04em" }}
      >
        No active plan
      </h1>
      <p className="text-base mb-8 max-w-sm" style={{ color: "var(--text-muted)" }}>
        Let Claude build you a training block — marathon, half, 10k, 5k, or base building.
      </p>
      <Link
        href="/plan/new"
        className="px-6 py-3 rounded-xl text-base font-semibold transition-opacity hover:opacity-90"
        style={{
          background: "var(--accent)",
          color: "#fff",
        }}
      >
        Create your first plan →
      </Link>
    </div>
  );
}