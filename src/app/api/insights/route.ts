import { NextResponse } from "next/server";
import { fetchEvents, RawEvent } from "@/lib/fetch-events";
import Anthropic from "@anthropic-ai/sdk";

export interface Insight {
  headline: string;
  context: string;
  suggestedMessage: string;
  urgency: "now" | "today" | "soon" | "whenever";
  eventTitle: string;
  category: string;
}

function buildFallbackInsights(events: RawEvent[]): Insight[] {
  return events.slice(0, 15).map((ev) => ({
    headline: ev.title,
    context: ev.detail,
    suggestedMessage: `${ev.title} — ${ev.detail}`,
    urgency: ev.time === "LIVE" ? "now" : ev.time === "Today" ? "today" : "soon",
    eventTitle: ev.title,
    category: ev.category,
  }));
}

export async function GET() {
  const events = await fetchEvents();

  if (events.length === 0) {
    return NextResponse.json([]);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(buildFallbackInsights(events));
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `You are Spark, a social intelligence engine. You take raw event data and transform it into insights worth sharing with friends — things that make the sender look thoughtful, knowledgeable, and plugged in.

RAW EVENTS:
${JSON.stringify(events)}

YOUR JOB:
- Turn each noteworthy event into a shareable insight
- Skip routine/boring events. Focus on what's surprising, historic, emotional, or conversation-worthy
- Your "headline" should be the insight — not just the score, but WHY it matters
- Your "context" adds 1-2 sentences of background that makes the sender sound knowledgeable
- Your "suggestedMessage" should be a casual, warm text message ready to send. Short (1-2 sentences). Sound like a real person, not a bot. No emojis.
- Urgency: "now" for live/breaking, "today" for same-day, "soon" for upcoming, "whenever" for nice-to-know

Return ONLY a JSON array (no markdown, no explanation). Each object:
{
  "headline": "string (the insight, max 15 words)",
  "context": "string (1-2 sentences of background)",
  "suggestedMessage": "string (casual text ready to send)",
  "urgency": "now" | "today" | "soon" | "whenever",
  "eventTitle": "string (original event title)",
  "category": "string"
}

Maximum 12 insights. Sort by urgency (now first). If nothing is worth sharing, return [].`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "[]";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const insights: Insight[] = JSON.parse(cleaned);

    return NextResponse.json(insights);
  } catch {
    return NextResponse.json(buildFallbackInsights(events));
  }
}
