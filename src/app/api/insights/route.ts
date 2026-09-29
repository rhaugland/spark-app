import { NextResponse } from "next/server";
import { db } from "@/db";
import { friends, interests } from "@/db/schema";
import { fetchEvents, RawEvent } from "@/lib/fetch-events";
import Anthropic from "@anthropic-ai/sdk";

export interface Insight {
  friendId: string;
  friendName: string;
  headline: string;
  context: string;
  suggestedMessage: string;
  urgency: "now" | "today" | "soon" | "whenever";
  eventTitle: string;
  category: string;
}

function buildFallbackInsights(
  events: RawEvent[],
  friendsData: { id: string; name: string; interests: { label: string; category: string | null }[] }[]
): Insight[] {
  const results: Insight[] = [];

  for (const ev of events) {
    for (const friend of friendsData) {
      const match = friend.interests.some(
        (i) =>
          i.category === ev.category ||
          i.label.toLowerCase().includes(ev.listenerLabel.toLowerCase()) ||
          ev.listenerLabel.toLowerCase().includes(i.label.toLowerCase())
      );
      if (!match) continue;

      results.push({
        friendId: friend.id,
        friendName: friend.name,
        headline: ev.title,
        context: ev.detail,
        suggestedMessage: `Hey ${friend.name}! ${ev.title} — ${ev.detail}`,
        urgency: ev.time === "LIVE" ? "now" : ev.time === "Today" ? "today" : "soon",
        eventTitle: ev.title,
        category: ev.category,
      });
    }
  }

  return results.slice(0, 15);
}

export async function GET() {
  const [events, allFriends, allInterests] = await Promise.all([
    fetchEvents(),
    db.select().from(friends),
    db.select().from(interests),
  ]);

  const friendsData = allFriends.map((f) => ({
    ...f,
    interests: allInterests.filter((i) => i.friendId === f.id),
  }));

  if (events.length === 0 || friendsData.length === 0) {
    return NextResponse.json([]);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(buildFallbackInsights(events, friendsData));
  }

  const client = new Anthropic({ apiKey });

  const friendsSummary = friendsData.map((f) => ({
    id: f.id,
    name: f.name,
    interests: f.interests.map((i) => i.label),
  }));

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `You are Spark, a social intelligence engine that helps people maintain friendships. Your job is to look at recent events and figure out which ones are worth reaching out to specific friends about — and exactly what to say.

FRIENDS:
${JSON.stringify(friendsSummary)}

RECENT EVENTS:
${JSON.stringify(events)}

RULES:
- Only match events to friends where there's a GENUINE connection to their interests
- Not every event is worth a message — skip routine stuff. Focus on what's notable, surprising, or emotionally resonant
- Your "headline" should reveal WHY this matters — insight the user wouldn't have on their own
- Your "context" should add 1-2 sentences of background that makes the user sound knowledgeable
- Suggested messages must sound like a REAL text from a friend — casual, warm, maybe funny. Never corporate. Never stiff. 1-2 short sentences max.
- Use the friend's actual name in the message
- Urgency: "now" for live/breaking, "today" for same-day relevance, "soon" for upcoming, "whenever" for nice-to-know

Return ONLY a JSON array of objects (no markdown, no explanation). Each object:
{
  "friendId": "uuid",
  "friendName": "string",
  "headline": "string (max 15 words, the insight)",
  "context": "string (1-2 sentences of context)",
  "suggestedMessage": "string (casual text to send)",
  "urgency": "now" | "today" | "soon" | "whenever",
  "eventTitle": "string (original event title)",
  "category": "string"
}

Maximum 10 insights. Sort by urgency (now first). If no meaningful matches exist, return an empty array [].`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "[]";

    // Parse — handle potential markdown wrapping
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const insights: Insight[] = JSON.parse(cleaned);

    return NextResponse.json(insights);
  } catch {
    return NextResponse.json(buildFallbackInsights(events, friendsData));
  }
}
