import { db } from "@/db";
import { listeners } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface RawEvent {
  title: string;
  detail: string;
  type: string;
  time: string;
  date: string; // actual date like "Oct 3" or "Sep 29, 4:25 PM"
  category: string;
  listenerLabel: string;
}

export async function fetchEvents(): Promise<RawEvent[]> {
  const activeListeners = await db
    .select()
    .from(listeners)
    .where(eq(listeners.active, true));

  const feedItems: RawEvent[] = [];

  const espnListeners = activeListeners.filter((l) => l.source === "espn");
  const cryptoListeners = activeListeners.filter((l) => l.source === "coinpaprika");
  const culturalListeners = activeListeners.filter((l) => l.source === "cultural");
  const customListeners = activeListeners.filter((l) => l.source === "custom");

  // ===== ESPN =====
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

        for (const ev of data.events || []) {
          const competitors = ev.competitions?.[0]?.competitors || [];
          const teamIds = competitors.map((c: { team: { id: string } }) => c.team.id);

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

            let title: string, detail: string, time: string, date: string;

            if (status === "Final") {
              const ourTeamHome = home.team.id === config.teamId;
              const ourScore = ourTeamHome ? homeScore : awayScore;
              const theirScore = ourTeamHome ? awayScore : homeScore;
              const won = parseInt(ourScore) > parseInt(theirScore);
              title = `${awayName} ${awayScore} @ ${homeName} ${homeScore}`;
              detail = `${listener.label} ${won ? "WIN" : "LOSS"} - ${status}`;
              time = "Final";
              const gd = new Date(ev.date);
              date = gd.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            } else if (status === "In Progress") {
              title = `LIVE: ${awayName} ${awayScore} @ ${homeName} ${homeScore}`;
              detail = ev.status?.type?.detail || "In Progress";
              time = "LIVE";
              date = "Now";
            } else {
              const gameDate = new Date(ev.date);
              title = `${awayName} @ ${homeName}`;
              detail = `${status} - ${gameDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
              time = gameDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
              date = gameDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            }

            feedItems.push({ title, detail, type: "sports", time, date, category: listener.category, listenerLabel: listener.label });
          }
        }
      } catch {
        // skip
      }
    }
  );

  // ===== CRYPTO =====
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
      const symbol = data.symbol || "";

      feedItems.push({
        title: `${symbol} $${price >= 1 ? price.toLocaleString("en-US", { maximumFractionDigits: 0 }) : price.toFixed(4)}`,
        detail: `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}% in 24h`,
        type: "market",
        time: "Live",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        category: "crypto",
        listenerLabel: listener.label,
      });
    } catch {
      // skip
    }
  });

  // ===== CULTURAL + CUSTOM =====
  const today = new Date();
  for (const listener of [...culturalListeners, ...customListeners]) {
    const config = listener.config as { events?: { name: string; date: string; description: string }[] };
    for (const ev of config.events || []) {
      if (!ev.date) continue;
      const evDate = new Date(`${today.getFullYear()}-${ev.date}T00:00:00`);
      const diff = Math.ceil((evDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diff >= -1 && diff <= 14) {
        const timeLabel = diff < 0 ? "Yesterday" : diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `In ${diff} days`;
        const dateLabel = evDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        feedItems.push({
          title: ev.name,
          detail: ev.description,
          type: diff === 0 ? "event" : "upcoming",
          time: timeLabel,
          date: dateLabel,
          category: listener.source === "custom" ? "custom" : "cultural",
          listenerLabel: listener.label,
        });
      }
    }
  }

  await Promise.all([...espnPromises, ...cryptoPromises]);

  // Sort
  const typePriority: Record<string, number> = { event: 0, sports: 1, market: 2, upcoming: 3 };
  feedItems.sort((a, b) => {
    if (a.time === "LIVE" && b.time !== "LIVE") return -1;
    if (b.time === "LIVE" && a.time !== "LIVE") return 1;
    if (a.time === "Today" && b.time !== "Today") return -1;
    if (b.time === "Today" && a.time !== "Today") return 1;
    return (typePriority[a.type] || 5) - (typePriority[b.type] || 5);
  });

  return feedItems;
}
