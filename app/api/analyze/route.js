import { NextResponse } from "next/server";

// ── Helpers ────────────────────────────────────────────────────────────────
function truncate(text, maxChars = 2000) {
  if (!text) return "";
  return text.length > maxChars ? text.slice(0, maxChars) + "…" : text;
}

function cleanFilingText(raw) {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s{3,}/g, " ")
    .trim();
}

// Fetch with timeout to prevent hanging
async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

export async function POST(req) {
  const { ticker } = await req.json();
  const sym = ticker.toUpperCase();

  // Run all data fetches in parallel for speed
  const [headlinesResult, fmpResult, secResult] = await Promise.allSettled([
    fetchHeadlines(sym),
    fetchFinancials(sym),
    fetchSecFiling(sym),
  ]);

  const headlines = headlinesResult.status === "fulfilled" ? headlinesResult.value : [];
  const { financials, profile, insiderData, analystData, institutionalData } =
    fmpResult.status === "fulfilled" ? fmpResult.value : { financials: {}, profile: {}, insiderData: {}, analystData: {}, institutionalData: {} };
  const secData = secResult.status === "fulfilled" ? secResult.value : { found: false };

  console.log(`[${sym}] Headlines: ${headlines.length}, FMP: ${Object.keys(financials).length} fields, SEC: ${secData.found}`);

  // Build prompt and call Claude
  const today = new Date().toISOString().slice(0, 10);
  const result = await callClaude(sym, today, headlines, financials, profile, insiderData, analystData, institutionalData, secData);

  // Inject real data
  if (Object.keys(financials).length > 0) {
    result.financialSnapshot = {
      currentPrice: financials.currentPrice || "N/A",
      revenue: financials.revenue || "N/A",
      eps: financials.eps || "N/A",
      grossMargin: financials.grossMargin || "N/A",
      "52w High": financials.yearHigh || "N/A",
      "52w Low": financials.yearLow || "N/A",
      "P/E Ratio": financials.peRatio || "N/A",
      "Market Cap": profile.marketCap || "N/A",
      todayChange: financials.priceChange || "N/A",
      nextEarnings: financials.earningsDate || "N/A",
    };
  }

  result.insiderRaw = insiderData;
  result.analystRaw = analystData;
  result.institutionalRaw = institutionalData;
  result.secFiling = { found: secData.found, type: secData.filingType, date: secData.filingDate };

  return NextResponse.json(result);
}

// ── Fetch Headlines ────────────────────────────────────────────────────────
async function fetchHeadlines(sym) {
  const res = await fetchWithTimeout(
    `https://gnews.io/api/v4/search?q=${sym}+stock&sortby=publishedAt&max=8&lang=en&apikey=${process.env.GNEWS_API_KEY}`,
    {}, 6000
  );
  const data = await res.json();
  if (!data.articles) return [];
  return data.articles.map((a) => ({
    title: a.title,
    source: a.source?.name || "Unknown",
    publishedAt: a.publishedAt?.slice(0, 10),
    description: a.description || "",
  }));
}

// ── Fetch Financials ───────────────────────────────────────────────────────
async function fetchFinancials(sym) {
  const base = "https://financialmodelingprep.com/api/v3";
  const key = process.env.FMP_API_KEY;
  const headers = {};

  const [incomeRes, profileRes, quoteRes, insiderRes, analystRes, institutionalRes] = await Promise.allSettled([
    fetchWithTimeout(`${base}/income-statement/${sym}?limit=1&apikey=${key}`, { headers }, 6000),
    fetchWithTimeout(`${base}/profile/${sym}?apikey=${key}`, { headers }, 6000),
    fetchWithTimeout(`${base}/quote/${sym}?apikey=${key}`, { headers }, 6000),
    fetchWithTimeout(`https://financialmodelingprep.com/api/v4/insider-trading?symbol=${sym}&limit=10&apikey=${key}`, { headers }, 6000),
    fetchWithTimeout(`${base}/analyst-stock-recommendations/${sym}?limit=5&apikey=${key}`, { headers }, 6000),
    fetchWithTimeout(`${base}/institutional-holder/${sym}?apikey=${key}`, { headers }, 6000),
  ]);

  let financials = {}, profile = {}, insiderData = {}, analystData = {}, institutionalData = {};

  if (incomeRes.status === "fulfilled") {
    const d = await incomeRes.value.json();
    if (d[0]) {
      const i = d[0];
      financials.revenue = `$${(i.revenue / 1e9).toFixed(1)}B`;
      financials.grossProfit = `$${(i.grossProfit / 1e9).toFixed(1)}B`;
      financials.netIncome = `$${(i.netIncome / 1e9).toFixed(1)}B`;
      financials.eps = `$${i.eps?.toFixed(2) || "N/A"}`;
      financials.grossMargin = `${((i.grossProfit / i.revenue) * 100).toFixed(1)}%`;
      financials.operatingIncome = `$${(i.operatingIncome / 1e9).toFixed(1)}B`;
    }
  }

  if (profileRes.status === "fulfilled") {
    const d = await profileRes.value.json();
    if (d[0]) {
      profile.companyName = d[0].companyName;
      profile.sector = d[0].sector;
      profile.marketCap = `$${(d[0].mktCap / 1e9).toFixed(1)}B`;
      profile.peRatio = d[0].pe?.toFixed(1);
    }
  }

  if (quoteRes.status === "fulfilled") {
    const d = await quoteRes.value.json();
    if (d[0]) {
      financials.currentPrice = `$${d[0].price?.toFixed(2)}`;
      financials.yearHigh = `$${d[0].yearHigh?.toFixed(2)}`;
      financials.yearLow = `$${d[0].yearLow?.toFixed(2)}`;
      financials.peRatio = d[0].pe?.toFixed(1);
      financials.earningsDate = d[0].earningsAnnouncement?.slice(0, 10) || "N/A";
      financials.priceChange = `${d[0].changesPercentage?.toFixed(2)}%`;
    }
  }

  if (insiderRes.status === "fulfilled") {
    const d = await insiderRes.value.json();
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

  if (analystRes.status === "fulfilled") {
    const d = await analystRes.value.json();
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

  if (institutionalRes.status === "fulfilled") {
    const d = await institutionalRes.value.json();
    if (Array.isArray(d) && d.length > 0) {
      institutionalData = {
        topHolders: d.slice(0, 3).map(h => ({
          name: h.holder,
          shares: (h.shares / 1e6).toFixed(1) + "M",
          change: h.change > 0 ? `+${(h.change / 1e6).toFixed(1)}M` : `${(h.change / 1e6).toFixed(1)}M`,
        })),
        totalInstitutional: d.length + " institutions",
      };
    }
  }

  return { financials, profile, insiderData, analystData, institutionalData };
}

// ── Fetch SEC EDGAR ────────────────────────────────────────────────────────
async function fetchSecFiling(sym) {
  const SEC_HEADERS = { "User-Agent": "NarrativePulse contact@narrativepulse.com" };

  try {
    // Use the faster ticker search endpoint instead of loading the full map
    const searchRes = await fetchWithTimeout(
      `https://efts.sec.gov/LATEST/search-index?q=%22${sym}%22&forms=10-K,10-Q&dateRange=custom&startdt=2023-01-01&enddt=2099-01-01`,
      { headers: SEC_HEADERS }, 5000
    );

    // Use company search API - much faster than loading full ticker map
    const companyRes = await fetchWithTimeout(
      `https://www.sec.gov/cgi-bin/browse-edgar?company=&CIK=${sym}&type=10-K&dateb=&owner=include&count=1&search_text=&action=getcompany&output=atom`,
      { headers: SEC_HEADERS }, 5000
    );
    const companyXml = await companyRes.text();

    // Extract CIK from XML response
    const cikMatch = companyXml.match(/\/cgi-bin\/browse-edgar\?action=getcompany&CIK=(\d+)/);
    if (!cikMatch) return { found: false };

    const cik = cikMatch[1].padStart(10, "0");

    // Get submissions
    const subRes = await fetchWithTimeout(
      `https://data.sec.gov/submissions/CIK${cik}.json`,
      { headers: SEC_HEADERS }, 6000
    );
    const submissions = await subRes.json();

    const filings = submissions.filings?.recent;
    if (!filings) return { found: false };

    // Find most recent 10-K or 10-Q
    let idx = -1;
    for (let i = 0; i < filings.form.length; i++) {
      if (filings.form[i] === "10-K" || filings.form[i] === "10-Q") {
        idx = i; break;
      }
    }
    if (idx === -1) return { found: false };

    const accession = filings.accessionNumber[idx].replace(/-/g, "");
    const primaryDoc = filings.primaryDocument?.[idx];
    const cikInt = parseInt(cik);

    if (!primaryDoc) return { found: false };

    // Fetch the actual filing document
    const docRes = await fetchWithTimeout(
      `https://www.sec.gov/Archives/edgar/data/${cikInt}/${accession}/${primaryDoc}`,
      { headers: SEC_HEADERS }, 8000
    );
    const rawHtml = await docRes.text();
    const cleanText = cleanFilingText(rawHtml);

    // Extract key sections
    const mdaMatch = cleanText.match(/(?:management.{0,30}discussion|item\s*7\.?\s)/i);
    const mdaStart = mdaMatch ? cleanText.indexOf(mdaMatch[0]) : -1;
    const mdaExcerpt = mdaStart > -1 ? truncate(cleanText.slice(mdaStart, mdaStart + 4000), 2000) : "";

    const riskMatch = cleanText.match(/(?:risk\s*factors|item\s*1a)/i);
    const riskStart = riskMatch ? cleanText.indexOf(riskMatch[0]) : -1;
    const riskExcerpt = riskStart > -1 ? truncate(cleanText.slice(riskStart, riskStart + 3000), 1500) : "";

    const guidanceMatch = cleanText.match(/(?:outlook|guidance|forward.{0,10}looking)/i);
    const guidanceStart = guidanceMatch ? cleanText.indexOf(guidanceMatch[0]) : -1;
    const forwardGuidance = guidanceStart > -1 ? truncate(cleanText.slice(guidanceStart, guidanceStart + 2000), 1000) : "";

    return {
      found: true,
      filingType: filings.form[idx],
      filingDate: filings.filingDate[idx],
      mdaExcerpt,
      riskExcerpt,
      forwardGuidance,
    };
  } catch (e) {
    console.error("SEC error:", e.message);
    return { found: false };
  }
}

// ── Call Claude ────────────────────────────────────────────────────────────
async function callClaude(sym, today, headlines, financials, profile, insiderData, analystData, institutionalData, secData) {
  const systemPrompt = `You are a financial intelligence engine for Narrative-Pulse. Compare media narrative vs what companies officially disclose in SEC filings.

Today: ${today}. SEC filings are the ground truth — prioritize them.

Return ONLY valid JSON with this structure:
{"ticker":"${sym}","companyName":"...","realityScore":72,"sentimentSignal":"BULLISH","fundamentalSignal":"BULLISH","narrativeAlignment":"ALIGNED","contrarian":false,"headlines":[{"title":"...","sentiment":"positive","source":"...","publishedAt":"YYYY-MM-DD"}],"financialSnapshot":{"revenue":"...","eps":"...","guidance":"...","keyMetric":"..."},"gapAnalysis":"2-3 sentences comparing media vs SEC disclosures.","secInsight":"1-2 sentences on what SEC filing reveals that media missed.","contrarianAlert":"","bullBearCase":{"bull":"...","bear":"..."},"riskFlags":["risk 1","risk 2","risk 3"],"insiderSignal":"...","analystConsensus":"...","smartMoneySignal":"...","optionsSentiment":"...","dataAsOf":"${today}"}

Reality Score: 90-100=media matches SEC, 70-89=mostly aligned, 50-69=notable gaps, 30-49=significant divergence, 0-29=extreme disconnect`;

  const userMessage = `Analyze ${sym} — ${today}

NEWS HEADLINES:
${headlines.length > 0 ? headlines.map((h, i) => `${i + 1}. "${h.title}" (${h.source}, ${h.publishedAt})`).join("\n") : "None available."}

FINANCIALS:
${Object.entries(financials).map(([k, v]) => `${k}: ${v}`).join("\n") || "None available."}
Profile: ${JSON.stringify(profile)}

INSIDER TRADING: ${insiderData.signal ? `${insiderData.signal} | Buys: ${insiderData.recentBuys} | Sells: ${insiderData.recentSells}` : "No data."}
ANALYST RATINGS: ${analystData.consensus ? `${analystData.consensus} | StrongBuy:${analystData.strongBuy} Buy:${analystData.buy} Hold:${analystData.hold} Sell:${analystData.sell}` : "No data."}

SEC FILING (${secData.found ? `${secData.filingType} — ${secData.filingDate}` : "not found"}):
${secData.found ? `MD&A: ${secData.mdaExcerpt}\n\nRISK FACTORS: ${secData.riskExcerpt}\n\nGUIDANCE: ${secData.forwardGuidance}` : "SEC data unavailable — use financial data and headlines only."}

Return the complete JSON analysis.`;

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
  if (!response.ok || !data.content) throw new Error(data.error?.message || "Claude API error");

  const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}
