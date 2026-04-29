import Link from "next/link";

export default function Landing() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0f0f0f 0%, #141414 50%, #0a0a0a 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", fontFamily: "'Outfit', sans-serif",
      color: "#e8e8e8", textAlign: "center",
      padding: "40px 20px",
      overflow: "hidden",
      width: "100%",
      maxWidth: "100vw",
      position: "relative", 
      boxSizing: "border-box",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:0.4; } 50% { opacity:0.8; } }
        .np-badge { animation: fadeUp 0.6s ease both; }
        .np-logo { animation: fadeUp 0.6s ease 0.1s both; }
        .np-italic { animation: fadeUp 0.6s ease 0.2s both; }
        .np-desc { animation: fadeUp 0.6s ease 0.3s both; }
        .np-cta { animation: fadeUp 0.6s ease 0.4s both; }
        .np-stats { animation: fadeUp 0.6s ease 0.5s both; }
        .np-grid { animation: fadeUp 0.6s ease 0.6s both; }
        .np-start:hover { transform: translateY(-2px); box-shadow: 0 8px 32px #f5821f44; }
        .np-start { transition: all 0.2s ease; display: inline-block; }
        .np-secondary { transition: all 0.2s ease; display: inline-block; }
        .np-secondary:hover { border-color: #444 !important; color: #888 !important; }
        .np-feature:hover { border-color: #f5821f33 !important; background: #111318 !important; }
        .np-feature { transition: all 0.2s ease; }

        /* Logo */
        .np-logo-text {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          letter-spacing: 1px;
          line-height: 1;
          font-size: 6vw;
          white-space: nowrap;
          max-width: 100%;
          margin-bottom: 10px;
        }
        @media (min-width: 400px) {
            .np-logo-text { font-size: 7vw; }
        }
        @media (min-width: 600px) {
            .np-logo-text { font-size: 8vw; letter-spacing: 3px; }
        }
        @media (min-width: 900px) {
            .np-logo-text { font-size: 72px; letter-spacing: 4px; }
        }

        /* Tagline */
        .np-tagline {
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: clamp(16px, 4vw, 30px);
          color: #fff;
          margin-bottom: 16px;
          letter-spacing: 0.3px;
        }

        /* Italic */
        .np-hook {
          font-family: 'Outfit', sans-serif;
          font-style: italic;
          font-weight: 300;
          font-size: clamp(12px, 3vw, 18px);
          color: #f5821f;
          margin-bottom: 24px;
          max-width: 560px;
          line-height: 1.6;
        }

        /* Description */
        .np-body {
          font-family: 'Outfit', sans-serif;
          font-weight: 300;
          font-size: clamp(13px, 2.5vw, 16px);
          color: #777;
          max-width: 520px;
          line-height: 1.85;
          margin: 0 auto 36px;
        }

        /* CTA row */
        .np-cta-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          margin-bottom: 14px;
          width: 100%;
          max-width: 480px;
        }
        .np-start {
          background: #f5821f;
          color: #000;
          padding: 14px 36px;
          border-radius: 6px;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 2px;
          text-decoration: none;
          flex: 1;
          min-width: 180px;
          text-align: center;
        }
        .np-secondary {
          background: transparent;
          color: #555;
          padding: 14px 24px;
          border-radius: 6px;
          font-family: 'Outfit', sans-serif;
          font-weight: 400;
          font-size: 14px;
          letter-spacing: 1px;
          text-decoration: none;
          border: 1px solid #222;
          flex: 1;
          min-width: 140px;
          text-align: center;
        }

        /* Free note */
        .np-free {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #2a2a2a;
          letter-spacing: 2px;
          margin-bottom: 48px;
        }

        /* Stats */
        .np-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          width: 100%;
          max-width: 680px;
          border-top: 1px solid #1a1a1a;
          border-bottom: 1px solid #1a1a1a;
          padding: 24px 0;
          margin-bottom: 48px;
          gap: 0;
        }
        @media (max-width: 480px) {
          .np-stats-row {
            grid-template-columns: repeat(2, 1fr);
            gap: 0;
          }
          .np-stat-item {
            padding: 12px 8px !important;
            border-right: none !important;
          }
          .np-stat-item:nth-child(odd) {
            border-right: 1px solid #1a1a1a !important;
          }
          .np-stat-item:nth-child(1),
          .np-stat-item:nth-child(2) {
            border-bottom: 1px solid #1a1a1a;
          }
        }
        .np-stat-item {
          text-align: center;
          padding: 0 16px;
          border-right: 1px solid #1a1a1a;
        }
        .np-stat-item:last-child { border-right: none; }
        .np-stat-val {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: clamp(20px, 5vw, 28px);
          color: #f5821f;
          letter-spacing: 2px;
        }
        .np-stat-label {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          color: #333;
          letter-spacing: 2px;
          margin-top: 6px;
        }

        /* Feature grid */
        .np-feature-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          max-width: 860px;
          width: 100%;
          margin-bottom: 48px;
        }
        @media (max-width: 700px) {
          .np-feature-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 440px) {
          .np-feature-grid {
            grid-template-columns: 1fr;
          }
        }

        .np-feature {
          background: #0d0d0d;
          border: 1px solid #1e1e1e;
          border-radius: 10px;
          padding: 20px 18px;
          text-align: left;
        }
        .np-feature-title {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 15px;
          color: #f5821f;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .np-feature-desc {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          color: #555;
          line-height: 1.65;
          font-weight: 300;
        }

        /* Footer */
        .np-footer {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          color: #1e1e1e;
          letter-spacing: 2px;
        }
      `}</style>

      {/* Background glow */}
      <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: "min(700px, 100vw)", height: "min(700px, 100vw)", background: "radial-gradient(circle, #f5821f05 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Live badge */}
      <div className="np-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f5821f12", border: "1px solid #f5821f33", borderRadius: 20, padding: "6px 16px", marginBottom: 28 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f5821f", animation: "pulse 2s infinite", flexShrink: 0 }} />
        <span style={{ fontFamily: "'DM Mono'", fontSize: 10, letterSpacing: 3, color: "#f5821f" }}>LIVE MARKET INTELLIGENCE</span>
      </div>

      {/* Logo */}
      <div className="np-logo np-logo-text">
        NARRATIVE<span style={{ color: "#f5821f" }}>PULSE</span>
      </div>

      {/* Tagline */}
      <div className="np-logo np-tagline">Does the story match the numbers?</div>

      {/* Italic hook */}
      <div className="np-italic np-hook">
        &ldquo;The market transfers money from the impatient to the patient — we show you who&apos;s being played.&rdquo;
      </div>

      {/* Description */}
      <p className="np-desc np-body">
        We scan live news headlines and real earnings data for any stock ticker, then use AI to score how well the media narrative matches the financial reality — exposing hype, fear, and hidden opportunity.
      </p>

      {/* CTA */}
      <div className="np-cta np-cta-row">
        <Link href="/dashboard" className="np-start">START ANALYSIS →</Link>
        <Link href="/dashboard" className="np-secondary">See how it works</Link>
      </div>
      <p className="np-cta np-free">5 FREE REPORTS / MONTH · NO CREDIT CARD · LIVE DATA</p>

      {/* Stats */}
      <div className="np-stats np-stats-row">
        {[
          { val: "0–100", label: "REALITY SCORE" },
          { val: "Live", label: "NEWS DATA" },
          { val: "AI", label: "GAP ANALYSIS" },
          { val: "Free", label: "TO START" },
        ].map((s) => (
          <div key={s.label} className="np-stat-item">
            <div className="np-stat-val">{s.val}</div>
            <div className="np-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Feature grid */}
      <div className="np-grid np-feature-grid">
        {[
          { icon: "◈", title: "Reality Score", desc: "0–100 score quantifying the gap between what media says and what financials actually show." },
          { icon: "◉", title: "Live Headlines", desc: "Real news from today, sentiment-classified and cross-referenced against earnings data." },
          { icon: "⚡", title: "Contrarian Alerts", desc: "When the crowd is wrong, we flag it. Spot mispricings before the market corrects itself." },
          { icon: "◆", title: "Smart Financials", desc: "Revenue, EPS, gross margins, P/E ratio, 52-week range and earnings dates in one clean view." },
          { icon: "🏛️", title: "Insider Intelligence", desc: "Track what executives and institutions are actually buying and selling — not what they say." },
          { icon: "🗣️", title: "Plain English", desc: "Every report translated into jargon-free language so anyone can understand the bottom line." },
        ].map((f) => (
          <div key={f.title} className="np-feature">
            <div className="np-feature-title"><span>{f.icon}</span> {f.title}</div>
            <div className="np-feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="np-footer">NARRATIVE-PULSE © 2026 · NOT FINANCIAL ADVICE · POWERED BY CLAUDE AI</div>
    </main>
  );
}
