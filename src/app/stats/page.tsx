import AppShell from "@/components/layout/AppShell";

export default function StatsPage() {
  return (
    <AppShell>
      <div style={{ maxWidth: "1150px", padding: "0 32px 40px" }}>
        <div style={{ padding: "40px 0 20px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(249,115,22,0.85)", textTransform: "uppercase", marginBottom: "8px" }}>
            Coming soon
          </p>
          <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#f5f5f5", letterSpacing: "-0.5px", marginBottom: "6px" }}>
            Stats
          </h1>
          <p style={{ fontSize: "13px", color: "#52525b", marginBottom: "32px" }}>
            Phase 8 — block analytics
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            { icon: "📉", title: "VDOT progression", desc: "Track how your fitness score develops week by week across the block." },
            { icon: "🏃", title: "Pace trends", desc: "See your easy, tempo and long run paces trending over time." },
            { icon: "❤️", title: "HR zone distribution", desc: "Understand how much time you're spending in each training zone." },
            { icon: "🏆", title: "Personal bests", desc: "Your fastest times at every distance, updated automatically." },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{
              background: "#111", border: "1px solid #1a1a1a", borderRadius: "10px",
              padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: "14px",
            }}>
              <span style={{ fontSize: "20px", flexShrink: 0, marginTop: "1px" }}>{icon}</span>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#f5f5f5", marginBottom: "3px" }}>{title}</p>
                <p style={{ fontSize: "12px", color: "#52525b", lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: "24px", padding: "16px 18px",
          background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.12)",
          borderRadius: "10px",
        }}>
          <p style={{ fontSize: "12px", color: "#71717a", lineHeight: 1.5 }}>
            Full analytics are planned for Phase 8. Some stats will become available earlier once Garmin sync is live in Phase 7.
          </p>
        </div>
      </div>
    </AppShell>
  );
}