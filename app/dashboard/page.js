"use client";
import { useState, useRef, useEffect } from "react";

const ORANGE = "#f5821f";
const FREE_LIMIT = 5;

const C = {
  bg: "#111318",
  bgCard: "#181c24",
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
    <svg viewBox="0 0 200 130" style={{ width: "100%", maxWidth: 200 }}>
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
    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1, background: s.bg, border: `1px solid ${s.border}`, color: s.text, borderRadius: 4, padding: "3px 7px", fontWeight: 500, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function PlainEnglishCard({ report }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const fetchExplain = async () => {
    if (text) { setOpen(!open); return; }
    setOpen(true); setLoading(true); setError("");
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setText(data.explanation);
    } catch (e) {
      setError("Could not generate explanation. Try again.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={fetchExplain} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        background: open ? "#1a1f2e" : "linear-gradient(135deg,#1a1f2e,#1e2535)",
        border: `1px solid ${open ? C.orange + "66" : C.borderLight}`,
        borderRadius: 8, padding: "13px 20px", cursor: "pointer",
        fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600,
        color: open ? C.orange : C.text, letterSpacing: 0.5, transition: "all 0.2s",
        boxShadow: open ? `0 0 20px ${C.orange}18` : "none",
      }}>
        <span style={{ fontSize: 18 }}>🗣️</span>
        {open && text ? "Hide Plain English Summary" : "Explain This In Plain English"}
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textMuted, marginLeft: 4 }}>{open && text ? "↑" : "→"}</span>
      </button>

      {open && (
        <div style={{
          marginTop: 10, background: "linear-gradient(135deg,#16191f,#1a1e28)",
          border: `1px solid ${C.orange}33`, borderRadius: 10, padding: "24px 20px",
          animation: "fadeIn 0.3s ease", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, background: `radial-gradient(circle,${C.orange}08,transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <span style={{ fontSize: 20 }}>🗣️</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, color: C.text }}>Plain English Summary</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.textDim, letterSpacing: 2, marginTop: 2 }}>{report.ticker} · {report.dataAsOf}</div>
            </div>
            <Pill label={`SCORE: ${report.realityScore}`} color={report.realityScore >= 70 ? "green" : report.realityScore >= 40 ? "orange" : "red"} />
          </div>

          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0" }}>
              <div style={{ width: 22, height: 22, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.orange}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, color: C.textMuted, fontWeight: 300 }}>Translating to plain English…</div>
            </div>
          )}
          {error && <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: C.red }}>{error}</div>}
          {text && !loading && text.split("\n\n").filter(p => p.trim()).map((para, i, arr) => (
            <p key={i} style={{
              fontFamily: "'Outfit', sans-serif", fontSize: 15, color: i === arr.length - 1 ? "#fff" : C.text,
              lineHeight: 1.8, margin: "0 0 14px 0", fontWeight: i === arr.length - 1 ? 500 : 300,
              borderLeft: i === arr.length - 1 ? `3px solid ${C.orange}` : "none",
              paddingLeft: i === arr.length - 1 ? 14 : 0,
            }}>{para.trim()}</p>
          ))}
        </div>
      )}
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
    if (!isPremium && reportsUsed >= FREE_LIMIT) { setError("Free limit reached. Upgrade for unlimited reports."); return; }
    setError(""); setReport(null); setLoading(true); setActiveTab("report");
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker: sym }) });
      if (!res.ok) throw new Error("API error " + res.status);
      const parsed = await res.json();
      setReport(parsed);
      if (!isPremium) setReportsUsed(reportsUsed + 1);
    } catch (e) { setError("Analysis failed: " + (e.message || "Try again.")); }
    finally { setLoading(false); }
  };

  const handleKey = (e) => { if (e.key === "Enter") runAnalysis(); };
  const sentColor = (s) => { if (!s) return "gray"; const sl = s.toLowerCase(); return sl.includes("bull") || sl.includes("pos") ? "green" : sl.includes("bear") || sl.includes("neg") ? "red" : "gray"; };
  const tabs = ["report", "headlines", "financials", "intel", "contrarian"];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        body { margin: 0; padding: 0; background: ${C.bg}; }
        input:focus { border-color: ${C.orange}66 !important; box-shadow: 0 0 0 3px ${C.orange}0f; outline: none; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bgCard}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }

        /* Top bar */
        .np-topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 20px; height: 52px; background: #0d1017; border-bottom: 1px solid ${C.border}; position: sticky; top: 0; z-index: 100; gap: 12px; }
        .np-logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 17px; letter-spacing: 3px; display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .np-topbar-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .np-email { font-family: 'DM Mono', monospace; font-size: 10px; color: ${C.textDim}; }
        @media (max-width: 500px) { .np-email { display: none; } .np-logo { font-size: 14px; letter-spacing: 2px; } }

        /* Main layout */
        .np-main { max-width: 1120px; margin: 0 auto; padding: 20px 14px; }
        @media (min-width: 768px) { .np-main { padding: 28px 20px; } }

        /* Card */
        .np-card { background: ${C.bgCard}; border: 1px solid ${C.border}; border-radius: 10px; padding: 18px; margin-bottom: 16px; }
        @media (min-width: 768px) { .np-card { padding: 22px 24px; } }

        /* Search row */
        .np-search-row { display: flex; gap: 10px; align-items: center; }
        .np-input { background: #0d1017; border: 1px solid ${C.border}; border-radius: 6px; padding: 11px 14px; color: #fff; font-family: 'DM Mono', monospace; font-size: 18px; letter-spacing: 6px; text-transform: uppercase; width: 100%; caret-color: ${C.orange}; }
        @media (min-width: 768px) { .np-input { font-size: 22px; letter-spacing: 8px; } }
        .np-run-btn { background: ${C.orange}; color: #000; border: none; border-radius: 6px; padding: 11px 16px; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 1px; cursor: pointer; flex-shrink: 0; white-space: nowrap; }
        @media (min-width: 500px) { .np-run-btn { padding: 11px 22px; font-size: 13px; letter-spacing: 2px; } }

        /* Ticker chips */
        .np-chips { margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
        .np-chip { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 2px; padding: 5px 12px; border-radius: 4px; cursor: pointer; border: 1px solid ${C.border}; background: #0d1017; color: ${C.textMuted}; transition: all 0.15s; }
        .np-chip.active { background: ${C.orange}18; border-color: ${C.orange}66; color: ${C.orange}; }

        /* Header report card */
        .np-header-inner { display: flex; flex-direction: column; gap: 16px; }
        @media (min-width: 600px) { .np-header-inner { flex-direction: row; justify-content: space-between; align-items: flex-start; } }
        .np-gauge-wrap { width: 100%; max-width: 200px; margin: 0 auto; }
        @media (min-width: 600px) { .np-gauge-wrap { margin: 0; flex-shrink: 0; } }

        /* Company name */
        .np-company { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(22px, 6vw, 38px); color: #fff; line-height: 1; }

        /* Tabs */
        .np-tabs { display: flex; border-bottom: 1px solid ${C.border}; margin-bottom: 16px; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; gap: 0; }
        .np-tabs::-webkit-scrollbar { display: none; }
        .np-tab { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 2px; padding: 10px 14px; color: ${C.textMuted}; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap; transition: all 0.15s; flex-shrink: 0; }
        .np-tab.active { color: ${C.orange}; border-bottom-color: ${C.orange}; }
        @media (min-width: 500px) { .np-tab { font-size: 10px; letter-spacing: 3px; padding: 10px 16px; } }

        /* 2 column grid */
        .np-grid2 { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 600px) { .np-grid2 { grid-template-columns: 1fr 1fr; } }

        /* 3 column grid */
        .np-grid3 { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 500px) { .np-grid3 { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 768px) { .np-grid3 { grid-template-columns: 1fr 1fr 1fr; } }

        /* Auto fill grid */
        .np-grid-auto { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 768px) { .np-grid-auto { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); } }

        /* Stat card */
        .np-stat { background: ${C.bgCard}; border: 1px solid ${C.border}; border-radius: 8px; padding: 14px 16px; }
        .np-stat-label { font-family: 'DM Mono', monospace; font-size: 8px; letter-spacing: 2px; color: ${C.textDim}; margin-bottom: 8px; }
        .np-stat-val { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; color: ${C.text}; word-break: break-word; }

        /* Signal card */
        .np-signal { background: ${C.bgCard}; border: 1px solid ${C.border}; border-radius: 8px; padding: 16px; }
        .np-signal-title { font-family: 'DM Mono', monospace; font-size: 8px; letter-spacing: 2px; color: ${C.textDim}; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
        .np-signal-val { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; margin-bottom: 6px; }
        .np-signal-detail { font-family: 'Outfit', sans-serif; font-size: 13px; color: ${C.textMuted}; line-height: 1.5; font-weight: 300; }

        /* Headline row */
        .np-headline { padding: 11px 0; border-bottom: 1px solid ${C.border}; display: flex; gap: 12px; align-items: flex-start; }
        .np-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }

        /* Risk flags */
        .np-risk { background: ${C.red}0a; border: 1px solid ${C.red}22; border-radius: 6px; padding: 7px 12px; font-family: 'Outfit', sans-serif; font-size: 13px; color: ${C.red}; }

        /* Loading */
        .np-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 24px; gap: 16px; }

        /* Empty state */
        .np-empty { text-align: center; padding: 60px 24px; }
        .np-empty-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(36px, 12vw, 64px); color: ${C.border}; letter-spacing: 3px; line-height: 1; }

        /* Contrarian card */
        .np-contrarian { background: ${C.bgCard}; border: 1px solid ${C.orange}33; border-radius: 8px; padding: 22px; margin-bottom: 14px; }

        /* Error */
        .np-error { margin-top: 10px; padding: 10px 14px; background: ${C.red}12; border: 1px solid ${C.red}33; border-radius: 6px; font-family: 'Outfit', sans-serif; font-size: 13px; color: ${C.red}; }

        /* Footer */
        .np-footer { margin-top: 40px; border-top: 1px solid ${C.border}; padding-top: 16px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
        .np-footer span { font-family: 'DM Mono', monospace; font-size: 9px; color: ${C.textDim}; letter-spacing: 2px; }
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>

        {/* Top Bar */}
        <div className="np-topbar">
          <div className="np-logo">
            <span style={{ color: C.text }}>NARRATIVE</span>
            <span style={{ color: C.orange }}>PULSE</span>
            <span style={{ fontFamily: "'DM Mono'", fontSize: 7, color: C.textDim, letterSpacing: 2, marginLeft: 4 }}>◆ BETA</span>
          </div>
          <div className="np-topbar-right">
            {!isPremium && (
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textMuted }}>
                <span style={{ color: reportsLeft === 0 ? C.red : C.orange }}>{reportsLeft}</span>/{FREE_LIMIT}
              </span>
            )}
            {isPremium && <Pill label="PREMIUM" color="orange" />}
            <span className="np-email">{MOCK_USER.email}</span>
            <button style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 11, background: "none", border: `1px solid ${C.orange}44`, color: C.orange, padding: "5px 12px", borderRadius: 4, cursor: "pointer", whiteSpace: "nowrap" }}>
              {isPremium ? "ACCT" : "UPGRADE"}
            </button>
          </div>
        </div>

        <div className="np-main">

          {/* Search Card */}
          <div className="np-card">
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, color: C.textDim, marginBottom: 12 }}>◆ NARRATIVE ANALYSIS ENGINE</div>
            <div className="np-search-row">
              <div style={{ position: "relative", flex: 1 }}>
                <input ref={inputRef} value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} onKeyDown={handleKey} placeholder="AAPL" maxLength={8} className="np-input" />
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontFamily: "'DM Mono'", fontSize: 8, color: C.textDim, letterSpacing: 2 }}>TICKER</span>
              </div>
              <button onClick={runAnalysis} disabled={loading || (!isPremium && reportsUsed >= FREE_LIMIT)} className="np-run-btn"
                style={{ background: loading ? C.border : C.orange, color: loading ? C.textMuted : "#000" }}>
                {loading ? "…" : "RUN ANALYSIS"}
              </button>
            </div>
            {error && <div className="np-error">⚠ {error}</div>}
            <div className="np-chips">
              {["AAPL", "TSLA", "NVDA", "META", "AMZN", "MSFT"].map(t => (
                <button key={t} onClick={() => setTicker(t)} className={`np-chip ${ticker === t ? "active" : ""}`}>{t}</button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="np-card np-loading">
              <div style={{ width: 32, height: 32, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.orange}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, color: C.textMuted }}>SCANNING LIVE MARKET DATA…</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textDim, textAlign: "center" }}>Headlines · Financials · Insider Trades</div>
            </div>
          )}

          {/* Report */}
          {report && !loading && (
            <div style={{ animation: "fadeIn 0.4s ease" }}>

              {/* Header */}
              <div className="np-card" style={{ borderColor: C.borderLight }}>
                <div className="np-header-inner">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                      <div className="np-company">{report.companyName}</div>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 3, background: `${C.orange}18`, color: C.orange, border: `1px solid ${C.orange}44`, borderRadius: 4, padding: "3px 8px", flexShrink: 0 }}>{report.ticker}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                      <Pill label={`MEDIA: ${report.sentimentSignal}`} color={sentColor(report.sentimentSignal)} />
                      <Pill label={`FUND: ${report.fundamentalSignal}`} color={sentColor(report.fundamentalSignal)} />
                      <Pill label={report.narrativeAlignment || "DIVERGENT"} color={report.narrativeAlignment === "ALIGNED" ? "green" : report.narrativeAlignment === "CONTRARIAN" ? "red" : "orange"} />
                      {report.contrarian && <Pill label="⚡ CONTRARIAN" color="orange" />}
                    </div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: C.textDim, letterSpacing: 2 }}>DATA AS OF {report.dataAsOf} · CLAUDE AI</div>
                  </div>
                  <div className="np-gauge-wrap"><GaugeMeter score={report.realityScore} /></div>
                </div>
              </div>

              {/* Plain English */}
              <PlainEnglishCard report={report} />

              {/* Tabs */}
              <div className="np-tabs">
                {tabs.map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} className={`np-tab ${activeTab === t ? "active" : ""}`}>
                    {t === "intel" ? "INTELLIGENCE" : t.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Report Tab */}
              {activeTab === "report" && (
                <div>
                  <div className="np-grid2" style={{ marginBottom: 14 }}>
                    <div className="np-card" style={{ margin: 0 }}>
                      <div className="np-stat-label">GAP ANALYSIS</div>
                      <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, color: C.text, lineHeight: 1.7, margin: 0, fontWeight: 300 }}>{report.gapAnalysis}</p>
                    </div>
                    <div className="np-card" style={{ margin: 0 }}>
                      <div className="np-stat-label">BULL / BEAR CASES</div>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: `${C.green}99`, letterSpacing: 2, marginBottom: 5 }}>▲ BULL</div>
                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: C.text, lineHeight: 1.6, fontWeight: 300 }}>{report.bullBearCase?.bull}</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: `${C.red}99`, letterSpacing: 2, marginBottom: 5 }}>▼ BEAR</div>
                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: C.text, lineHeight: 1.6, fontWeight: 300 }}>{report.bullBearCase?.bear}</div>
                      </div>
                    </div>
                  </div>
                  <div className="np-card">
                    <div className="np-stat-label">RISK FLAGS</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {report.riskFlags?.map((r, i) => <div key={i} className="np-risk">⚠ {r}</div>)}
                    </div>
                  </div>
                </div>
              )}

              {/* Headlines Tab */}
              {activeTab === "headlines" && (
                <div className="np-card">
                  <div className="np-stat-label">RECENT NEWS HEADLINES</div>
                  {report.headlines?.map((h, i) => (
                    <div key={i} className="np-headline">
                      <div className="np-dot" style={{ background: h.sentiment === "positive" ? C.green : h.sentiment === "negative" ? C.red : C.textMuted }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: C.text, lineHeight: 1.5 }}>{h.title}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.textDim, marginTop: 3 }}>{h.source} · {h.publishedAt}</div>
                      </div>
                      <Pill label={h.sentiment?.toUpperCase()} color={h.sentiment === "positive" ? "green" : h.sentiment === "negative" ? "red" : "gray"} />
                    </div>
                  ))}
                </div>
              )}

              {/* Financials Tab */}
              {activeTab === "financials" && (
                <div className="np-grid-auto">
                  {Object.entries(report.financialSnapshot || {}).map(([k, v]) => (
                    <div key={k} className="np-stat">
                      <div className="np-stat-label">{k.replace(/([A-Z])/g, " $1").trim().toUpperCase()}</div>
                      <div className="np-stat-val">{v || "—"}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Intelligence Tab */}
              {activeTab === "intel" && (
                <div>
                  <div className="np-grid2" style={{ marginBottom: 14 }}>
                    <div className="np-signal">
                      <div className="np-signal-title"><span>🏛️</span> INSIDER TRADING</div>
                      <div className="np-signal-val" style={{ color: report.insiderRaw?.signal === "BULLISH" ? C.green : report.insiderRaw?.signal === "BEARISH" ? C.red : C.orange }}>{report.insiderRaw?.signal || "N/A"}</div>
                      <div className="np-signal-detail">{report.insiderSignal || "No insider data."}</div>
                    </div>
                    <div className="np-signal">
                      <div className="np-signal-title"><span>🎯</span> ANALYST CONSENSUS</div>
                      <div className="np-signal-val" style={{ color: report.analystRaw?.consensus === "BUY" ? C.green : C.red }}>{report.analystRaw?.consensus || "N/A"}</div>
                      <div className="np-signal-detail">{report.analystConsensus || "No analyst data."}</div>
                    </div>
                  </div>
                  <div className="np-grid2" style={{ marginBottom: 14 }}>
                    <div className="np-signal">
                      <div className="np-signal-title"><span>🐋</span> SMART MONEY</div>
                      <div className="np-signal-val" style={{ color: C.orange }}>{report.institutionalRaw?.totalInstitutional || "N/A"}</div>
                      <div className="np-signal-detail">{report.smartMoneySignal || "No institutional data."}</div>
                    </div>
                    <div className="np-signal">
                      <div className="np-signal-title"><span>📊</span> OPTIONS SENTIMENT</div>
                      <div className="np-signal-val" style={{ color: C.orange }}>POSITIONING</div>
                      <div className="np-signal-detail">{report.optionsSentiment || "No options data."}</div>
                    </div>
                  </div>
                  {report.institutionalRaw?.topHolders?.length > 0 && (
                    <div className="np-card">
                      <div className="np-stat-label">TOP INSTITUTIONAL HOLDERS</div>
                      {report.institutionalRaw.topHolders.map((h, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}`, gap: 8 }}>
                          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: C.text, flex: 1, minWidth: 0 }}>{h.name}</div>
                          <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.textMuted }}>{h.shares}</span>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: h.change?.startsWith("+") ? C.green : C.red }}>{h.change}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Contrarian Tab */}
              {activeTab === "contrarian" && (
                <div>
                  <div className="np-contrarian">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 20 }}>⚡</span>
                      <div className="np-stat-label" style={{ margin: 0 }}>CONTRARIAN ALERT</div>
                    </div>
                    {report.contrarianAlert
                      ? <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, color: C.orange, lineHeight: 1.7, margin: 0 }}>{report.contrarianAlert}</p>
                      : <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.textDim, margin: 0 }}>No contrarian signal detected.</p>
                    }
                  </div>
                  <div className="np-grid3">
                    {[
                      { label: "MEDIA SENTIMENT", value: report.sentimentSignal },
                      { label: "FUNDAMENTAL SIGNAL", value: report.fundamentalSignal },
                      { label: "ALIGNMENT", value: report.narrativeAlignment || "DIVERGENT" },
                    ].map(item => (
                      <div key={item.label} className="np-stat">
                        <div className="np-stat-label">{item.label}</div>
                        <div className="np-stat-val" style={{ fontSize: 16 }}>{item.value || "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!report && !loading && (
            <div className="np-card np-empty">
              <div className="np-empty-title">NARRATIVE<br />PULSE</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textDim, letterSpacing: 3, marginTop: 16, marginBottom: 32 }}>ENTER A TICKER TO BEGIN</div>
              <div className="np-grid2" style={{ maxWidth: 500, margin: "0 auto" }}>
                {[
                  { icon: "◈", label: "Reality Score", desc: "0–100 narrative gap score" },
                  { icon: "◉", label: "Live Headlines", desc: "Real-time sentiment" },
                  { icon: "🗣️", label: "Plain English", desc: "Jargon-free summary" },
                  { icon: "⚡", label: "Contrarian Alerts", desc: "Spot mispricings" },
                ].map(f => (
                  <div key={f.label} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: C.textDim, marginBottom: 4 }}>{f.icon} {f.label}</div>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: C.textDim, fontWeight: 300 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Freemium */}
          {!isPremium && reportsUsed >= FREE_LIMIT && (
            <div className="np-card" style={{ borderColor: `${C.orange}44`, textAlign: "center", padding: "32px 20px" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: C.orange, marginBottom: 8, letterSpacing: 2 }}>FREE REPORTS EXHAUSTED</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, color: C.textMuted, marginBottom: 20, fontWeight: 300 }}>Upgrade for unlimited reports + Intelligence dashboard.</div>
              <button style={{ background: C.orange, color: "#000", border: "none", borderRadius: 6, padding: "12px 32px", fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 2, cursor: "pointer" }}>UPGRADE →</button>
            </div>
          )}

          <div className="np-footer">
            <span>NARRATIVE-PULSE © 2026 · NOT FINANCIAL ADVICE</span>
            <span>POWERED BY CLAUDE AI</span>
          </div>
        </div>
      </div>
    </>
  );
}
