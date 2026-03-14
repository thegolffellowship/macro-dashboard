import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const { marketData, fredData, alerts, econCalendar, crypto } =
      await request.json();

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const prompt = `You are a senior macro strategist writing a concise morning briefing for a wealth management advisor named Phillip. Today is ${today}.

Here is the current market data:

EQUITIES:
${(marketData?.equities || []).map((e: { name: string; price: number; change: number; changePercent: number }) => `${e.name}: ${e.price.toLocaleString()} (${e.changePercent >= 0 ? "+" : ""}${e.changePercent.toFixed(2)}%)`).join("\n")}

RATES & FIXED INCOME:
${(marketData?.rates || []).map((r: { name: string; price: number; change: number; changePercent: number }) => `${r.name}: ${r.price.toFixed(3)}% (${r.changePercent >= 0 ? "+" : ""}${r.changePercent.toFixed(2)}%)`).join("\n")}

COMMODITIES & DOLLAR:
${(marketData?.commodities || []).map((c: { name: string; price: number; change: number; changePercent: number }) => `${c.name}: ${c.price.toLocaleString()} (${c.changePercent >= 0 ? "+" : ""}${c.changePercent.toFixed(2)}%)`).join("\n")}

BITCOIN: ${crypto ? `$${crypto.price.toLocaleString()} (${crypto.change24h >= 0 ? "+" : ""}${crypto.change24h.toFixed(2)}%)` : "unavailable"}

MACRO INDICATORS (FRED):
${(fredData || []).map((f: { name: string; value: number; unit: string }) => `${f.name}: ${f.value} ${f.unit}`).join("\n")}

ALERT SIGNALS:
${(alerts || []).map((a: { label: string; status: string; message: string }) => `[${a.status.toUpperCase()}] ${a.label}: ${a.message}`).join("\n")}

KEY ECONOMIC EVENTS THIS WEEK:
${(econCalendar || []).map((e: { date: string; time: string; event: string; impact: string; forecast?: string; previous?: string }) => `${e.date} ${e.time} — ${e.event} (${e.impact}) Forecast: ${e.forecast || "N/A"} Previous: ${e.previous || "N/A"}`).join("\n")}

Write a morning briefing with these sections. Use markdown formatting:

**MARKET PULSE** (2-3 sentences: what happened overnight/pre-market and the overall tone — risk-on, risk-off, or mixed)

**WHAT MATTERS TODAY** (2-3 bullet points: the 2-3 most important things Phillip should pay attention to today and why. Connect dots between data points. If there's a high-impact economic release today, lead with it.)

**RATES & INFLATION READ** (2-3 sentences: what the yield curve, Fed funds rate, and inflation data are telling us about Fed policy direction)

**BOTTOM LINE** (1-2 sentences: the single most important takeaway — what Phillip should tell clients if they call today)

Rules:
- Be direct, confident, and opinionated. This is for a professional, not a retail investor.
- Use specific numbers from the data provided.
- Connect dots between data points — don't just list numbers.
- If VIX is elevated or yield curve is inverted, make that a prominent point.
- Keep the entire briefing under 250 words.
- Do NOT use greetings or sign-offs.
- Do NOT hedge with "it's important to note" or similar filler.`;

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ briefing: text });
  } catch (err) {
    console.error("Briefing generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate briefing" },
      { status: 500 }
    );
  }
}
