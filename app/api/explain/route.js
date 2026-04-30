import { NextResponse } from "next/server";

export async function POST(req) {
  const { ticker } = await req.json();
  const sym = ticker.toUpperCase();
  const today = new Date().toISOString().slice(0, 10);

  // Fetch news and financials with strict 3s timeout each
  const [headlines, financials] = await Promise.all([
    fetchNews(sym),
    fetchQuote(sym),
  ]);

  // Call Claude with all data
  const systemPrompt = `You are a financial intelligence engine for Narrative-Pulse. Analyze the gap between public media sentiment and fundamental financial reality.

Today is ${today}. Always produce a complete, meaningful analysis. Never say data is unavailable.

Return ONLY valid JSON, no markdown:
{"ticker":"${sym}","companyName":"Full Company Name","realityScore":72,"sentimentSignal":"BULLISH","fundamentalSignal":"BULLISH","narrativeAlignment":"ALIGNED","contrarian":false,"headlines":[{"title":"Real headline","sentiment":"positive","source":"Source name","publishedAt":"${today}"}],"financialSnapshot":{"currentPrice":"$X","revenue":"$XB","eps":"$X.XX","grossMargin":"XX%","52w High":"$X","52w Low":"$X","P/E Ratio":"XX","Market Cap":"$XB","todayChange":"X%","nextEarnings":"YYYY-MM-DD"},"gapAnalysis":"2-3 sentences.","secInsight":"1-2 sentences on key filing disclosure.","contrarianAlert":"","bullBearCase":{"bull":"One sentence.","bear":"One sentence."},"riskFlags":["risk 1","risk 2","risk 3"],"insiderSignal":"One sentence.","analystConsensus":"One sentence.","smartMoneySignal":"One sentence.","optionsSentiment":"One sentence.","dataAsOf":"${today}"}

narrativeAlignment: exactly ALIGNED, DIVERGENT, or CONTRARIAN only.`;

  const userMessage = `Analyze ${sym} on ${today}.

${headlines.length > 0 ? `LIVE HEADLINES:\n${headlines.map((h, i) => `${i + 1}. "${h.title}" — ${h.source} (${h.publishedAt})`).join("\n")}` : `No live headlines. Use your knowledge of recent ${sym} news and media coverage.`}

${Object.keys(financials).length > 0 ? `LIVE MARKET DATA:\n${Object.entries(financials).map(([k, v]) => `${k}: ${v}`).join("\n")}` : `No live market data. Use your knowledge of ${sym} financials.`}

Produce a complete analysis. Use your training knowledge to fill any gaps. Be specific and insightful about ${sym}.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const data = await response.json();
    if (!data.content) throw new Error("No content from Claude");

    const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // Inject live data if available
    if (Object.keys(financials).length > 0) {
      parsed.financialSnapshot = {
        ...parsed.financialSnapshot,
        ...financials,
      };
    }

    parsed.insiderRaw = {};
    parsed.analystRaw = {};
    parsed.institutionalRaw = {};
    parsed.secFiling = { found: false };

    return NextResponse.json(parsed);
  } catch (e) {
    console.error("Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function fetchNews(sym) {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(
      `https://gnews.io/api/v4/search?q=${sym}+stock&sortby=publishedAt&max=6&lang=en&apikey=${process.env.GNEWS_API_KEY}`,
      { signal: ctrl.signal }
    );
    const data = await res.json();
    return (data.articles || []).map(a => ({
      title: a.title,
      source: a.source?.name || "Unknown",
      publishedAt: a.publishedAt?.slice(0, 10),
    }));
  } catch {
    return [];
  }
}

async function fetchQuote(sym) {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${sym}?apikey=${process.env.FMP_API_KEY}`,
      { signal: ctrl.signal }
    );
    const data = await res.json();
    if (!data[0]) return {};
    const q = data[0];
    return {
      currentPrice: `$${q.price?.toFixed(2)}`,
      todayChange: `${q.changesPercentage?.toFixed(2)}%`,
      "52w High": `$${q.yearHigh?.toFixed(2)}`,
      "52w Low": `$${q.yearLow?.toFixed(2)}`,
      "P/E Ratio": q.pe?.toFixed(1) || "N/A",
      marketCap: `$${(q.marketCap / 1e9).toFixed(1)}B`,
      nextEarnings: q.earningsAnnouncement?.slice(0, 10) || "N/A",
    };
  } catch {
    return {};
  }
}
