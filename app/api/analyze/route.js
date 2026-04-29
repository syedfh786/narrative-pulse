import { NextResponse } from "next/server";

export async function POST(req) {
  const { ticker } = await req.json();

  const systemPrompt = `You are a financial intelligence engine for Narrative-Pulse. Analyze the given stock ticker using your knowledge of financial markets. Return ONLY valid JSON (no markdown fences) with this exact structure:
{"ticker":"AAPL","companyName":"Apple Inc.","realityScore":72,"sentimentSignal":"BULLISH","fundamentalSignal":"BULLISH","narrativeAlignment":"ALIGNED","contrarian":false,"headlines":[{"title":"...","sentiment":"positive","source":"..."},{"title":"...","sentiment":"negative","source":"..."},{"title":"...","sentiment":"neutral","source":"..."}],"financialSnapshot":{"revenue":"...","eps":"...","guidance":"...","keyMetric":"..."},"gapAnalysis":"2-3 sentence analysis.","contrarianAlert":"","bullBearCase":{"bull":"One sentence bull case.","bear":"One sentence bear case."},"riskFlags":["risk 1","risk 2"],"dataAsOf":"Month YYYY"}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: `Analyze stock ticker: ${ticker.toUpperCase()}` }],
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.content) {
    console.error("Anthropic API error:", JSON.stringify(data));
    return NextResponse.json({ error: data.error?.message || "API error" }, { status: 500 });
  }

  const text = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    return NextResponse.json(JSON.parse(cleaned));
  } catch (e) {
    console.error("JSON parse error:", cleaned);
    return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });
  }
}