"use client";
import { useState, useRef, useEffect } from "react";
import Head from "next/head";

const BLOOMBERG_ORANGE = "#f5821f";
const FREE_LIMIT = 3;

function useLocalStorage(key, init) {
  const [val, setVal] = useState(init);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setVal(JSON.parse(stored));
    } catch {}
  }, [key]);
  const set = (v) => {
    setVal(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  };
  return [val, set];
}

const MOCK_USER = { email: "demo@narrativepulse.com", plan: "free" };

function GaugeMeter({ score }) {
  const r = 80, cx = 100, cy = 105;
  const circumference = Math.PI * r;
  const pct = Math.min(Math.max(score, 0), 100) / 100;
  const offset = circumference * (1 - pct);
  const getColor = (s) => s >= 70 ? "#22c55e" : s >= 40 ? "#f5821f" : "#ef4444";
  const color = getColor(score);
  const label = score >= 70 ? "ALIGNED" : score >= 40 ? "DIVERGENT" : "CONTRARIAN";
  return (
    <svg viewBox="0 0 200 130" style={{ width: "100%", maxWidth: 220 }}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#1f1f1f" strokeWidth="14" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" }} />
      <text x={cx} y={cy - 18} textAnchor="middle" fontFamily="'Syne', sans-serif" fontSize="46" fill={color}>{score}</text>
      <text x={cx} y={cy - 2} textAnchor="middle" fontFamily="'DM Mono', monospace" fontSize="9" fill="#555" letterSpacing="2">REALITY SCORE</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontFamily="'DM Mono', monospace" fontSize="10" fill={color} letterSpacing="3" fontWeight="500">{label}</text>
    </svg>
  );
}

function TickerBadge({ ticker }) {
  return (
    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 3, background: "#f5821f22", color: BLOOMBERG_ORANGE, border: `1px solid ${BLOOMBERG_ORANGE}44`, borderRadius: 3, padding: "2px 8px" }}>
      {ticker}
    </span>
  );
}

function Pill({ label, color }) {
  const colors = {
    green: { bg: "#22c55e18", border: "#22c55e44", text: "#22c55e" },
    red: { bg: "#ef444418", border: "#ef444444", text: "#ef4444" },
    orange: { bg: "#f5821f18", border: "#f5821f44", text: "#f5821f" },
    gray: { bg: "#ffffff0f", border: "#ffffff22", text: "#888" },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2, background: c.bg, border: `1px solid ${c.border}`, color: c.text, borderRadius: 3, padding: "2px 7px", fontWeight: 500 }}>
      {label}
    </span>
  );
}

function Scanlines() {
  return <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.025) 2px,rgba(0,0,0,0.025) 4px)" }} />;
}

export default function Dashboard() {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [reportsUsed, setReportsUsed] = useLocalStorage("np_reports_used", 0);
  const [plan] = useState(MOCK_USER.plan);
  const [activeTab, setActiveTab] = useState("report");
  const inputRef = useRef(null);
  const isPremium = plan === "premium";
  const reportsLeft = Math.max(0, FREE_LIMIT - reportsUsed);

  const runAnalysis = async () => {
    const sym = ticker.trim().toUpperCase();
    if (!sym) { setError("Enter a valid ticker."); return; }
    if (!isPremium && reportsUsed >= FREE_LIMIT) {
      setError("Free limit reached. Upgrade to Premium for unlimited reports.");
      return;
    }
    setError("");
    setReport(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: sym }),
      });
      if (!res.ok) throw new Error("API error " + res.status);
      const parsed = await res.json();
      setReport(parsed);
      setReportsUsed(reportsUsed + 1);
    } catch (e) {
      setError("Analysis failed: " + (e.message || "Check ticker and try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") runAnalysis(); };
  const sentColor = (s) => s === "BULLISH" ? "green" : s === "BEARISH" ? "red" : "gray";

  const S = {
    root: { minHeight: "100vh", background: "#080808", color: "#e8e8e8", fontFamily: "'Outfit', sans-serif", position: "relative", overflowX: "hidden" },
    topBar: { borderBottom: "1px solid #1a1a1a", padding: "0 32px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#060606", position: "sticky", top: 0, zIndex: 100 },
    logo: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: 5, color: "#fff", display: "flex", alignItems: "center", gap: 6 },
    main: { maxWidth: 1100, margin: "0 auto", padding: "32px 24px" },
    card: { background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 8, padding: 24, marginBottom: 20 },
    cardTitle: { fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 3, color: "#555", marginBottom: 16, textTransform: "uppercase", fontWeight: 400 },
    input: { background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, padding: "13px 16px", color: "#fff", fontFamily: "'DM Mono', monospace", fontSize: 22, letterSpacing: 8, textTransform: "uppercase", width: "100%", outline: "none", caretColor: BLOOMBERG_ORANGE },
    btn: (disabled) => ({ background: disabled ? "#1a1a1a" : BLOOMBERG_ORANGE, color: disabled ? "#333" : "#000", border: "none", borderRadius: 4, padding: "13px 28px", fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 2, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.2s", flexShrink: 0 }),
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
    label: { fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, color: "#555", marginBottom: 8, display: "block", fontWeight: 400 },
    val: { fontFamily: "'Outfit', sans-serif", fontSize: 20, color: "#fff", fontWeight: 600 },
    tab: (active) => ({ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 3, padding: "10px 18px", color: active ? BLOOMBERG_ORANGE : "#444", cursor: "pointer", background: "none", border: "none", borderBottom: active ? `2px solid ${BLOOMBERG_ORANGE}` : "2px solid transparent", transition: "color 0.2s" }),
    headline: { padding: "12px 0", borderBottom: "1px solid #141414", display: "flex", gap: 12, alignItems: "flex-start" },
    sentDot: (s) => ({ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 6, background: s === "positive" ? "#22c55e" : s === "negative" ? "#ef4444" : "#888" }),
    spinner: { width: 36, height: 36, border: `2px solid #1a1a1a`, borderTop: `2px solid ${BLOOMBERG_ORANGE}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  };

  return (
    <>
      <Head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap" />
      </Head>
      <div style={S.root}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
          input:focus { border-color: #f5821f66 !important; box-shadow: 0 0 0 3px #f5821f0f; }
          ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0d0d0d; }
          ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
          * { box-sizing: border-box; }
          button:hover { opacity: 0.85; }
        `}</style>
        <Scanlines />

        {/* Top Bar */}
        <div style={S.topBar}>
          <div style={S.logo}>
            <span>NARRATIVE</span>
            <span style={{ color: BLOOMBERG_ORANGE }}>PULSE</span>
            <span style={{ fontFamily: "'DM Mono'", fontSize: 9, color: "#2a2a2a", letterSpacing: 2, marginLeft: 4, fontWeight: 400 }}>◆ BETA</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {!isPremium && (
              <span style={{ fontFamily: "'DM Mono'", fontSize: 11, color: "#555" }}>
                <span style={{ color: reportsLeft === 0 ? "#ef4444" : BLOOMBERG_ORANGE, fontWeight: 500 }}>{reportsLeft}</span> / {FREE_LIMIT} FREE REPORTS
              </span>
            )}
            {isPremium && <Pill label="PREMIUM" color="orange" />}
            <span style={{ fontFamily: "'DM Mono'", fontSize: 10, color: "#2a2a2a" }}>{MOCK_USER.email}</span>
            <button style={{ fontFamily: "'Outfit'", fontWeight: 600, fontSize: 11, letterSpacing: 2, background: "none", border: "1px solid #f5821f55", color: BLOOMBERG_ORANGE, padding: "5px 14px", borderRadius: 4, cursor: "pointer" }}>
              {isPremium ? "ACCOUNT" : "UPGRADE ↑"}
            </button>
          </div>
        </div>

        <div style={S.main}>
          {/* Search Card */}
          <div style={S.card}>
            <div style={S.cardTitle}>◆ NARRATIVE ANALYSIS ENGINE</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input ref={inputRef} value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} onKeyDown={handleKey} placeholder="AAPL" maxLength={8} style={S.input} />
                <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontFamily: "'DM Mono'", fontSize: 9, color: "#333", letterSpacing: 3 }}>TICKER</span>
              </div>
              <button onClick={runAnalysis} disabled={loading || (!isPremium && reportsUsed >= FREE_LIMIT)} style={S.btn(loading || (!isPremium && reportsUsed >= FREE_LIMIT))}>
                {loading ? "SCANNING…" : "RUN ANALYSIS"}
              </button>
            </div>
            {error && <div style={{ marginTop: 12, padding: "10px 16px", background: "#ef444412", border: "1px solid #ef444433", borderRadius: 4, fontFamily: "'Outfit'", fontSize: 13, color: "#ef4444" }}>⚠ {error}</div>}
            <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["AAPL", "TSLA", "NVDA", "META", "AMZN", "MSFT"].map(t => (
                <button key={t} onClick={() => setTicker(t)} style={{ fontFamily: "'DM Mono'", fontSize: 11, letterSpacing: 2, background: ticker === t ? "#f5821f18" : "#111", border: `1px solid ${ticker === t ? "#f5821f66" : "#222"}`, color: ticker === t ? BLOOMBERG_ORANGE : "#555", padding: "5px 14px", borderRadius: 4, cursor: "pointer", transition: "all 0.15s" }}>{t}</button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ ...S.card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, gap: 16 }}>
              <div style={S.spinner} />
              <div style={{ fontFamily: "'Outfit'", fontSize: 14, color: "#555", letterSpacing: 1, fontWeight: 500 }}>FETCHING HEADLINES + FINANCIALS…</div>
              <div style={{ fontFamily: "'DM Mono'", fontSize: 11, color: "#2a2a2a", letterSpacing: 1, textAlign: "center" }}>Scanning earnings transcripts & media sentiment</div>
            </div>
          )}

          {/* Report */}
          {report && !loading && (
            <div style={{ animation: "fadeIn 0.5s ease" }}>
              {/* Header */}
              <div style={{ ...S.card, borderColor: "#222" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 38, letterSpacing: 1, color: "#fff", lineHeight: 1 }}>{report.companyName}</div>
                      <TickerBadge ticker={report.ticker} />
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                      <Pill label={`MEDIA: ${report.sentimentSignal}`} color={sentColor(report.sentimentSignal)} />
                      <Pill label={`FUNDAMENTALS: ${report.fundamentalSignal}`} color={sentColor(report.fundamentalSignal)} />
                      <Pill label={report.narrativeAlignment} color={report.narrativeAlignment === "ALIGNED" ? "green" : report.narrativeAlignment === "DIVERGENT" ? "orange" : "red"} />
                      {report.contrarian && <Pill label="⚡ CONTRARIAN SIGNAL" color="orange" />}
                    </div>
                    <div style={{ fontFamily: "'DM Mono'", fontSize: 9, color: "#333", letterSpacing: 2 }}>DATA AS OF {report.dataAsOf?.toUpperCase()} · POWERED BY CLAUDE AI</div>
                  </div>
                  <div style={{ textAlign: "center" }}><GaugeMeter score={report.realityScore} /></div>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ borderBottom: "1px solid #1a1a1a", marginBottom: 20, display: "flex", gap: 2 }}>
                {["report", "headlines", "financials", ...(isPremium ? ["contrarian"] : [])].map(t => (
                  <button key={t} style={S.tab(activeTab === t)} onClick={() => setActiveTab(t)}>{t.toUpperCase()}</button>
                ))}
                {!isPremium && <button style={{ ...S.tab(false), color: "#2a2a2a", cursor: "default" }}>🔒 CONTRARIAN</button>}
              </div>

              {/* Report Tab */}
              {activeTab === "report" && (
                <div>
                  <div style={S.grid2}>
                    <div style={S.card}>
                      <div style={S.cardTitle}>GAP ANALYSIS</div>
                      <p style={{ fontFamily: "'Outfit'", fontSize: 15, color: "#ccc", lineHeight: 1.7, margin: 0, fontWeight: 300 }}>{report.gapAnalysis}</p>
                    </div>
                    <div style={S.card}>
                      <div style={S.cardTitle}>BULL / BEAR CASES</div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontFamily: "'DM Mono'", fontSize: 9, color: "#22c55e88", letterSpacing: 3, marginBottom: 6 }}>▲ BULL CASE</div>
                        <div style={{ fontFamily: "'Outfit'", fontSize: 14, color: "#bbb", lineHeight: 1.6, fontWeight: 400 }}>{report.bullBearCase?.bull}</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'DM Mono'", fontSize: 9, color: "#ef444488", letterSpacing: 3, marginBottom: 6 }}>▼ BEAR CASE</div>
                        <div style={{ fontFamily: "'Outfit'", fontSize: 14, color: "#bbb", lineHeight: 1.6, fontWeight: 400 }}>{report.bullBearCase?.bear}</div>
                      </div>
                    </div>
                  </div>
                  <div style={S.card}>
                    <div style={S.cardTitle}>RISK FLAGS</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {report.riskFlags?.map((r, i) => (
                        <div key={i} style={{ background: "#ef444409", border: "1px solid #ef444422", borderRadius: 4, padding: "7px 14px", fontFamily: "'Outfit'", fontSize: 13, color: "#ef4444", fontWeight: 400 }}>⚠ {r}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Headlines Tab */}
              {activeTab === "headlines" && (
                <div style={S.card}>
                  <div style={S.cardTitle}>RECENT NEWS HEADLINES</div>
                  {report.headlines?.map((h, i) => (
                    <div key={i} style={S.headline}>
                      <div style={S.sentDot(h.sentiment)} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Outfit'", fontSize: 15, color: "#ddd", lineHeight: 1.5, fontWeight: 400 }}>{h.title}</div>
                        <div style={{ fontFamily: "'DM Mono'", fontSize: 10, color: "#444", marginTop: 4 }}>{h.source} · {h.sentiment?.toUpperCase()}</div>
                      </div>
                      <Pill label={h.sentiment?.toUpperCase()} color={h.sentiment === "positive" ? "green" : h.sentiment === "negative" ? "red" : "gray"} />
                    </div>
                  ))}
                </div>
              )}

              {/* Financials Tab */}
              {activeTab === "financials" && (
                <div style={S.grid2}>
                  {Object.entries(report.financialSnapshot || {}).map(([k, v]) => (
                    <div key={k} style={S.card}>
                      <div style={S.label}>{k.replace(/([A-Z])/g, " $1").trim().toUpperCase()}</div>
                      <div style={S.val}>{v || "—"}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Contrarian Tab */}
              {activeTab === "contrarian" && isPremium && (
                <div>
                  <div style={{ ...S.card, borderColor: "#f5821f33", background: "#0d0a08" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                      <span style={{ fontSize: 20 }}>⚡</span>
                      <div style={S.cardTitle}>CONTRARIAN ALERT</div>
                    </div>
                    {report.contrarianAlert
                      ? <p style={{ fontFamily: "'Outfit'", fontSize: 16, color: BLOOMBERG_ORANGE, lineHeight: 1.7, margin: 0, fontWeight: 400 }}>{report.contrarianAlert}</p>
                      : <p style={{ fontFamily: "'DM Mono'", fontSize: 12, color: "#444", margin: 0 }}>No contrarian signal detected. Narrative and fundamentals are broadly aligned.</p>
                    }
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!report && !loading && (
            <div style={{ ...S.card, textAlign: "center", padding: "80px 24px" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 64, color: "#111", letterSpacing: 4, lineHeight: 1 }}>NARRATIVE<br />PULSE</div>
              <div style={{ fontFamily: "'DM Mono'", fontSize: 11, color: "#222", letterSpacing: 3, marginTop: 20 }}>ENTER A TICKER ABOVE TO BEGIN ANALYSIS</div>
              <div style={{ marginTop: 40, display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
                {[
                  { icon: "◈", label: "Reality Score", desc: "Quantified narrative-fundamental gap" },
                  { icon: "◉", label: "Sentiment Scan", desc: "Live media headline analysis" },
                  { icon: "◆", label: "Contrarian Alerts", desc: "Premium: spot market mispricings" },
                ].map(f => (
                  <div key={f.label} style={{ maxWidth: 180, textAlign: "center" }}>
                    <div style={{ fontFamily: "'Syne'", fontWeight: 700, fontSize: 16, color: "#1e1e1e", letterSpacing: 2, marginBottom: 8 }}>{f.icon} {f.label}</div>
                    <div style={{ fontFamily: "'Outfit'", fontSize: 13, color: "#222", lineHeight: 1.6, fontWeight: 300 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Freemium Banner */}
          {!isPremium && reportsUsed >= FREE_LIMIT && (
            <div style={{ ...S.card, borderColor: "#f5821f44", background: "#0d0a08", textAlign: "center", padding: "40px 24px" }}>
              <div style={{ fontFamily: "'Syne'", fontWeight: 800, fontSize: 28, letterSpacing: 3, color: BLOOMBERG_ORANGE, marginBottom: 10 }}>FREE REPORTS EXHAUSTED</div>
              <div style={{ fontFamily: "'Outfit'", fontSize: 14, color: "#666", marginBottom: 24, fontWeight: 300 }}>Upgrade to Premium for unlimited reports + Contrarian Alert dashboard.</div>
              <button style={{ background: BLOOMBERG_ORANGE, color: "#000", border: "none", borderRadius: 4, padding: "13px 36px", fontFamily: "'Outfit'", fontSize: 14, fontWeight: 700, letterSpacing: 2, cursor: "pointer" }}>UPGRADE TO PREMIUM →</button>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 48, borderTop: "1px solid #111", paddingTop: 20, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontFamily: "'DM Mono'", fontSize: 9, color: "#1e1e1e", letterSpacing: 2 }}>NARRATIVE-PULSE © 2025 · NOT FINANCIAL ADVICE</span>
            <span style={{ fontFamily: "'DM Mono'", fontSize: 9, color: "#1e1e1e", letterSpacing: 2 }}>POWERED BY CLAUDE AI</span>
          </div>
        </div>
      </div>
    </>
  );
}
