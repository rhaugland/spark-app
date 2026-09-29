import { NextResponse } from "next/server";
import { db } from "@/db";
import { friends, interests } from "@/db/schema";

// Simulated event sources — in production these would be real API calls
const EVENT_SOURCES = [
  { categories: ["nfl"], title: "Bears lose to Packers 17-24", detail: "Chicago Bears fall again in NFC North rivalry", time: "2h ago", type: "sports" },
  { categories: ["nfl"], title: "Chiefs defeat Ravens 31-20", detail: "Mahomes throws 4 TDs in dominant performance", time: "3h ago", type: "sports" },
  { categories: ["bourbon"], title: "Buffalo Trace Single Barrel Select drops", detail: "Limited release hitting shelves today", time: "4h ago", type: "release" },
  { categories: ["golf"], title: "Ryder Cup Day 2 results", detail: "USA trails Europe 6.5 to 9.5 heading into singles", time: "1h ago", type: "sports" },
  { categories: ["nba"], title: "NBA preseason tips off", detail: "First preseason games start this week", time: "6h ago", type: "sports" },
  { categories: ["beer"], title: "Goose Island BCBS variants announced", detail: "2026 Bourbon County lineup revealed: 5 variants", time: "5h ago", type: "release" },
  { categories: ["mlb"], title: "MLB Playoff bracket set", detail: "Wild card series begins Tuesday", time: "8h ago", type: "sports" },
  { categories: ["crypto"], title: "Bitcoin breaks $95K", detail: "New ATH amid ETF inflow surge", time: "30m ago", type: "market" },
  { categories: ["stocks"], title: "NVDA up 8% after earnings beat", detail: "Revenue guidance crushes estimates", time: "1h ago", type: "market" },
  { categories: ["music"], title: "Kendrick drops surprise album", detail: 'New album "Spirit Level" available now', time: "2h ago", type: "release" },
  { categories: ["mma"], title: "UFC 310 results", detail: "Main event ends in shocking KO in round 1", time: "4h ago", type: "sports" },
  { categories: ["fishing"], title: "Fall salmon run peaks this week", detail: "Lake Michigan tributaries seeing heavy runs", time: "12h ago", type: "seasonal" },
  { categories: ["gaming"], title: "GTA VI trailer #3 released", detail: "New gameplay footage shows Vice City map", time: "1h ago", type: "release" },
  { categories: ["cars"], title: "2027 Porsche 911 GT3 revealed", detail: "New naturally aspirated flat-six with 510hp", time: "3h ago", type: "release" },
  { categories: ["cooking"], title: "New season of The Bear drops", detail: "Season 4 streaming now on Hulu", time: "6h ago", type: "release" },
  { categories: ["fitness"], title: "Chicago Marathon this weekend", detail: "Race day Sunday, road closures in effect", time: "1d ago", type: "event" },
  { categories: ["travel"], title: "Fare sale: Chicago to Tokyo $489 RT", detail: "ANA direct flights, travel Jan-Mar", time: "2h ago", type: "deal" },
  { categories: ["soccer"], title: "Premier League: Arsenal 3 - Chelsea 1", detail: "Arsenal extend lead at the top of the table", time: "5h ago", type: "sports" },
  { categories: ["wine"], title: "Beaujolais Nouveau release day", detail: "2026 vintage arrives this Thursday", time: "1d ago", type: "release" },
  { categories: ["hiking"], title: "Fall colors peaking in Starved Rock", detail: "Peak foliage this weekend, trails open", time: "8h ago", type: "seasonal" },
  { categories: ["coffee"], title: "Intelligentsia single origin drop", detail: "New Ethiopian Yirgacheffe limited batch", time: "3h ago", type: "release" },
  { categories: ["nhl"], title: "Blackhawks home opener tonight", detail: "Hawks vs Red Wings, 7:30pm at United Center", time: "5h ago", type: "sports" },
];

export async function GET() {
  const allFriends = await db.select().from(friends);
  const allInterests = await db.select().from(interests);

  const friendsWithInterests = allFriends.map((f) => ({
    ...f,
    interests: allInterests.filter((i) => i.friendId === f.id),
  }));

  // Match events to friends
  const matched = EVENT_SOURCES.map((ev) => {
    const matchedFriends = friendsWithInterests.filter((f) =>
      f.interests.some((i) =>
        ev.categories.includes(i.category || "") ||
        ev.categories.some((c) => i.label.toLowerCase().includes(c))
      )
    );
    return { ...ev, friends: matchedFriends };
  }).filter((ev) => ev.friends.length > 0);

  // Add birthday events
  const today = new Date();
  friendsWithInterests.forEach((f) => {
    if (!f.birthday) return;
    const bday = new Date(f.birthday + "T00:00:00");
    bday.setFullYear(today.getFullYear());
    const diff = Math.ceil((bday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff <= 7) {
      const label = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `In ${diff} days`;
      matched.unshift({
        categories: ["birthday"],
        title: `${f.name}'s birthday is ${label.toLowerCase()}!`,
        detail: diff === 0 ? "Send them something special" : "Get something ready",
        time: label,
        type: "birthday",
        friends: [f],
      });
    }
  });

  return NextResponse.json(matched);
}
