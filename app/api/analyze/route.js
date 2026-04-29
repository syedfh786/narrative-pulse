import { NextResponse } from "next/server";

export async function POST(req) {
  const { ticker } = await req.json();
  const sym = ticker.toUpperCase();

  // ── 1. Fetch Live News Headlines ─────────────────────────────────────────
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
    console.error("News API error:", e.message);
  }

  // ── 2. Fetch Live Financials ─────────────────────────────────────────────
  let financials = {};
  let profile = {};
  try {
    const [incomeRes, profileRes, quoteRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/income-statement/${sym}?limit=1&apikey=${process.env.FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/profile/${sym}?apikey=${process.env.FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/quote/${sym}?apikey=${process.env.FMP_API_KEY}`),
    ]);

    const [incomeData, profileData, quoteData] = await Promise.all([
      incomeRes.json(),
      profileRes.json(),
      quoteRes.json(),
    ]);

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

    if (quoteData[0]) {
      const q = quoteData[0];
      financials.currentPrice = `$${q.price?.toFixed(2)}`;
      financials.yearHigh = `$${q.yearHigh?.toFixed(2)}`;
      financials.yearLow = `$${q.yearLow?.toFixed(2)}`;
      financials.peRatio = q.pe?.toFixed(1);
      financials.earningsDate = q.earningsAnnouncement?.slice(0, 10) || "N/A";
    }
  } catch (e) {
    console.error("FMP API error:", e.message);
  }

  // ── 3. Build Claude Prompt with Live Data ────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = `You are a financial intelligence engine for Narrative-Pulse. You detect gaps between public media sentiment and fundamental financial reality. Today's date is ${today}.

You will be given LIVE data: real news headlines from the past few days and actual financial statements. Use this data to produce your analysis.

Return ONLY valid JSON (no markdown fences) with this exact structure:
{"ticker":"AAPL","companyName":"Apple Inc.","realityScore":72,"sentimentSignal":"BULLISH","fundamentalSignal":"BULLISH","narrativeAlignment":"ALIGNED","contrarian":false,"headlines":[{"title":"...","sentiment":"positive","source":"...","publishedAt":"YYYY-MM-DD"}],"financialSnapshot":{"revenue":"...","eps":"...","guidance":"...","keyMetric":"..."},"gapAnalysis":"2-3 sentence analysis of gap between narrative and reality based on the live data provided.","contrarianAlert":"1-2 sentence contrarian opportunity if applicable, empty string if none.","bullBearCase":{"bull":"One sentence bull case based on actual data.","bear":"One sentence bear case based on actual data."},"riskFlags":["risk 1","risk 2","risk 3"],"dataAsOf":"${today}"}

Reality Score guide:
80-100: Media narrative FULLY ALIGNS with fundamentals
60-79: Mostly aligned with minor divergence
40-59: Notable divergence
20-39: Strong contrarian signal
0-19: Extreme disconnect`;

  const userMessage = `Analyze ${sym} using this LIVE data pulled today (${today}):

LIVE NEWS HEADLINES (last 48-72 hours):
${headlines.length > 0
  ? headlines.map((h, i) => `${i + 1}. "${h.title}" — ${h.source} (${h.publishedAt})`).join("\n")
  : "No headlines available — use your knowledge of recent news."}

LIVE FINANCIAL DATA (most recent filing):
${Object.keys(financials).length > 0
  ? Object.entries(financials).map(([k, v]) => `${k}: ${v}`).join("\n")
  : "Financial data unavailable — use your knowledge of recent earnings."}

COMPANY PROFILE:
${Object.keys(profile).length > 0
  ? Object.entries(profile).filter(([k]) => k !== "description").map(([k, v]) => `${k}: ${v}`).join("\n")
  : "Profile unavailable."}

Based on this live data, compute the Reality Score and return the full JSON analysis. For the headlines array, use the actual headlines provided above with accurate sentiment classification. For financialSnapshot, use the actual numbers from the live data.`;

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
    return NextResponse.json(
      { error: data.error?.message || "API error" },
      { status: 500 }
    );
  }

  const text = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    // Inject live financial snapshot if Claude missed it
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
      };
    }
    return NextResponse.json(parsed);
  } catch (e) {
    console.error("JSON parse error:", cleaned);
    return NextResponse.json(
      { error: "Failed to parse response" },
      { status: 500 }
    );
  }
}