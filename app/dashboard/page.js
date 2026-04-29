"use client";
import { useState, useRef, useEffect } from "react";
import Head from "next/head";

const ORANGE = "#f5821f";
const FREE_LIMIT = 5;

// ── Softer dark palette ───────────────────────────────────────────────────
const C = {
  bg: "#111318",
  bgCard: "#181c24",
  bgCardHover: "#1e2330",
  border: "#252a36",
  borderLight: "#2e3545",
  text: "#d4d8e2",
  textMuted: "#7a8299",
  textDim: "#3d4459",
  orange: "#f5821f",
  green: "#34d399",
  red: "#f87171",
};

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

const MOCK_USER = { email: "demo@narrativepulse.com", plan: "premium" };

function GaugeMeter({ score }) {
  const r = 78, cx = 100, cy = 105;
  const circumference = Math.PI * r;
  const pct = Math.min(Math.max(score, 0), 100) / 100;
  const offset = circumference * (1 - pct);
  const color = score >= 70 ? C.green : score >= 40 ? C.orange : C.red;
  const label = score >= 70 ? "ALIGNED" : score >= 40 ? "DIVERGENT" : "CONTRARIAN";
  return (
    <svg viewBox="0 0 200 130" style={{ width: "100%", maxWidth: 220 }}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={C.border} strokeWidth="12" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.34,1.56,0.64,1)", filter: `drop-shadow(0 0 8px ${color}66)` }} />
      <text x={cx} y={cy - 16} textAnchor="middle" fontFamily="'Syne'" fontSize="48" fontWeight="800" fill={color}>{score}</text>
      <text x={cx} y={cy - 1} textAnchor="middle" fontFamily="'DM Mono'" fontSize="8" fill={C.textDim} letterSpacing="2">REALITY SCORE</text>
      <text x={cx} y={cy + 15} textAnchor="middle" fontFamily="'DM Mono'" fontSize="10" fill={color} letterSpacing="3" fontWeight="500">{label}</text>
    </svg>
  );
}

function Pill({ label, color }) {
  const map = {
    green: { bg: `${C.green}18`, border: `${C.green}44`, text: C.green },
    red: { bg: `${C.red}18`, border: `${C.red}44`, text: C.red },
    orange: { bg: `${C.orange}18`, border: `${C.orange}44`, text: C.orange },
    gray: { bg: "#ffffff08", border: C.border, text: C.textMuted },
  };
  const s = map[color] || map.gray;
  return (
    <span style={{ fontFamily: "'DM Mono'", fontSize: 10, letterSpacing: 2, background: s.bg, border: `1px solid ${s.border}`, color: s.text, borderRadius: 4, padding: "3px 8px", fontWeight: 500 }}>
      {label}
    </span>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 20px" }}>
      <div style={{ fontFamily: "'DM Mono'", fontSize: 9, letterSpacing: 3, color: C.textDim, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Syne'", fontSize: 22, fontWeight: 800, color: color || C.text }}>{value}</div>
      {sub && <div style={{ fontFamily: "'DM Mono'", fontSize: 10, color: C.textMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SignalCard({ icon, title, value, detail, color }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontFamily: "'DM Mono'", fontSize: 9, letterSpacing: 3, color: C.textDim }}>{title}</span>
      </div>
      <div style={{ fontFamily: "'Syne'", fontSize: 16, fontWeight: 700, color: color || C.orange }}>{value}</div>
      <div style={{ fontFamily: "'Outfit'", fontSize: 13, color: C.textMuted, lineHeight: 1.5, fontWeight: 300 }}>{detail}</div>
    </div>
  );
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
    setError(""); setReport(null); setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: sym }),
      });
      if (!res.ok) throw new Error("API error " + res.status);
      const parsed = await res.json();
      setReport(parsed);
      if (!isPremium) setReportsUsed(reportsUsed + 1);
    } catch (e) {
      setError("Analysis failed: " + (e.message || "Check ticker and try again."));
    } finally { setLoading(false); }
  };

  const handleKey = (e) => { if (e.key === "Enter") runAnalysis(); };
  const sentColor = (s) => {
    if (!s) return "gray";
    const sl = s.toLowerCase();
    if (sl.includes("bull") || sl.includes("positive")) return "green";
    if (sl.includes("bear") || sl.includes("negative")) return "red";
    return "gray";
  };

  const tabs = ["report", "headlines", "financials", "intelligence", "contrarian"];

  return (
    <>
      <Head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap" />
      </Head>
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Outfit', sans-serif", position: "relative" }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
          input:focus { border-color: ${C.orange}66 !important; box-shadow: 0 0 0 3px ${C.orange}0f; }
          * { box-sizing: border-box; }
          button { transition: all 0.15s; }
          button:hover { opacity: 0.85; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: ${C.bgCard}; }
          ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
        `}</style>

        {/* Top Bar */}
        <div style={{ borderBottom: `1px solid ${C.border}`, padding: "0 28px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0d1017", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ fontFamily: "'Syne'", fontWeight: 800, fontSize: 19, letterSpacing: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: C.text }}>NARRATIVE</span>
            <span style={{ color: C.orange }}>PULSE</span>
            <span style={{ fontFamily: "'DM Mono'", fontSize: 8, color: C.textDim, letterSpacing: 2, marginLeft: 4 }}>◆ BETA</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {!isPremium && (
              <span style={{ fontFamily: "'DM Mono'", fontSize: 11, color: C.textMuted }}>
                <span style={{ color: reportsLeft === 0 ? C.red : C.orange, fontWeight: 500 }}>{reportsLeft}</span> / {FREE_LIMIT} FREE
              </span>
            )}
            {isPremium && <Pill label="PREMIUM" color="orange" />}
            <span style={{ fontFamily: "'DM Mono'", fontSize: 10, color: C.textDim }}>{MOCK_USER.email}</span>
            <button style={{ fontFamily: "'Outfit'", fontWeight: 600, fontSize: 11, letterSpacing: 1, background: "none", border: `1px solid ${C.orange}44`, color: C.orange, padding: "5px 14px", borderRadius: 4, cursor: "pointer" }}>
              {isPremium ? "ACCOUNT" : "UPGRADE ↑"}
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 20px" }}>

          {/* Search */}
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "22px 24px", marginBottom: 20 }}>
            <div style={{ fontFamily: "'DM Mono'", fontSize: 9, letterSpacing: 3, color: C.textDim, marginBottom: 14 }}>◆ NARRATIVE ANALYSIS ENGINE</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input ref={inputRef} value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} onKeyDown={handleKey} placeholder="AAPL" maxLength={8}
                  style={{ background: "#0d1017", border: `1px solid ${C.border}`, borderRadius: 6, padding: "13px 16px", color: "#fff", fontFamily: "'DM Mono'", fontSize: 22, letterSpacing: 8, textTransform: "uppercase", width: "100%", outline: "none", caretColor: C.orange }} />
                <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontFamily: "'DM Mono'", fontSize: 9, color: C.textDim, letterSpacing: 3 }}>TICKER</span>
              </div>
              <button onClick={runAnalysis} disabled={loading || (!isPremium && reportsUsed >= FREE_LIMIT)}
                style={{ background: loading || (!isPremium && reportsUsed >= FREE_LIMIT) ? C.border : C.orange, color: loading ? C.textMuted : "#000", border: "none", borderRadius: 6, padding: "13px 28px", fontFamily: "'Outfit'", fontSize: 13, fontWeight: 700, letterSpacing: 2, cursor: "pointer", flexShrink: 0 }}>
                {loading ? "SCANNING…" : "RUN ANALYSIS"}
              </button>
            </div>
            {error && <div style={{ marginTop: 12, padding: "10px 16px", background: `${C.red}12`, border: `1px solid ${C.red}33`, borderRadius: 6, fontFamily: "'Outfit'", fontSize: 13, color: C.red }}>⚠ {error}</div>}
            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["AAPL", "TSLA", "NVDA", "META", "AMZN", "MSFT"].map(t => (
                <button key={t} onClick={() => setTicker(t)}
                  style={{ fontFamily: "'DM Mono'", fontSize: 10, letterSpacing: 2, background: ticker === t ? `${C.orange}18` : "#0d1017", border: `1px solid ${ticker === t ? C.orange + "66" : C.border}`, color: ticker === t ? C.orange : C.textMuted, padding: "5px 14px", borderRadius: 4, cursor: "pointer" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "60px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.orange}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <div style={{ fontFamily: "'Outfit'", fontSize: 14, color: C.textMuted, fontWeight: 500 }}>SCANNING LIVE MARKET DATA…</div>
              <div style={{ fontFamily: "'DM Mono'", fontSize: 10, color: C.textDim, textAlign: "center" }}>Headlines · Financials · Insider Trades · Analyst Ratings</div>
            </div>
          )}

          {/* Report */}
          {report && !loading && (
            <div style={{ animation: "fadeIn 0.4s ease" }}>

              {/* Header card */}
              <div style={{ background: C.bgCard, border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: "24px 28px", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ fontFamily: "'Syne'", fontWeight: 800, fontSize: 38, color: "#fff", lineHeight: 1 }}>{report.companyName}</div>
                      <span style={{ fontFamily: "'DM Mono'", fontSize: 11, letterSpacing: 3, background: `${C.orange}18`, color: C.orange, border: `1px solid ${C.orange}44`, borderRadius: 4, padding: "3px 9px" }}>{report.ticker}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                      <Pill label={`MEDIA: ${report.sentimentSignal}`} color={sentColor(report.sentimentSignal)} />
                      <Pill label={`FUNDAMENTALS: ${report.fundamentalSignal}`} color={sentColor(report.fundamentalSignal)} />
                      <Pill label={report.narrativeAlignment || "DIVERGENT"} color={report.narrativeAlignment === "ALIGNED" ? "green" : report.narrativeAlignment === "CONTRARIAN" ? "red" : "orange"} />VERGE") ? "orange" : "red"} />
                      {report.contrarian && <Pill label="⚡ CONTRARIAN SIGNAL" color="orange" />}
                    </div>
                    <div style={{ fontFamily: "'DM Mono'", fontSize: 9, color: C.textDim, letterSpacing: 2 }}>DATA AS OF {report.dataAsOf} · POWERED BY CLAUDE AI</div>
                  </div>
                  <GaugeMeter score={report.realityScore} />
                </div>
              </div>

              {/* Tabs */}
              <div style={{ borderBottom: `1px solid ${C.border}`, marginBottom: 20, display: "flex", gap: 0, overflowX: "auto" }}>
                {tabs.map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} style={{
                    fontFamily: "'DM Mono'", fontSize: 10, letterSpacing: 3, padding: "10px 18px",
                    color: activeTab === t ? C.orange : C.textMuted, background: "none", border: "none",
                    borderBottom: activeTab === t ? `2px solid ${C.orange}` : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap",
                  }}>{t.toUpperCase()}</button>
                ))}
              </div>

              {/* ── REPORT TAB ── */}
              {activeTab === "report" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: 22 }}>
                      <div style={{ fontFamily: "'DM Mono'", fontSize: 9, letterSpacing: 3, color: C.textDim, marginBottom: 12 }}>GAP ANALYSIS</div>
                      <p style={{ fontFamily: "'Outfit'", fontSize: 15, color: C.text, lineHeight: 1.7, margin: 0, fontWeight: 300 }}>{report.gapAnalysis}</p>
                    </div>
                    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: 22 }}>
                      <div style={{ fontFamily: "'DM Mono'", fontSize: 9, letterSpacing: 3, color: C.textDim, marginBottom: 12 }}>BULL / BEAR CASES</div>
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontFamily: "'DM Mono'", fontSize: 9, color: `${C.green}99`, letterSpacing: 3, marginBottom: 6 }}>▲ BULL</div>
                        <div style={{ fontFamily: "'Outfit'", fontSize: 14, color: C.text, lineHeight: 1.6, fontWeight: 300 }}>{report.bullBearCase?.bull}</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'DM Mono'", fontSize: 9, color: `${C.red}99`, letterSpacing: 3, marginBottom: 6 }}>▼ BEAR</div>
                        <div style={{ fontFamily: "'Outfit'", fontSize: 14, color: C.text, lineHeight: 1.6, fontWeight: 300 }}>{report.bullBearCase?.bear}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: 22 }}>
                    <div style={{ fontFamily: "'DM Mono'", fontSize: 9, letterSpacing: 3, color: C.textDim, marginBottom: 14 }}>RISK FLAGS</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {report.riskFlags?.map((r, i) => (
                        <div key={i} style={{ background: `${C.red}0a`, border: `1px solid ${C.red}22`, borderRadius: 6, padding: "8px 14px", fontFamily: "'Outfit'", fontSize: 13, color: C.red, fontWeight: 400 }}>⚠ {r}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── HEADLINES TAB ── */}
              {activeTab === "headlines" && (
                <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: 22 }}>
                  <div style={{ fontFamily: "'DM Mono'", fontSize: 9, letterSpacing: 3, color: C.textDim, marginBottom: 16 }}>RECENT NEWS HEADLINES</div>
                  {report.headlines?.map((h, i) => (
                    <div key={i} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 6, background: h.sentiment === "positive" ? C.green : h.sentiment === "negative" ? C.red : C.textMuted }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Outfit'", fontSize: 14, color: C.text, lineHeight: 1.5, fontWeight: 400 }}>{h.title}</div>
                        <div style={{ fontFamily: "'DM Mono'", fontSize: 10, color: C.textDim, marginTop: 4 }}>{h.source} · {h.publishedAt} · {h.sentiment?.toUpperCase()}</div>
                      </div>
                      <Pill label={h.sentiment?.toUpperCase()} color={h.sentiment === "positive" ? "green" : h.sentiment === "negative" ? "red" : "gray"} />
                    </div>
                  ))}
                </div>
              )}

              {/* ── FINANCIALS TAB ── */}
              {activeTab === "financials" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                  {Object.entries(report.financialSnapshot || {}).map(([k, v]) => (
                    <StatCard key={k} label={k.replace(/([A-Z])/g, " $1").trim().toUpperCase()} value={v || "—"} />
                  ))}
                </div>
              )}

              {/* ── INTELLIGENCE TAB ── */}
              {activeTab === "intelligence" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <SignalCard
                      icon="🏛️" title="INSIDER TRADING SIGNAL"
                      value={report.insiderRaw?.signal || "N/A"}
                      detail={report.insiderSignal || "No insider data available."}
                      color={report.insiderRaw?.signal === "BULLISH" ? C.green : report.insiderRaw?.signal === "BEARISH" ? C.red : C.orange}
                    />
                    <SignalCard
                      icon="🎯" title="ANALYST CONSENSUS"
                      value={report.analystRaw?.consensus ? `${report.analystRaw.consensus} (${(report.analystRaw.strongBuy || 0) + (report.analystRaw.buy || 0)} buys / ${(report.analystRaw.sell || 0) + (report.analystRaw.strongSell || 0)} sells)` : "N/A"}
                      detail={report.analystConsensus || "No analyst data available."}
                      color={report.analystRaw?.consensus === "BUY" ? C.green : C.red}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <SignalCard
                      icon="🐋" title="SMART MONEY (INSTITUTIONS)"
                      value={report.institutionalRaw?.totalInstitutional || "N/A"}
                      detail={report.smartMoneySignal || "No institutional data available."}
                      color={C.orange}
                    />
                    <SignalCard
                      icon="📊" title="OPTIONS SENTIMENT"
                      value="MARKET POSITIONING"
                      detail={report.optionsSentiment || "No options data available."}
                      color={C.orange}
                    />
                  </div>
                  {/* Top institutional holders */}
                  {report.institutionalRaw?.topHolders?.length > 0 && (
                    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: 22 }}>
                      <div style={{ fontFamily: "'DM Mono'", fontSize: 9, letterSpacing: 3, color: C.textDim, marginBottom: 14 }}>TOP INSTITUTIONAL HOLDERS</div>
                      {report.institutionalRaw.topHolders.map((h, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ fontFamily: "'Outfit'", fontSize: 14, color: C.text, fontWeight: 400 }}>{h.name}</div>
                          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                            <span style={{ fontFamily: "'DM Mono'", fontSize: 12, color: C.textMuted }}>{h.shares}</span>
                            <span style={{ fontFamily: "'DM Mono'", fontSize: 11, color: h.change?.startsWith("+") ? C.green : C.red }}>{h.change}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── CONTRARIAN TAB ── */}
              {activeTab === "contrarian" && (
                <div>
                  <div style={{ background: C.bgCard, border: `1px solid ${C.orange}33`, borderRadius: 8, padding: 24, marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: 22 }}>⚡</span>
                      <div style={{ fontFamily: "'DM Mono'", fontSize: 9, letterSpacing: 3, color: C.textDim }}>CONTRARIAN ALERT</div>
                    </div>
                    {report.contrarianAlert
                      ? <p style={{ fontFamily: "'Outfit'", fontSize: 16, color: C.orange, lineHeight: 1.7, margin: 0, fontWeight: 400 }}>{report.contrarianAlert}</p>
                      : <p style={{ fontFamily: "'DM Mono'", fontSize: 12, color: C.textDim, margin: 0 }}>No contrarian signal detected. Narrative and fundamentals are broadly aligned.</p>
                    }
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                    {[
                      { label: "Media Sentiment", value: report.sentimentSignal },
                      { label: "Fundamental Signal", value: report.fundamentalSignal },
                      { label: "Alignment", value: report.narrativeAlignment || "DIVERGENT" },tiveAlignment },
                    ].map(item => (
                      <StatCard key={item.label} label={item.label.toUpperCase()} value={item.value || "—"} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!report && !loading && (
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "80px 24px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Syne'", fontWeight: 800, fontSize: 64, color: C.border, letterSpacing: 4, lineHeight: 1 }}>NARRATIVE<br />PULSE</div>
              <div style={{ fontFamily: "'DM Mono'", fontSize: 10, color: C.textDim, letterSpacing: 3, marginTop: 20, marginBottom: 40 }}>ENTER A TICKER ABOVE TO BEGIN ANALYSIS</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
                {[
                  { icon: "◈", label: "Reality Score", desc: "0–100 narrative gap score" },
                  { icon: "◉", label: "Live Headlines", desc: "Real-time sentiment analysis" },
                  { icon: "🏛️", label: "Insider Trades", desc: "Smart money tracking" },
                  { icon: "⚡", label: "Contrarian Alerts", desc: "Spot market mispricings" },
                ].map(f => (
                  <div key={f.label} style={{ maxWidth: 160, textAlign: "center" }}>
                    <div style={{ fontFamily: "'Syne'", fontWeight: 700, fontSize: 14, color: C.textDim, letterSpacing: 2, marginBottom: 6 }}>{f.icon} {f.label}</div>
                    <div style={{ fontFamily: "'Outfit'", fontSize: 12, color: C.textDim, lineHeight: 1.5, fontWeight: 300 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Freemium banner */}
          {!isPremium && reportsUsed >= FREE_LIMIT && (
            <div style={{ background: C.bgCard, border: `1px solid ${C.orange}44`, borderRadius: 10, padding: "36px 24px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Syne'", fontWeight: 800, fontSize: 26, letterSpacing: 3, color: C.orange, marginBottom: 10 }}>FREE REPORTS EXHAUSTED</div>
              <div style={{ fontFamily: "'Outfit'", fontSize: 14, color: C.textMuted, marginBottom: 24, fontWeight: 300 }}>Upgrade to Premium for unlimited reports + full Intelligence dashboard.</div>
              <button style={{ background: C.orange, color: "#000", border: "none", borderRadius: 6, padding: "13px 36px", fontFamily: "'Outfit'", fontSize: 14, fontWeight: 700, letterSpacing: 2, cursor: "pointer" }}>UPGRADE TO PREMIUM →</button>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 48, borderTop: `1px solid ${C.border}`, paddingTop: 20, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontFamily: "'DM Mono'", fontSize: 9, color: C.textDim, letterSpacing: 2 }}>NARRATIVE-PULSE © 2026 · NOT FINANCIAL ADVICE</span>
            <span style={{ fontFamily: "'DM Mono'", fontSize: 9, color: C.textDim, letterSpacing: 2 }}>POWERED BY CLAUDE AI</span>
          </div>
        </div>
      </div>
    </>
  );
}