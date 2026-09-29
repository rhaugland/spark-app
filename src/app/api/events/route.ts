import { NextResponse } from "next/server";
import { db } from "@/db";
import { friends, interests, listeners } from "@/db/schema";
import { eq } from "drizzle-orm";

interface FeedItem {
  title: string;
  detail: string;
  type: string;
  time: string;
  category: string;
  listenerLabel: string;
  friends: { id: string; name: string }[];
}

export async function GET() {
  const activeListeners = await db
    .select()
    .from(listeners)
    .where(eq(listeners.active, true));

  const allFriends = await db.select().from(friends);
  const allInterests = await db.select().from(interests);

  const friendsMap = allFriends.map((f) => ({
    ...f,
    interests: allInterests.filter((i) => i.friendId === f.id),
  }));

  const feedItems: FeedItem[] = [];

  // Group listeners by source for batched fetching
  const espnListeners = activeListeners.filter((l) => l.source === "espn");
  const cryptoListeners = activeListeners.filter((l) => l.source === "coinpaprika");
  const culturalListeners = activeListeners.filter((l) => l.source === "cultural");

  // ===== ESPN: Fetch scores =====
  // Group by league to minimize API calls
  const leagueGroups = new Map<string, typeof espnListeners>();
  for (const l of espnListeners) {
    const config = l.config as { sport: string; league: string; teamId: string };
    const key = `${config.sport}/${config.league}`;
    if (!leagueGroups.has(key)) leagueGroups.set(key, []);
    leagueGroups.get(key)!.push(l);
  }

  const espnPromises = Array.from(leagueGroups.entries()).map(
    async ([leagueKey, leagueListeners]) => {
      try {
        const res = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/${leagueKey}/scoreboard`,
          { next: { revalidate: 300 } }
        );
        if (!res.ok) return;
        const data = await res.json();
        const events = data.events || [];

        for (const ev of events) {
          const competitors = ev.competitions?.[0]?.competitors || [];
          const teamIds = competitors.map((c: { team: { id: string } }) => c.team.id);

          // Check if any of our listened teams are in this game
          for (const listener of leagueListeners) {
            const config = listener.config as { teamId: string };
            if (!teamIds.includes(config.teamId)) continue;

            const home = competitors.find((c: { homeAway: string }) => c.homeAway === "home");
            const away = competitors.find((c: { homeAway: string }) => c.homeAway === "away");
            if (!home || !away) continue;

            const status = ev.status?.type?.description || "Scheduled";
            const homeScore = home.score || "0";
            const awayScore = away.score || "0";
            const homeName = home.team?.displayName || "Home";
            const awayName = away.team?.displayName || "Away";

            let title: string;
            let detail: string;
            let time: string;

            if (status === "Final") {
              const ourTeamHome = home.team.id === config.teamId;
              const ourScore = ourTeamHome ? homeScore : awayScore;
              const theirScore = ourTeamHome ? awayScore : homeScore;
              const won = parseInt(ourScore) > parseInt(theirScore);
              title = `${awayName} ${awayScore} @ ${homeName} ${homeScore}`;
              detail = `${listener.label} ${won ? "WIN" : "LOSS"} - ${status}`;
              time = "Final";
            } else if (status === "In Progress") {
              title = `LIVE: ${awayName} ${awayScore} @ ${homeName} ${homeScore}`;
              detail = ev.status?.type?.detail || "In Progress";
              time = "LIVE";
            } else {
              const gameDate = new Date(ev.date);
              title = `${awayName} @ ${homeName}`;
              detail = `${status} - ${gameDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
              time = gameDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            }

            // Match to friends
            const matched = friendsMap.filter((f) =>
              f.interests.some(
                (i) =>
                  i.category === listener.category ||
                  i.label.toLowerCase().includes(listener.label.toLowerCase()) ||
                  listener.label.toLowerCase().includes(i.label.toLowerCase())
              )
            );

            feedItems.push({
              title,
              detail,
              type: "sports",
              time,
              category: listener.category,
              listenerLabel: listener.label,
              friends: matched.map((f) => ({ id: f.id, name: f.name })),
            });
          }
        }
      } catch {
        // Skip failed league
      }
    }
  );

  // ===== CRYPTO: Fetch prices =====
  const cryptoPromises = cryptoListeners.map(async (listener) => {
    try {
      const config = listener.config as { coinId: string };
      const res = await fetch(
        `https://api.coinpaprika.com/v1/tickers/${config.coinId}`,
        { next: { revalidate: 300 } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const price = data.quotes?.USD?.price || 0;
      const change24h = data.quotes?.USD?.percent_change_24h || 0;
      const direction = change24h >= 0 ? "up" : "down";
      const symbol = data.symbol || "";

      const title = `${symbol} $${price >= 1 ? price.toLocaleString("en-US", { maximumFractionDigits: 0 }) : price.toFixed(4)}`;
      const detail = `${direction === "up" ? "+" : ""}${change24h.toFixed(2)}% in 24h`;

      const matched = friendsMap.filter((f) =>
        f.interests.some(
          (i) =>
            i.category === "crypto" ||
            i.label.toLowerCase().includes("crypto") ||
            i.label.toLowerCase().includes(symbol.toLowerCase()) ||
            i.label.toLowerCase().includes(data.name?.toLowerCase() || "")
        )
      );

      feedItems.push({
        title,
        detail,
        type: "market",
        time: "Live",
        category: "crypto",
        listenerLabel: listener.label,
        friends: matched.map((f) => ({ id: f.id, name: f.name })),
      });
    } catch {
      // Skip failed coin
    }
  });

  // ===== CULTURAL: Check calendar =====
  for (const listener of culturalListeners) {
    const config = listener.config as { events: { name: string; date: string; description: string }[] };
    const today = new Date();
    const todayMD = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    for (const ev of config.events || []) {
      const evDate = new Date(`${today.getFullYear()}-${ev.date}T00:00:00`);
      const diff = Math.ceil((evDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diff >= -1 && diff <= 14) {
        const timeLabel =
          diff < 0 ? "Yesterday" :
          diff === 0 ? "Today" :
          diff === 1 ? "Tomorrow" :
          `In ${diff} days`;

        const matched = friendsMap.filter((f) =>
          f.interests.some(
            (i) =>
              i.category === "cultural" ||
              i.label.toLowerCase().includes(listener.label.toLowerCase().replace(" heritage", "")) ||
              listener.label.toLowerCase().includes(i.label.toLowerCase())
          )
        );

        feedItems.push({
          title: ev.name,
          detail: ev.description,
          type: diff === 0 ? "event" : "upcoming",
          time: timeLabel,
          category: "cultural",
          listenerLabel: listener.label,
          friends: matched.map((f) => ({ id: f.id, name: f.name })),
        });
      }
    }
  }

  // ===== BIRTHDAYS from friends =====
  for (const f of friendsMap) {
    if (!f.birthday) continue;
    const today = new Date();
    const bday = new Date(f.birthday + "T00:00:00");
    bday.setFullYear(today.getFullYear());
    const diff = Math.ceil((bday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff <= 7) {
      const label = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `In ${diff} days`;
      feedItems.push({
        title: `${f.name}'s birthday is ${label.toLowerCase()}!`,
        detail: diff === 0 ? "Send them something special" : "Get something ready",
        type: "birthday",
        time: label,
        category: "birthday",
        listenerLabel: "Birthdays",
        friends: [{ id: f.id, name: f.name }],
      });
    }
  }

  await Promise.all([...espnPromises, ...cryptoPromises]);

  // Sort: live/today first, then by type priority
  const typePriority: Record<string, number> = {
    birthday: 0, event: 1, sports: 2, market: 3, upcoming: 4,
  };
  feedItems.sort((a, b) => {
    if (a.time === "LIVE" && b.time !== "LIVE") return -1;
    if (b.time === "LIVE" && a.time !== "LIVE") return 1;
    if (a.time === "Today" && b.time !== "Today") return -1;
    if (b.time === "Today" && a.time !== "Today") return 1;
    return (typePriority[a.type] || 5) - (typePriority[b.type] || 5);
  });

  return NextResponse.json(feedItems);
}
