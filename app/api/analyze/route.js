import { NextResponse } from "next/server";

async function fetchWithTimeout(url, options = {}, ms = 4000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    return null;
  }
}

export async function POST(req) {
  const { ticker } = await req.json();
  const sym = ticker.toUpperCase();
  const today = new Date().toISOString().slice(0, 10);

  // ── Run all fetches in parallel ──────────────────────────────────────────
  const [newsRes, incomeRes, profileRes, quoteRes, insiderRes, analystRes] = await Promise.all([
    fetchWithTimeout(`https://gnews.io/api/v4/search?q=${sym}+stock&sortby=publishedAt&max=8&lang=en&apikey=${process.env.GNEWS_API_KEY}`),
    fetchWithTimeout(`https://financialmodelingprep.com/api/v3/income-statement/${sym}?limit=1&apikey=${process.env.FMP_API_KEY}`),
    fetchWithTimeout(`https://financialmodelingprep.com/api/v3/profile/${sym}?apikey=${process.env.FMP_API_KEY}`),
    fetchWithTimeout(`https://financialmodelingprep.com/api/v3/quote/${sym}?apikey=${process.env.FMP_API_KEY}`),
    fetchWithTimeout(`https://financialmodelingprep.com/api/v4/insider-trading?symbol=${sym}&limit=10&apikey=${process.env.FMP_API_KEY}`),
    fetchWithTimeout(`https://financialmodelingprep.com/api/v3/analyst-stock-recommendations/${sym}?limit=5&apikey=${process.env.FMP_API_KEY}`),
  ]);

  // ── Parse headlines ──────────────────────────────────────────────────────
  let headlines = [];
  try {
    if (newsRes) {
      const d = await newsRes.json();
      if (d.articles) headlines = d.articles.map(a => ({
        title: a.title,
        source: a.source?.name || "Unknown",
        publishedAt: a.publishedAt?.slice(0, 10),
      }));
    }
  } catch {}

  // ── Parse financials ─────────────────────────────────────────────────────
  let financials = {};
  let profile = {};
  try {
    if (incomeRes) {
      const d = await incomeRes.json();
      if (d[0]) {
        const i = d[0];
        financials.revenue = `$${(i.revenue / 1e9).toFixed(1)}B`;
        financials.netIncome = `$${(i.netIncome / 1e9).toFixed(1)}B`;
        financials.eps = `$${i.eps?.toFixed(2)}`;
        financials.grossMargin = `${((i.grossProfit / i.revenue) * 100).toFixed(1)}%`;
        financials.operatingIncome = `$${(i.operatingIncome / 1e9).toFixed(1)}B`;
      }
    }
  } catch {}

  try {
    if (profileRes) {
      const d = await profileRes.json();
      if (d[0]) {
        profile.companyName = d[0].companyName;
        profile.sector = d[0].sector;
        profile.marketCap = `$${(d[0].mktCap / 1e9).toFixed(1)}B`;
        profile.peRatio = d[0].pe?.toFixed(1);
      }
    }
  } catch {}

  try {
    if (quoteRes) {
      const d = await quoteRes.json();
      if (d[0]) {
        financials.currentPrice = `$${d[0].price?.toFixed(2)}`;
        financials.yearHigh = `$${d[0].yearHigh?.toFixed(2)}`;
        financials.yearLow = `$${d[0].yearLow?.toFixed(2)}`;
        financials.peRatio = d[0].pe?.toFixed(1);
        financials.earningsDate = d[0].earningsAnnouncement?.slice(0, 10) || "N/A";
        financials.priceChange = `${d[0].changesPercentage?.toFixed(2)}%`;
      }
    }
  } catch {}

  // ── Parse insider trades ─────────────────────────────────────────────────
  let insiderData = {};
  try {
    if (insiderRes) {
      const d = await insiderRes.json();
      if (Array.isArray(d) && d.length > 0) {
        const buys = d.filter(t => t.acquisitionOrDisposition === "A");
        const sells = d.filter(t => t.acquisitionOrDisposition === "D");
        insiderData = {
          recentBuys: buys.length,
          recentSells: sells.length,
          signal: buys.length > sells.length ? "BULLISH" : sells.length > buys.length ? "BEARISH" : "NEUTRAL",
          topTransaction: d[0] ? { name: d[0].reportingName, type: d[0].transactionType, shares: d[0].securitiesTransacted?.toLocaleString(), date: d[0].transactionDate } : null,
        };
      }
    }
  } catch {}

  // ── Parse analyst ratings ────────────────────────────────────────────────
  let analystData = {};
  try {
    if (analystRes) {
      const d = await analystRes.json();
      if (Array.isArray(d) && d.length > 0) {
        const l = d[0];
        analystData = {
          strongBuy: l.analystRatingsStrongBuy || 0,
          buy: l.analystRatingsbuy || 0,
          hold: l.analystRatingsHold || 0,
          sell: l.analystRatingsSell || 0,
          strongSell: l.analystRatingsStrongSell || 0,
          consensus: (l.analystRatingsStrongBuy + l.analystRatingsbuy) > (l.analystRatingsSell + l.analystRatingsStrongSell) ? "BUY" : "SELL",
        };
      }
    }
  } catch {}

  // ── Build Claude prompt ──────────────────────────────────────────────────
  const hasHeadlines = headlines.length > 0;
  const hasFinancials = Object.keys(financials).length > 0;

  const systemPrompt = `You are a financial intelligence engine for Narrative-Pulse. Analyze the gap between public media sentiment and fundamental financial reality for publicly traded companies.

Today is ${today}. Use ALL provided data. If some data is missing, use your training knowledge to fill gaps — never say data is unavailable, always produce a meaningful analysis.

Return ONLY valid JSON (no markdown fences):
{"ticker":"${sym}","companyName":"...","realityScore":72,"sentimentSignal":"BULLISH","fundamentalSignal":"BULLISH","narrativeAlignment":"ALIGNED","contrarian":false,"headlines":[{"title":"...","sentiment":"positive","source":"...","publishedAt":"${today}"}],"financialSnapshot":{"revenue":"...","eps":"...","guidance":"...","keyMetric":"..."},"gapAnalysis":"2-3 sentences on gap between narrative and reality.","secInsight":"1-2 sentences on key financial disclosure the market may be missing.","contrarianAlert":"","bullBearCase":{"bull":"...","bear":"..."},"riskFlags":["risk 1","risk 2","risk 3"],"insiderSignal":"...","analystConsensus":"...","smartMoneySignal":"...","optionsSentiment":"...","dataAsOf":"${today}"}

narrativeAlignment must be exactly one of: ALIGNED, DIVERGENT, CONTRARIAN
Reality Score: 80-100=aligned, 60-79=minor divergence, 40-59=notable divergence, 20-39=strong contrarian, 0-19=extreme disconnect`;

  const userMessage = `Analyze ${sym} (${today}):

LIVE HEADLINES (${hasHeadlines ? headlines.length + " found" : "none — use your knowledge of recent " + sym + " news"}):
${hasHeadlines ? headlines.map((h, i) => `${i + 1}. "${h.title}" — ${h.source} (${h.publishedAt})`).join("\n") : "No live headlines available. Use your knowledge of recent news about " + sym + "."}

FINANCIAL DATA (${hasFinancials ? "live" : "unavailable — use your knowledge"}):
${hasFinancials ? Object.entries(financials).map(([k, v]) => `${k}: ${v}`).join("\n") : "No live data. Use your training knowledge of " + sym + " financials."}
${Object.keys(profile).length > 0 ? "Company: " + JSON.stringify(profile) : ""}

INSIDER TRADING: ${insiderData.signal ? `Signal: ${insiderData.signal} | Buys: ${insiderData.recentBuys} | Sells: ${insiderData.recentSells}` : "Use your knowledge of recent " + sym + " insider activity."}

ANALYST RATINGS: ${analystData.consensus ? `Consensus: ${analystData.consensus} | StrongBuy:${analystData.strongBuy} Buy:${analystData.buy} Hold:${analystData.hold} Sell:${analystData.sell}` : "Use your knowledge of analyst ratings for " + sym + "."}

IMPORTANT: Even if live data is missing, produce a complete, meaningful analysis using your knowledge of ${sym}. Never output "insufficient data" — always give your best analysis.`;

  // ── Call Claude ──────────────────────────────────────────────────────────
  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  const claudeData = await claudeRes.json();
  if (!claudeRes.ok || !claudeData.content) {
    return NextResponse.json({ error: claudeData.error?.message || "Claude API error" }, { status: 500 });
  }

  const text = claudeData.content.filter(b => b.type === "text").map(b => b.text).join("");
  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);

    // Always inject live financial snapshot if available
    if (hasFinancials) {
      parsed.financialSnapshot = {
        currentPrice: financials.currentPrice || "N/A",
        revenue: financials.revenue || "N/A",
        eps: financials.eps || "N/A",
        grossMargin: financials.grossMargin || "N/A",
        "52w High": financials.yearHigh || "N/A",
        "52w Low": financials.yearLow || "N/A",
        "P/E Ratio": financials.peRatio || profile.peRatio || "N/A",
        "Market Cap": profile.marketCap || "N/A",
        todayChange: financials.priceChange || "N/A",
        nextEarnings: financials.earningsDate || "N/A",
      };
    }

    parsed.insiderRaw = insiderData;
    parsed.analystRaw = analystData;
    parsed.institutionalRaw = {};
    parsed.secFiling = { found: false };

    return NextResponse.json(parsed);
  } catch (e) {
    console.error("JSON parse error:", cleaned.slice(0, 200));
    return NextResponse.json({ error: "Failed to parse Claude response" }, { status: 500 });
  }
}
