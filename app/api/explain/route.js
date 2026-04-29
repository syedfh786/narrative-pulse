import { NextResponse } from "next/server";

export async function POST(req) {
  const { report } = await req.json();

  const systemPrompt = `You are a friendly, plain-speaking financial guide. Your job is to take complex financial analysis and explain it like you're talking to a smart friend who knows nothing about investing jargon.

Rules:
- NO jargon. No "EPS", "P/E ratio", "basis points", "YoY" — spell everything out in human terms
- Be conversational, warm and direct
- Be honest about both good and bad signals
- End with one clear, simple takeaway sentence
- Keep it to 4-6 short paragraphs
- Never use bullet points — flowing paragraphs only
- Imagine you're explaining this to your parent or friend over coffee`;

  const userMessage = `Here is the financial analysis for ${report.companyName} (${report.ticker}):

Reality Score: ${report.realityScore}/100 (${report.narrativeAlignment})
Media Sentiment: ${report.sentimentSignal}
Fundamental Signal: ${report.fundamentalSignal}
Contrarian Signal: ${report.contrarian ? "YES" : "NO"}

Gap Analysis: ${report.gapAnalysis}

Bull Case: ${report.bullBearCase?.bull}
Bear Case: ${report.bullBearCase?.bear}

Risk Flags: ${report.riskFlags?.join(", ")}

Insider Signal: ${report.insiderSignal || "N/A"}
Analyst Consensus: ${report.analystConsensus || "N/A"}
Smart Money: ${report.smartMoneySignal || "N/A"}
Options Sentiment: ${report.optionsSentiment || "N/A"}

Contrarian Alert: ${report.contrarianAlert || "None"}

Financial Snapshot:
${Object.entries(report.financialSnapshot || {}).map(([k, v]) => `${k}: ${v}`).join("\n")}

Please explain all of this in plain, friendly English. Start with what's happening with this company right now, explain what the score means in simple terms, what the smart money is doing, and finish with one clear bottom-line takeaway.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.content) {
    return NextResponse.json({ error: "Failed to generate explanation" }, { status: 500 });
  }

  const text = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  return NextResponse.json({ explanation: text });
}
