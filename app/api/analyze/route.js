import { NextResponse } from "next/server";

export async function POST(req) {
  const { ticker } = await req.json();
  const sym = ticker.toUpperCase();

  // ── 1. Fetch Live News Headlines (GNews) ──────────────────────────────────
  let headlines = [];
  try {
    const newsRes = await fetch(
      `https://gnews.io/api/v4/search?q=${sym}+stock&sortby=publishedAt&max=8&lang=en&apikey=${process.env.GNEWS_API_KEY}`
    );
    const newsData = await newsRes.json();
    if (newsData.articles) {
      headlines = newsData.articles.map((a) => ({
        title: a.title,
        source: a.source?.name || "Unknown",
        publishedAt: a.publishedAt?.slice(0, 10),
        description: a.description || "",
      }));
    }
  } catch (e) {
    console.error("GNews API error:", e.message);
  }

  // ── 2. Fetch Live Financials (FMP) ────────────────────────────────────────
  let financials = {};
  let profile = {};
  let insiderData = [];
  let analystData = {};
  let institutionalData = {};

  try {
    const [incomeRes, profileRes, quoteRes, insiderRes, analystRes, institutionalRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/income-statement/${sym}?limit=1&apikey=${process.env.FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/profile/${sym}?apikey=${process.env.FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/quote/${sym}?apikey=${process.env.FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v4/insider-trading?symbol=${sym}&limit=10&apikey=${process.env.FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/analyst-stock-recommendations/${sym}?limit=5&apikey=${process.env.FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/institutional-holder/${sym}?apikey=${process.env.FMP_API_KEY}`),
    ]);

    const [incomeData, profileData, quoteData, insiderRaw, analystRaw, institutionalRaw] = await Promise.all([
      incomeRes.json(),
      profileRes.json(),
      quoteRes.json(),
      insiderRes.json(),
      analystRes.json(),
      institutionalRes.json(),
    ]);

    // Income statement
    if (incomeData[0]) {
      const i = incomeData[0];
      financials = {
        revenue: `$${(i.revenue / 1e9).toFixed(1)}B`,
        grossProfit: `$${(i.grossProfit / 1e9).toFixed(1)}B`,
        netIncome: `$${(i.netIncome / 1e9).toFixed(1)}B`,
        eps: `$${i.eps?.toFixed(2) || "N/A"}`,
        period: i.date,
        grossMargin: `${((i.grossProfit / i.revenue) * 100).toFixed(1)}%`,
        operatingIncome: `$${(i.operatingIncome / 1e9).toFixed(1)}B`,
      };
    }

    // Profile
    if (profileData[0]) {
      const p = profileData[0];
      profile = {
        companyName: p.companyName,
        sector: p.sector,
        industry: p.industry,
        marketCap: `$${(p.mktCap / 1e9).toFixed(1)}B`,
        peRatio: p.pe?.toFixed(1),
        beta: p.beta?.toFixed(2),
        description: p.description?.slice(0, 300),
      };
    }

    // Quote
    if (quoteData[0]) {
      const q = quoteData[0];
      financials.currentPrice = `$${q.price?.toFixed(2)}`;
      financials.yearHigh = `$${q.yearHigh?.toFixed(2)}`;
      financials.yearLow = `$${q.yearLow?.toFixed(2)}`;
      financials.peRatio = q.pe?.toFixed(1);
      financials.earningsDate = q.earningsAnnouncement?.slice(0, 10) || "N/A";
      financials.priceChange = `${q.changesPercentage?.toFixed(2)}%`;
    }

    // Insider trading
    if (Array.isArray(insiderRaw) && insiderRaw.length > 0) {
      const buys = insiderRaw.filter(t => t.transactionType?.toLowerCase().includes("buy") || t.acquisitionOrDisposition === "A");
      const sells = insiderRaw.filter(t => t.transactionType?.toLowerCase().includes("sale") || t.acquisitionOrDisposition === "D");
      insiderData = {
        recentBuys: buys.length,
        recentSells: sells.length,
        signal: buys.length > sells.length ? "BULLISH" : sells.length > buys.length ? "BEARISH" : "NEUTRAL",
        topTransaction: insiderRaw[0] ? {
          name: insiderRaw[0].reportingName,
          type: insiderRaw[0].transactionType,
          shares: insiderRaw[0].securitiesTransacted?.toLocaleString(),
          date: insiderRaw[0].transactionDate,
        } : null,
      };
    }

    // Analyst recommendations
    if (Array.isArray(analystRaw) && analystRaw.length > 0) {
      const latest = analystRaw[0];
      analystData = {
        strongBuy: latest.analystRatingsStrongBuy || 0,
        buy: latest.analystRatingsbuy || 0,
        hold: latest.analystRatingsHold || 0,
        sell: latest.analystRatingsSell || 0,
        strongSell: latest.analystRatingsStrongSell || 0,
        consensus: latest.analystRatingsStrongBuy + latest.analystRatingsbuy > latest.analystRatingsSell + latest.analystRatingsStrongSell ? "BUY" : "SELL",
      };
    }

    // Institutional ownership
    if (Array.isArray(institutionalRaw) && institutionalRaw.length > 0) {
      const top3 = institutionalRaw.slice(0, 3);
      institutionalData = {
        topHolders: top3.map(h => ({ name: h.holder, shares: (h.shares / 1e6).toFixed(1) + "M", change: h.change > 0 ? `+${(h.change / 1e6).toFixed(1)}M` : `${(h.change / 1e6).toFixed(1)}M` })),
        totalInstitutional: institutionalRaw.length + " institutions",
      };
    }

  } catch (e) {
    console.error("FMP API error:", e.message);
  }

  // ── 3. Build Claude Prompt ────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = `You are a financial intelligence engine for Narrative-Pulse. You detect gaps between public media sentiment and fundamental financial reality. Today's date is ${today}.

You will be given LIVE data: real news headlines, financial statements, insider trading, analyst ratings, and institutional ownership. Use ALL of this data to produce your analysis.

Return ONLY valid JSON (no markdown fences) with this exact structure:
{
  "ticker": "AAPL",
  "companyName": "Apple Inc.",
  "realityScore": 72,
  "sentimentSignal": "BULLISH",
  "fundamentalSignal": "BULLISH",
  "narrativeAlignment": "ALIGNED",
  "contrarian": false,
  "headlines": [{"title":"...","sentiment":"positive","source":"...","publishedAt":"YYYY-MM-DD"}],
  "financialSnapshot": {"revenue":"...","eps":"...","guidance":"...","keyMetric":"..."},
  "gapAnalysis": "2-3 sentence analysis of gap between narrative and reality based on live data.",
  "contrarianAlert": "1-2 sentence contrarian opportunity if applicable, empty string if none.",
  "bullBearCase": {"bull": "One sentence bull case.", "bear": "One sentence bear case."},
  "riskFlags": ["risk 1", "risk 2", "risk 3"],
  "insiderSignal": "BULLISH/BEARISH/NEUTRAL with one sentence explanation.",
  "analystConsensus": "Summary of analyst ratings in one sentence.",
  "smartMoneySignal": "One sentence on what institutional ownership changes suggest.",
  "optionsSentiment": "Based on your knowledge, what does options market positioning suggest for this stock? One sentence.",
  "dataAsOf": "${today}"
}

Reality Score guide:
80-100: Media narrative FULLY ALIGNS with fundamentals
60-79: Mostly aligned with minor divergence
40-59: Notable divergence
20-39: Strong contrarian signal
0-19: Extreme disconnect`;

  const userMessage = `Analyze ${sym} using this LIVE data pulled today (${today}):

LIVE NEWS HEADLINES:
${headlines.length > 0
    ? headlines.map((h, i) => `${i + 1}. "${h.title}" — ${h.source} (${h.publishedAt})`).join("\n")
    : "No headlines available."}

LIVE FINANCIALS:
${Object.entries(financials).map(([k, v]) => `${k}: ${v}`).join("\n")}

COMPANY PROFILE:
${Object.entries(profile).filter(([k]) => k !== "description").map(([k, v]) => `${k}: ${v}`).join("\n")}

INSIDER TRADING (last 10 transactions):
${insiderData && insiderData.recentBuys !== undefined
    ? `Buys: ${insiderData.recentBuys}, Sells: ${insiderData.recentSells}, Signal: ${insiderData.signal}${insiderData.topTransaction ? `\nLatest: ${insiderData.topTransaction.name} — ${insiderData.topTransaction.type} ${insiderData.topTransaction.shares} shares on ${insiderData.topTransaction.date}` : ""}`
    : "Insider data unavailable."}

ANALYST RATINGS:
${analystData.strongBuy !== undefined
    ? `Strong Buy: ${analystData.strongBuy}, Buy: ${analystData.buy}, Hold: ${analystData.hold}, Sell: ${analystData.sell}, Strong Sell: ${analystData.strongSell} → Consensus: ${analystData.consensus}`
    : "Analyst data unavailable."}

INSTITUTIONAL OWNERSHIP:
${institutionalData.topHolders
    ? institutionalData.topHolders.map(h => `${h.name}: ${h.shares} (${h.change})`).join(", ")
    : "Institutional data unavailable."}

Return the full JSON analysis using all available data above.`;

  // ── 4. Call Claude ────────────────────────────────────────────────────────
  const response = await fetch("https://api.anthropic.com/v1/messages", {
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

  const data = await response.json();

  if (!response.ok || !data.content) {
    console.error("Anthropic API error:", JSON.stringify(data));
    return NextResponse.json({ error: data.error?.message || "API error" }, { status: 500 });
  }

  const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    // Always inject real financial snapshot
    if (Object.keys(financials).length > 0) {
      parsed.financialSnapshot = {
        revenue: financials.revenue || "N/A",
        eps: financials.eps || "N/A",
        guidance: financials.earningsDate ? `Next earnings: ${financials.earningsDate}` : "N/A",
        keyMetric: `P/E: ${financials.peRatio || "N/A"} · Mkt Cap: ${profile.marketCap || "N/A"}`,
        currentPrice: financials.currentPrice || "N/A",
        "52w High": financials.yearHigh || "N/A",
        "52w Low": financials.yearLow || "N/A",
        grossMargin: financials.grossMargin || "N/A",
        todayChange: financials.priceChange || "N/A",
      };
    }
    // Inject insider + institutional data
    parsed.insiderRaw = insiderData;
    parsed.analystRaw = analystData;
    parsed.institutionalRaw = institutionalData;
    return NextResponse.json(parsed);
  } catch (e) {
    console.error("JSON parse error:", cleaned);
    return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });
  }
}
