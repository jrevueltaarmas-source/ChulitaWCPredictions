const BASE = "https://worldcup26.ir/get";

const TEAM_MAP = {
  "United States":"USA","United States of America":"USA",
  "Bosnia and Herzegovina":"Bosnia-Herz.","Bosnia & Herzegovina":"Bosnia-Herz.",
  "Ivory Coast":"Ivory Coast","Côte d'Ivoire":"Ivory Coast","Cote d'Ivoire":"Ivory Coast",
  "Curaçao":"Curaçao","Curacao":"Curaçao",
  "DR Congo":"DR Congo","Democratic Republic of Congo":"DR Congo","Congo DR":"DR Congo",
  "South Korea":"South Korea","Korea Republic":"South Korea","Republic of Korea":"South Korea",
  "Saudi Arabia":"Saudi Arabia","KSA":"Saudi Arabia",
  "Cape Verde":"Cape Verde","Cabo Verde":"Cape Verde",
  "Czech Republic":"Czech Republic","Czechia":"Czech Republic",
  "Netherlands":"Netherlands","Holland":"Netherlands",
};

function normTeam(name) {
  if (!name) return name;
  return TEAM_MAP[name] || name;
}

export async function fetchResults() {
  try {
    const res = await fetch(`${BASE}/games`, {
      headers: { "Accept": "application/json" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const games = Array.isArray(data) ? data : (data.games || data.matches || data.data || []);
    return games
      .filter(g => g.home_score !== null && g.home_score !== undefined &&
                   g.away_score !== null && g.away_score !== undefined)
      .map(g => ({
        home: normTeam(g.home_team?.name || g.home || g.homeTeam),
        away: normTeam(g.away_team?.name || g.away || g.awayTeam),
        goalsHome: parseInt(g.home_score ?? g.homeScore ?? g.score?.home),
        goalsAway: parseInt(g.away_score ?? g.awayScore ?? g.score?.away),
        status: g.status || g.state || "FINISHED",
      }))
      .filter(g => g.home && g.away && !isNaN(g.goalsHome) && !isNaN(g.goalsAway));
  } catch (e) {
    console.warn("API fetch failed:", e.message);
    return null;
  }
}
