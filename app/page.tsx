import Link from "next/link";

export default function Landing() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0f0f0f 0%, #141414 50%, #0a0a0a 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", fontFamily: "'Outfit', sans-serif",
      color: "#e8e8e8", textAlign: "center", padding: "40px 24px",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:0.4; } 50% { opacity:0.8; } }
        .hero-badge { animation: fadeUp 0.6s ease both; }
        .hero-title { animation: fadeUp 0.6s ease 0.1s both; }
        .hero-italic { animation: fadeUp 0.6s ease 0.2s both; }
        .hero-desc { animation: fadeUp 0.6s ease 0.3s both; }
        .hero-cta { animation: fadeUp 0.6s ease 0.4s both; }
        .hero-stats { animation: fadeUp 0.6s ease 0.5s both; }
        .hero-features { animation: fadeUp 0.6s ease 0.6s both; }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px #f5821f44; }
        .cta-btn { transition: all 0.2s ease; }
      `}</style>

      {/* Background glow */}
      <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, background: "radial-gradient(circle, #f5821f08 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Badge */}
      <div className="hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f5821f12", border: "1px solid #f5821f33", borderRadius: 20, padding: "6px 16px", marginBottom: 32 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f5821f", animation: "pulse 2s infinite" }} />
        <span style={{ fontFamily: "'DM Mono'", fontSize: 11, letterSpacing: 3, color: "#f5821f" }}>LIVE MARKET INTELLIGENCE</span>
      </div>

      {/* Logo */}
      <div className="hero-title" style={{ fontFamily: "'Syne'", fontWeight: 800, fontSize: "clamp(36px, 8vw, 72px)", letterSpacing: 4, marginBottom: 8, lineHeight: 1 }}>
        NARRATIVE<span style={{ color: "#f5821f" }}>PULSE</span>
      </div>

      {/* Tagline */}
      <div className="hero-title" style={{ fontFamily: "'Outfit'", fontWeight: 700, fontSize: "clamp(20px, 4vw, 32px)", color: "#fff", marginBottom: 16, letterSpacing: 1 }}>
        Does the story match the numbers?
      </div>

      {/* Italic hook line */}
      <div className="hero-italic" style={{ fontFamily: "'Outfit'", fontStyle: "italic", fontWeight: 300, fontSize: "clamp(14px, 2.5vw, 20px)", color: "#f5821f", marginBottom: 28, letterSpacing: 0.5 }}>
        "The market is a machine for transferring money from the impatient to the patient — we show you who's being played."
      </div>

      {/* Description */}
      <p className="hero-desc" style={{ fontFamily: "'Outfit'", fontWeight: 300, fontSize: "clamp(14px, 2vw, 17px)", color: "#888", maxWidth: 560, lineHeight: 1.8, marginBottom: 40 }}>
        We scan live news headlines and real earnings data for any stock ticker, then use AI to score how well the media narrative matches the financial reality — exposing hype, fear, and hidden opportunity.
      </p>

      {/* CTA */}
      <div className="hero-cta" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 48 }}>
        <Link href="/dashboard" className="cta-btn" style={{
          background: "#f5821f", color: "#000", padding: "15px 40px",
          borderRadius: 6, fontFamily: "'Outfit'", fontWeight: 700,
          fontSize: 15, letterSpacing: 2, textDecoration: "none", display: "inline-block"
        }}>
          START ANALYSIS →
        </Link>
        <Link href="/dashboard" style={{
          background: "transparent", color: "#666", padding: "15px 32px",
          borderRadius: 6, fontFamily: "'Outfit'", fontWeight: 400,
          fontSize: 15, letterSpacing: 1, textDecoration: "none", display: "inline-block",
          border: "1px solid #222"
        }}>
          See how it works
        </Link>
      </div>

      {/* Free badge */}
      <p className="hero-cta" style={{ fontFamily: "'DM Mono'", fontSize: 10, color: "#333", letterSpacing: 3, marginBottom: 56 }}>
        5 FREE REPORTS/MONTH · NO CREDIT CARD · LIVE DATA
      </p>

      {/* Stats row */}
      <div className="hero-stats" style={{ display: "flex", gap: 48, flexWrap: "wrap", justifyContent: "center", marginBottom: 56, borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a", padding: "28px 0", width: "100%", maxWidth: 700 }}>
        {[
          { val: "0–100", label: "Reality Score" },
          { val: "Live", label: "News Data" },
          { val: "AI", label: "Gap Analysis" },
          { val: "Free", label: "To Start" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Syne'", fontWeight: 800, fontSize: 28, color: "#f5821f", letterSpacing: 2 }}>{s.val}</div>
            <div style={{ fontFamily: "'DM Mono'", fontSize: 10, color: "#444", letterSpacing: 3, marginTop: 4 }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="hero-features" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, maxWidth: 760, width: "100%" }}>
        {[
          { icon: "◈", title: "Reality Score", desc: "0–100 score quantifying the gap between what media says and what financials show." },
          { icon: "◉", title: "Live Headlines", desc: "Real news from today, sentiment-classified and cross-referenced against earnings data." },
          { icon: "⚡", title: "Contrarian Alerts", desc: "When the crowd is wrong, we flag it. Spot mispricings before the market corrects." },
          { icon: "◆", title: "Smart Financials", desc: "Revenue, EPS, insider trades, analyst targets, and options sentiment in one view." },
          { icon: "🏛️", title: "Insider Intelligence", desc: "Track what executives and institutions are actually buying and selling — not what they say." },
          { icon: "🎯", title: "Analyst Gap", desc: "See where Wall Street price targets diverge from reality and what that historically means." },   
        ].map(f => (
          <div key={f.title} style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 8, padding: "20px 20px", textAlign: "left" }}>
            <div style={{ fontFamily: "'Syne'", fontSize: 20, color: "#f5821f", marginBottom: 8 }}>{f.icon} {f.title}</div>
            <div style={{ fontFamily: "'Outfit'", fontSize: 13, color: "#555", lineHeight: 1.6, fontWeight: 300 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 56, fontFamily: "'DM Mono'", fontSize: 9, color: "#222", letterSpacing: 2 }}>
        NARRATIVE-PULSE © 2026 · NOT FINANCIAL ADVICE · POWERED BY CLAUDE AI
      </div>
    </main>
  );
}
