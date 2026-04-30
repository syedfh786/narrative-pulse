import { NextResponse } from "next/server";

// ── Helper: truncate long text ─────────────────────────────────────────────
function truncate(text, maxChars = 3000) {
  if (!text) return "";
  return text.length > maxChars ? text.slice(0, maxChars) + "…" : text;
}

// ── Helper: clean raw SEC filing text ─────────────────────────────────────
function cleanFilingText(raw) {
  return raw
    .replace(/<[^>]+>/g, " ")       // strip HTML tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s{3,}/g, " ")        // collapse whitespace
    .trim();
}

export async function POST(req) {
  const { ticker } = await req.json();
  const sym = ticker.toUpperCase();

  // ── 1. Fetch Live News (GNews) ─────────────────────────────────────────
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
    console.error("GNews error:", e.message);
  }

  // ── 2. Fetch Financials (FMP) ──────────────────────────────────────────
  let financials = {};
  let profile = {};
  let insiderData = {};
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
      incomeRes.json(), profileRes.json(), quoteRes.json(),
      insiderRes.json(), analystRes.json(), institutionalRes.json(),
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
      };
    }

    if (quoteData[0]) {
      const q = quoteData[0];
      financials.currentPrice = `$${q.price?.toFixed(2)}`;
      financials.yearHigh = `$${q.yearHigh?.toFixed(2)}`;
      financials.yearLow = `$${q.yearLow?.toFixed(2)}`;
      financials.peRatio = q.pe?.toFixed(1);
      financials.earningsDate = q.earningsAnnouncement?.slice(0, 10) || "N/A";
      financials.priceChange = `${q.changesPercentage?.toFixed(2)}%`;
    }

    if (Array.isArray(insiderRaw) && insiderRaw.length > 0) {
      const buys = insiderRaw.filter(t => t.acquisitionOrDisposition === "A");
      const sells = insiderRaw.filter(t => t.acquisitionOrDisposition === "D");
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

    if (Array.isArray(analystRaw) && analystRaw.length > 0) {
      const latest = analystRaw[0];
      analystData = {
        strongBuy: latest.analystRatingsStrongBuy || 0,
        buy: latest.analystRatingsbuy || 0,
        hold: latest.analystRatingsHold || 0,
        sell: latest.analystRatingsSell || 0,
        strongSell: latest.analystRatingsStrongSell || 0,
        consensus: (latest.analystRatingsStrongBuy + latest.analystRatingsbuy) >
          (latest.analystRatingsSell + latest.analystRatingsStrongSell) ? "BUY" : "SELL",
      };
    }

    if (Array.isArray(institutionalRaw) && institutionalRaw.length > 0) {
      institutionalData = {
        topHolders: institutionalRaw.slice(0, 3).map(h => ({
          name: h.holder,
          shares: (h.shares / 1e6).toFixed(1) + "M",
          change: h.change > 0 ? `+${(h.change / 1e6).toFixed(1)}M` : `${(h.change / 1e6).toFixed(1)}M`,
        })),
        totalInstitutional: institutionalRaw.length + " institutions",
      };
    }
  } catch (e) {
    console.error("FMP error:", e.message);
  }

  // ── 3. SEC EDGAR — Auto-lookup CIK by ticker ───────────────────────────
  let secData = {
    found: false,
    filingType: "",
    filingDate: "",
    mdaExcerpt: "",
    riskExcerpt: "",
    forwardGuidance: "",
    keyManagementQuotes: "",
  };

  try {
    // Step 1: Look up CIK from ticker
    const cikRes = await fetch(
      `https://efts.sec.gov/LATEST/search-index?q=%22${sym}%22&dateRange=custom&startdt=2020-01-01&enddt=2099-01-01&forms=10-K,10-Q`,
      { headers: { "User-Agent": "NarrativePulse contact@narrativepulse.com" } }
    );

    // Use the company tickers JSON endpoint instead — more reliable
    const tickerMapRes = await fetch(
      "https://www.sec.gov/files/company_tickers.json",
      { headers: { "User-Agent": "NarrativePulse contact@narrativepulse.com" } }
    );
    const tickerMap = await tickerMapRes.json();

    // Find CIK for our ticker
    let cik = null;
    let companyTitle = null;
    for (const entry of Object.values(tickerMap)) {
      if (entry.ticker?.toUpperCase() === sym) {
        cik = String(entry.cik_str).padStart(10, "0");
        companyTitle = entry.title;
        break;
      }
    }

    if (cik) {
      // Step 2: Get recent filings for this CIK
      const submissionsRes = await fetch(
        `https://data.sec.gov/submissions/CIK${cik}.json`,
        { headers: { "User-Agent": "NarrativePulse contact@narrativepulse.com" } }
      );
      const submissions = await submissionsRes.json();

      // Find most recent 10-K or 10-Q
      const filings = submissions.filings?.recent;
      let targetIndex = -1;
      let targetForm = "";
      let targetDate = "";
      let targetAccession = "";

      if (filings) {
        for (let i = 0; i < filings.form.length; i++) {
          if (filings.form[i] === "10-K" || filings.form[i] === "10-Q") {
            targetIndex = i;
            targetForm = filings.form[i];
            targetDate = filings.filingDate[i];
            targetAccession = filings.accessionNumber[i].replace(/-/g, "");
            break;
          }
        }
      }

      if (targetAccession) {
        // Step 3: Get filing index to find the actual document
        const filingIndexRes = await fetch(
          `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/` +
          `${targetAccession}/${filings.accessionNumber[targetIndex]}-index.htm`,
          { headers: { "User-Agent": "NarrativePulse contact@narrativepulse.com" } }
        );

        // Step 4: Fetch the primary document
        const primaryDoc = filings.primaryDocument?.[targetIndex];
        if (primaryDoc) {
          const docRes = await fetch(
            `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${targetAccession}/${primaryDoc}`,
            { headers: { "User-Agent": "NarrativePulse contact@narrativepulse.com" } }
          );
          const rawHtml = await docRes.text();
          const cleanText = cleanFilingText(rawHtml);

          // Extract MD&A section (Management Discussion & Analysis)
          const mdaMatch = cleanText.match(
            /(?:management.{0,20}discussion.{0,20}analysis|item\s*7\.?\s*management)/i
          );
          const mdaStart = mdaMatch ? cleanText.indexOf(mdaMatch[0]) : -1;
          const mdaExcerpt = mdaStart > -1
            ? truncate(cleanText.slice(mdaStart, mdaStart + 4000), 2500)
            : "";

          // Extract Risk Factors section
          const riskMatch = cleanText.match(/(?:risk\s*factors|item\s*1a\.?\s*risk)/i);
          const riskStart = riskMatch ? cleanText.indexOf(riskMatch[0]) : -1;
          const riskExcerpt = riskStart > -1
            ? truncate(cleanText.slice(riskStart, riskStart + 3000), 1500)
            : "";

          // Extract forward-looking statements / guidance
          const guidanceMatch = cleanText.match(
            /(?:outlook|forward.{0,10}looking|guidance|fiscal\s*year\s*20\d\d)/i
          );
          const guidanceStart = guidanceMatch ? cleanText.indexOf(guidanceMatch[0]) : -1;
          const forwardGuidance = guidanceStart > -1
            ? truncate(cleanText.slice(guidanceStart, guidanceStart + 2000), 1000)
            : "";

          secData = {
            found: true,
            filingType: targetForm,
            filingDate: targetDate,
            companyTitle,
            mdaExcerpt,
            riskExcerpt,
            forwardGuidance,
          };
        }
      }
    }
  } catch (e) {
    console.error("SEC EDGAR error:", e.message);
  }

  // ── 4. Build Claude Prompt ─────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = `You are a financial intelligence engine for Narrative-Pulse. You detect gaps between public media sentiment and what companies actually disclose in official SEC regulatory filings.

Today's date is ${today}. You have access to LIVE news headlines, financial data, AND actual SEC filing text (10-K/10-Q). The SEC filing data is the most authoritative source — prioritize it when computing the Reality Score.

Key analysis principle: Compare what the MEDIA is saying vs what the COMPANY OFFICIALLY DISCLOSED in regulatory filings. Gaps between these two are the most valuable signals.

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
  "gapAnalysis": "2-3 sentences comparing media narrative to what the company actually disclosed in SEC filings.",
  "secInsight": "1-2 sentences on the most important thing the SEC filing reveals that media coverage missed or distorted.",
  "contrarianAlert": "1-2 sentence contrarian opportunity if applicable, empty string if none.",
  "bullBearCase": {"bull":"One sentence.", "bear":"One sentence."},
  "riskFlags": ["risk from SEC filing 1", "risk from SEC filing 2", "media-driven risk 3"],
  "insiderSignal": "One sentence on insider trading signal.",
  "analystConsensus": "One sentence on analyst ratings.",
  "smartMoneySignal": "One sentence on institutional ownership changes.",
  "optionsSentiment": "One sentence on options market positioning.",
  "dataAsOf": "${today}"
}

Reality Score guide (SEC filings are the ground truth):
90-100: Media narrative perfectly matches SEC disclosed fundamentals
70-89: Media mostly accurate with minor gaps vs SEC disclosures
50-69: Notable divergence — media missing key SEC-disclosed risks or opportunities
30-49: Strong divergence — media narrative contradicts SEC disclosures
0-29: Extreme disconnect — SEC filings tell a completely different story than media`;

  const userMessage = `Analyze ${sym} using ALL of this live data (${today}):

═══ LIVE NEWS HEADLINES ═══
${headlines.length > 0
    ? headlines.map((h, i) => `${i + 1}. "${h.title}" — ${h.source} (${h.publishedAt})`).join("\n")
    : "No headlines available."}

═══ FINANCIAL DATA ═══
${Object.entries(financials).map(([k, v]) => `${k}: ${v}`).join("\n")}

Company: ${JSON.stringify(profile)}

═══ INSIDER TRADING ═══
${insiderData.signal ? `Signal: ${insiderData.signal} | Buys: ${insiderData.recentBuys} | Sells: ${insiderData.recentSells}` : "No data."}

═══ ANALYST RATINGS ═══
${analystData.consensus ? `Consensus: ${analystData.consensus} | Strong Buy: ${analystData.strongBuy} | Buy: ${analystData.buy} | Hold: ${analystData.hold} | Sell: ${analystData.sell}` : "No data."}

═══ SEC FILING DATA (${secData.found ? `${secData.filingType} filed ${secData.filingDate}` : "NOT FOUND"}) ═══
${secData.found ? `
MANAGEMENT DISCUSSION & ANALYSIS (MD&A):
${secData.mdaExcerpt || "Not extracted."}

RISK FACTORS (from filing):
${secData.riskExcerpt || "Not extracted."}

FORWARD GUIDANCE / OUTLOOK:
${secData.forwardGuidance || "Not extracted."}
` : "SEC filing data unavailable — base analysis on financial data and headlines."}

Use the SEC filing as the primary source of truth. Identify where the media narrative diverges from what management officially disclosed. Return the complete JSON.`;

  // ── 5. Call Claude ─────────────────────────────────────────────────────
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
    console.error("Claude error:", JSON.stringify(data));
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

    // Inject raw data for UI
    parsed.insiderRaw = insiderData;
    parsed.analystRaw = analystData;
    parsed.institutionalRaw = institutionalData;
    parsed.secFiling = {
      found: secData.found,
      type: secData.filingType,
      date: secData.filingDate,
    };

    return NextResponse.json(parsed);
  } catch (e) {
    console.error("JSON parse error:", cleaned);
    return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });
  }
}
