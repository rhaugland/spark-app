// All available listeners users can subscribe to.
// Grouped by category for the UI.

export interface ListenerDef {
  source: string;       // e.g. "espn", "coinpaprika", "cultural"
  sourceId: string;     // unique ID within the source
  label: string;        // display name
  category: string;     // maps to friend interest categories
  group: string;        // UI grouping
  fetchConfig: unknown; // API-specific config
}

// ===== NFL TEAMS =====
const NFL_TEAMS: [string, string][] = [
  ["22", "Arizona Cardinals"], ["1", "Atlanta Falcons"], ["33", "Baltimore Ravens"],
  ["2", "Buffalo Bills"], ["29", "Carolina Panthers"], ["3", "Chicago Bears"],
  ["4", "Cincinnati Bengals"], ["5", "Cleveland Browns"], ["6", "Dallas Cowboys"],
  ["7", "Denver Broncos"], ["8", "Detroit Lions"], ["9", "Green Bay Packers"],
  ["34", "Houston Texans"], ["11", "Indianapolis Colts"], ["30", "Jacksonville Jaguars"],
  ["12", "Kansas City Chiefs"], ["13", "Las Vegas Raiders"], ["24", "Los Angeles Chargers"],
  ["14", "Los Angeles Rams"], ["15", "Miami Dolphins"], ["16", "Minnesota Vikings"],
  ["17", "New England Patriots"], ["18", "New Orleans Saints"], ["19", "New York Giants"],
  ["20", "New York Jets"], ["21", "Philadelphia Eagles"], ["23", "Pittsburgh Steelers"],
  ["26", "San Francisco 49ers"], ["25", "Seattle Seahawks"], ["27", "Tampa Bay Buccaneers"],
  ["10", "Tennessee Titans"], ["28", "Washington Commanders"],
];

// ===== NBA TEAMS =====
const NBA_TEAMS: [string, string][] = [
  ["1", "Atlanta Hawks"], ["2", "Boston Celtics"], ["17", "Brooklyn Nets"],
  ["30", "Charlotte Hornets"], ["4", "Chicago Bulls"], ["5", "Cleveland Cavaliers"],
  ["6", "Dallas Mavericks"], ["7", "Denver Nuggets"], ["8", "Detroit Pistons"],
  ["9", "Golden State Warriors"], ["10", "Houston Rockets"], ["11", "Indiana Pacers"],
  ["12", "LA Clippers"], ["13", "Los Angeles Lakers"], ["29", "Memphis Grizzlies"],
  ["14", "Miami Heat"], ["15", "Milwaukee Bucks"], ["16", "Minnesota Timberwolves"],
  ["3", "New Orleans Pelicans"], ["18", "New York Knicks"], ["25", "Oklahoma City Thunder"],
  ["19", "Orlando Magic"], ["20", "Philadelphia 76ers"], ["21", "Phoenix Suns"],
  ["22", "Portland Trail Blazers"], ["23", "Sacramento Kings"], ["24", "San Antonio Spurs"],
  ["28", "Toronto Raptors"], ["26", "Utah Jazz"], ["27", "Washington Wizards"],
];

// ===== MLB TEAMS =====
const MLB_TEAMS: [string, string][] = [
  ["15", "Arizona Diamondbacks"], ["1", "Atlanta Braves"], ["2", "Baltimore Orioles"],
  ["3", "Boston Red Sox"], ["16", "Chicago Cubs"], ["4", "Chicago White Sox"],
  ["17", "Cincinnati Reds"], ["5", "Cleveland Guardians"], ["27", "Colorado Rockies"],
  ["6", "Detroit Tigers"], ["18", "Houston Astros"], ["7", "Kansas City Royals"],
  ["19", "Los Angeles Angels"], ["20", "Los Angeles Dodgers"], ["28", "Miami Marlins"],
  ["8", "Milwaukee Brewers"], ["9", "Minnesota Twins"], ["21", "New York Mets"],
  ["10", "New York Yankees"], ["11", "Oakland Athletics"], ["22", "Philadelphia Phillies"],
  ["23", "Pittsburgh Pirates"], ["29", "San Diego Padres"], ["25", "San Francisco Giants"],
  ["12", "Seattle Mariners"], ["24", "St. Louis Cardinals"], ["30", "Tampa Bay Rays"],
  ["13", "Texas Rangers"], ["14", "Toronto Blue Jays"], ["26", "Washington Nationals"],
];

// ===== NHL TEAMS =====
const NHL_TEAMS: [string, string][] = [
  ["24", "Anaheim Ducks"], ["10", "Arizona Coyotes"], ["6", "Boston Bruins"],
  ["7", "Buffalo Sabres"], ["20", "Calgary Flames"], ["7", "Carolina Hurricanes"],
  ["16", "Chicago Blackhawks"], ["17", "Colorado Avalanche"], ["29", "Columbus Blue Jackets"],
  ["25", "Dallas Stars"], ["8", "Detroit Red Wings"], ["22", "Edmonton Oilers"],
  ["13", "Florida Panthers"], ["26", "Los Angeles Kings"], ["30", "Minnesota Wild"],
  ["8", "Montreal Canadiens"], ["18", "Nashville Predators"], ["9", "New Jersey Devils"],
  ["2", "New York Islanders"], ["3", "New York Rangers"], ["9", "Ottawa Senators"],
  ["4", "Philadelphia Flyers"], ["5", "Pittsburgh Penguins"], ["28", "San Jose Sharks"],
  ["55", "Seattle Kraken"], ["19", "St. Louis Blues"], ["14", "Tampa Bay Lightning"],
  ["10", "Toronto Maple Leafs"], ["23", "Vancouver Canucks"], ["37", "Vegas Golden Knights"],
  ["15", "Washington Capitals"], ["27", "Winnipeg Jets"],
];

// ===== SOCCER TEAMS (Premier League) =====
const EPL_TEAMS: [string, string][] = [
  ["359", "Arsenal"], ["362", "Aston Villa"], ["365", "Brighton"],
  ["363", "Chelsea"], ["384", "Crystal Palace"], ["368", "Everton"],
  ["398", "Fulham"], ["364", "Liverpool"], ["382", "Manchester City"],
  ["360", "Manchester United"], ["361", "Newcastle United"], ["395", "Nottingham Forest"],
  ["367", "Tottenham Hotspur"], ["383", "West Ham United"], ["380", "Wolverhampton"],
];

// ===== CRYPTO =====
const CRYPTO_COINS: [string, string][] = [
  ["btc-bitcoin", "Bitcoin (BTC)"],
  ["eth-ethereum", "Ethereum (ETH)"],
  ["sol-solana", "Solana (SOL)"],
  ["ada-cardano", "Cardano (ADA)"],
  ["doge-dogecoin", "Dogecoin (DOGE)"],
  ["xrp-xrp", "XRP"],
  ["dot-polkadot", "Polkadot (DOT)"],
  ["avax-avalanche", "Avalanche (AVAX)"],
  ["matic-polygon", "Polygon (MATIC)"],
  ["link-chainlink", "Chainlink (LINK)"],
];

// ===== CULTURAL / HERITAGE =====
export interface CulturalEvent {
  name: string;
  date: string; // MM-DD
  description: string;
}

const CULTURAL_GROUPS: { id: string; label: string; events: CulturalEvent[] }[] = [
  {
    id: "indian",
    label: "Indian Heritage",
    events: [
      { name: "Diwali", date: "10-20", description: "Festival of lights" },
      { name: "Holi", date: "03-14", description: "Festival of colors" },
      { name: "Navratri begins", date: "10-03", description: "Nine nights of dance and devotion" },
      { name: "Ganesh Chaturthi", date: "09-07", description: "Birthday of Lord Ganesha" },
      { name: "Raksha Bandhan", date: "08-19", description: "Celebration of sibling bond" },
      { name: "Indian Independence Day", date: "08-15", description: "India's independence anniversary" },
      { name: "Republic Day", date: "01-26", description: "India's republic celebration" },
      { name: "Pongal / Makar Sankranti", date: "01-14", description: "Harvest festival" },
      { name: "Eid al-Fitr", date: "03-30", description: "End of Ramadan celebration" },
      { name: "Dussehra", date: "10-12", description: "Victory of good over evil" },
    ],
  },
  {
    id: "chinese",
    label: "Chinese Heritage",
    events: [
      { name: "Chinese New Year", date: "01-29", description: "Lunar New Year celebration" },
      { name: "Mid-Autumn Festival", date: "09-21", description: "Moon festival, mooncakes" },
      { name: "Dragon Boat Festival", date: "05-31", description: "Dragon boat races, zongzi" },
      { name: "Qingming Festival", date: "04-04", description: "Tomb sweeping day" },
      { name: "Lantern Festival", date: "02-12", description: "End of New Year celebrations" },
    ],
  },
  {
    id: "mexican",
    label: "Mexican Heritage",
    events: [
      { name: "Dia de los Muertos", date: "11-01", description: "Day of the Dead" },
      { name: "Cinco de Mayo", date: "05-05", description: "Battle of Puebla victory" },
      { name: "Mexican Independence Day", date: "09-16", description: "El Grito de Independencia" },
      { name: "Dia de la Virgen de Guadalupe", date: "12-12", description: "Patron saint celebration" },
      { name: "Three Kings Day", date: "01-06", description: "Dia de los Reyes Magos" },
    ],
  },
  {
    id: "korean",
    label: "Korean Heritage",
    events: [
      { name: "Chuseok", date: "09-17", description: "Korean harvest moon festival" },
      { name: "Seollal", date: "01-29", description: "Korean Lunar New Year" },
      { name: "Korean Independence Day", date: "08-15", description: "Liberation Day" },
      { name: "Hangul Day", date: "10-09", description: "Korean alphabet day" },
    ],
  },
  {
    id: "japanese",
    label: "Japanese Heritage",
    events: [
      { name: "Cherry Blossom Season", date: "03-25", description: "Hanami season begins" },
      { name: "Obon", date: "08-13", description: "Festival honoring ancestors" },
      { name: "Tanabata", date: "07-07", description: "Star festival" },
      { name: "Shogatsu", date: "01-01", description: "Japanese New Year" },
      { name: "Golden Week", date: "04-29", description: "Cluster of Japanese holidays" },
    ],
  },
  {
    id: "jewish",
    label: "Jewish Heritage",
    events: [
      { name: "Rosh Hashanah", date: "09-22", description: "Jewish New Year" },
      { name: "Yom Kippur", date: "10-01", description: "Day of Atonement" },
      { name: "Hanukkah begins", date: "12-25", description: "Festival of lights" },
      { name: "Passover begins", date: "04-12", description: "Exodus commemoration" },
      { name: "Purim", date: "03-13", description: "Festival of Esther" },
    ],
  },
  {
    id: "african",
    label: "African Heritage",
    events: [
      { name: "Kwanzaa begins", date: "12-26", description: "African American cultural celebration" },
      { name: "Africa Day", date: "05-25", description: "Founding of the OAU" },
      { name: "Juneteenth", date: "06-19", description: "Emancipation celebration" },
      { name: "Black History Month", date: "02-01", description: "Celebrating Black history and culture" },
    ],
  },
  {
    id: "irish",
    label: "Irish Heritage",
    events: [
      { name: "St. Patrick's Day", date: "03-17", description: "Irish cultural celebration" },
      { name: "Bloomsday", date: "06-16", description: "James Joyce literary celebration" },
    ],
  },
  {
    id: "italian",
    label: "Italian Heritage",
    events: [
      { name: "Festa della Repubblica", date: "06-02", description: "Italian Republic Day" },
      { name: "Ferragosto", date: "08-15", description: "Summer holiday celebration" },
      { name: "Italian Heritage Month", date: "10-01", description: "Celebrating Italian American culture" },
    ],
  },
  {
    id: "german",
    label: "German Heritage",
    events: [
      { name: "Oktoberfest begins", date: "09-20", description: "World's largest beer festival" },
      { name: "German Unity Day", date: "10-03", description: "Reunification anniversary" },
    ],
  },
  {
    id: "filipino",
    label: "Filipino Heritage",
    events: [
      { name: "Philippine Independence Day", date: "06-12", description: "Araw ng Kalayaan" },
      { name: "Sinulog Festival", date: "01-19", description: "Cebu's biggest celebration" },
      { name: "Filipino American History Month", date: "10-01", description: "Celebrating Filipino heritage" },
    ],
  },
  {
    id: "arab",
    label: "Arab Heritage",
    events: [
      { name: "Eid al-Fitr", date: "03-30", description: "End of Ramadan" },
      { name: "Eid al-Adha", date: "06-06", description: "Festival of sacrifice" },
      { name: "Ramadan begins", date: "02-28", description: "Holy month of fasting" },
      { name: "Arab American Heritage Month", date: "04-01", description: "Celebrating Arab heritage" },
    ],
  },
];

export function buildCatalog(): ListenerDef[] {
  const catalog: ListenerDef[] = [];

  // NFL
  for (const [id, name] of NFL_TEAMS) {
    catalog.push({
      source: "espn", sourceId: `nfl-${id}`, label: name,
      category: "nfl", group: "NFL",
      fetchConfig: { sport: "football", league: "nfl", teamId: id },
    });
  }

  // NBA
  for (const [id, name] of NBA_TEAMS) {
    catalog.push({
      source: "espn", sourceId: `nba-${id}`, label: name,
      category: "nba", group: "NBA",
      fetchConfig: { sport: "basketball", league: "nba", teamId: id },
    });
  }

  // MLB
  for (const [id, name] of MLB_TEAMS) {
    catalog.push({
      source: "espn", sourceId: `mlb-${id}`, label: name,
      category: "mlb", group: "MLB",
      fetchConfig: { sport: "baseball", league: "mlb", teamId: id },
    });
  }

  // NHL
  for (const [id, name] of NHL_TEAMS) {
    catalog.push({
      source: "espn", sourceId: `nhl-${id}`, label: name,
      category: "nhl", group: "NHL",
      fetchConfig: { sport: "hockey", league: "nhl", teamId: id },
    });
  }

  // EPL Soccer
  for (const [id, name] of EPL_TEAMS) {
    catalog.push({
      source: "espn", sourceId: `epl-${id}`, label: name,
      category: "soccer", group: "Premier League",
      fetchConfig: { sport: "soccer", league: "eng.1", teamId: id },
    });
  }

  // Crypto
  for (const [id, name] of CRYPTO_COINS) {
    catalog.push({
      source: "coinpaprika", sourceId: `crypto-${id}`, label: name,
      category: "crypto", group: "Crypto",
      fetchConfig: { coinId: id },
    });
  }

  // Cultural
  for (const group of CULTURAL_GROUPS) {
    catalog.push({
      source: "cultural", sourceId: `culture-${group.id}`, label: group.label,
      category: "cultural", group: "Cultural / Heritage",
      fetchConfig: { events: group.events },
    });
  }

  return catalog;
}

export const CATALOG = buildCatalog();
