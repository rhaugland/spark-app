import { NextResponse } from "next/server";
import { fetchEvents, RawEvent } from "@/lib/fetch-events";
import Anthropic from "@anthropic-ai/sdk";

export interface Insight {
  headline: string;
  context: string;
  talkingPoints: string[];
  suggestedMessage: string;
  date: string;
  eventTitle: string;
  category: string;
}

function buildFallbackInsights(events: RawEvent[]): Insight[] {
  return events.slice(0, 12).map((ev) => ({
    headline: ev.title,
    context: ev.detail,
    talkingPoints: [],
    suggestedMessage: `${ev.title} — ${ev.detail}`,
    date: ev.date,
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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `You are Spark, a social intelligence engine. You don't just report events — you make people SMARTER about them. Your job is to give someone the depth to have a real conversation, not just drop a headline.

RAW EVENTS:
${JSON.stringify(events)}

FOR EACH EVENT, generate:

1. "headline" — The insight, not the score. Not "Vikings 23, Bucs 16" but "The Vikings are 4-0 for the first time since 2009." Tell me WHY this matters.

2. "context" — 2-3 sentences of real background. History, streaks, significance, what happened in the game that was interesting. Make me sound like I actually watched/followed this.

3. "talkingPoints" — Array of 2-3 specific things I could bring up in conversation. These should be genuine conversation starters, not generic. Examples:
   - For sports: key player performances, historical context, what this means for the season
   - For cultural events: traditions people might not know, what people typically do, how to acknowledge it respectfully
   - For crypto: what's driving the move, broader market context

4. "suggestedMessage" — A casual text message ready to send. Sound like a real friend, not a bot. Short, warm, specific. No emojis.

5. "date" — Use the exact date from the event data (the "date" field). Pass it through as-is.

6. "eventTitle" — The original event title from the data.

7. "category" — The original category from the data.

RULES:
- Skip boring/routine events. If a score isn't interesting, don't include it.
- For cultural events, go DEEP. Don't just say "Festival of lights." Tell me what people actually do, what I should know, what makes it special.
- For sports, focus on storylines, not just scores. Streaks, rivalries, breakout performances, playoff implications.
- For crypto, explain the WHY behind the movement.
- Maximum 12 insights. Sort by date (soonest first).

Return ONLY a JSON array (no markdown, no explanation).`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "[]";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const insights: Insight[] = JSON.parse(cleaned);

    return NextResponse.json(insights);
  } catch (err) {
    console.error("Insights AI error:", err);
    return NextResponse.json(buildFallbackInsights(events));
  }
}
