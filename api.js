const TEAM_MAP = {
  "United States":"USA","United States of America":"USA","US":"USA","USMNT":"USA",
  "Bosnia and Herzegovina":"Bosnia-Herz.","Bosnia & Herzegovina":"Bosnia-Herz.","Bosnia":"Bosnia-Herz.",
  "Ivory Coast":"Ivory Coast","Côte d'Ivoire":"Ivory Coast","Cote d'Ivoire":"Ivory Coast","Cote D'Ivoire":"Ivory Coast",
  "Curaçao":"Curaçao","Curacao":"Curaçao",
  "DR Congo":"DR Congo","Democratic Republic of Congo":"DR Congo","Congo DR":"DR Congo","Congo":"DR Congo",
  "South Korea":"South Korea","Korea Republic":"South Korea","Republic of Korea":"South Korea","Korea":"South Korea",
  "Saudi Arabia":"Saudi Arabia","KSA":"Saudi Arabia",
  "Cape Verde":"Cape Verde","Cabo Verde":"Cape Verde",
  "Czech Republic":"Czech Republic","Czechia":"Czech Republic",
  "Netherlands":"Netherlands","Holland":"Netherlands",
  "Turkey":"Turkey","Türkiye":"Turkey","Turkiye":"Turkey",
  "South Africa":"South Africa",
};

function normTeam(name) {
  if (!name) return name;
  const trimmed = String(name).trim();
  return TEAM_MAP[trimmed] || trimmed;
}

function parseGames(raw) {
  const games = Array.isArray(raw) ? raw : (raw.games || raw.matches || raw.data || raw.response || []);
  return games
    .map(g => {
      const home = normTeam(g.home_team?.name || g.home_team || g.home || g.homeTeam ||
                            g.teams?.home?.name || g.strHomeTeam);
      const away = normTeam(g.away_team?.name || g.away_team || g.away || g.awayTeam ||
                            g.teams?.away?.name || g.strAwayTeam);
      let gh = g.home_score ?? g.homeScore ?? g.score?.home ?? g.goals?.home ??
               g.intHomeScore ?? g.scores?.home;
      let ga = g.away_score ?? g.awayScore ?? g.score?.away ?? g.goals?.away ??
               g.intAwayScore ?? g.scores?.away;
      gh = (gh === "" || gh === null || gh === undefined) ? null : parseInt(gh);
      ga = (ga === "" || ga === null || ga === undefined) ? null : parseInt(ga);
      return { home, away, goalsHome: gh, goalsAway: ga };
    })
    .filter(g => g.home && g.away &&
                 g.goalsHome !== null && !isNaN(g.goalsHome) &&
                 g.goalsAway !== null && !isNaN(g.goalsAway));
}

const SOURCES = [
  "https://worldcup26.ir/get/games",
  "https://corsproxy.io/?url=" + encodeURIComponent("https://worldcup26.ir/get/games"),
  "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://worldcup26.ir/get/games"),
];

export async function fetchResults() {
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!res.ok) continue;
      const data = await res.json();
      const parsed = parseGames(data);
      if (parsed.length > 0) return parsed;
    } catch (e) {
      continue;
    }
  }
  console.warn("All result sources failed");
  return null;
}
