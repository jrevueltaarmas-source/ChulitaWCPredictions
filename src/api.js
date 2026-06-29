const TEAM_MAP = {
  "United States":"USA","United States of America":"USA","US":"USA","USMNT":"USA",
  "Bosnia and Herzegovina":"Bosnia-Herz.","Bosnia & Herzegovina":"Bosnia-Herz.","Bosnia":"Bosnia-Herz.","Bosnia-Herzegovina":"Bosnia-Herz.",
  "Ivory Coast":"Ivory Coast","Côte d'Ivoire":"Ivory Coast","Cote d'Ivoire":"Ivory Coast","Cote D'Ivoire":"Ivory Coast",
  "Curaçao":"Curaçao","Curacao":"Curaçao",
  "DR Congo":"DR Congo","Democratic Republic of Congo":"DR Congo","Congo DR":"DR Congo","Congo":"DR Congo","Congo (DR)":"DR Congo",
  "South Korea":"South Korea","Korea Republic":"South Korea","Republic of Korea":"South Korea","Korea":"South Korea","Korea, South":"South Korea",
  "Saudi Arabia":"Saudi Arabia","KSA":"Saudi Arabia",
  "Cape Verde":"Cape Verde","Cabo Verde":"Cape Verde","Cape Verde Islands":"Cape Verde",
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

// openfootball worldcup.json — public domain, no API key, no CORS issues
const SOURCES = [
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json",
  "https://cdn.jsdelivr.net/gh/openfootball/worldcup.json@master/2026/worldcup.json",
];

function parseOpenfootball(data) {
  // The matches can be either directly in data.matches OR nested in data.rounds[].matches
  let allMatches = [];
  if (Array.isArray(data.matches)) {
    allMatches = data.matches;
  } else if (Array.isArray(data.rounds)) {
    data.rounds.forEach(r => { allMatches = allMatches.concat(r.matches || []); });
  }

  const results = [];
  allMatches.forEach(m => {
    const sc = m.score;
    let gh = null, ga = null;
    if (sc && Array.isArray(sc.ft)) {
      gh = sc.ft[0]; ga = sc.ft[1];
    }
    if (gh === null || ga === null || gh === undefined || ga === undefined) return;
    const home = normTeam(m.team1?.name || m.team1);
    const away = normTeam(m.team2?.name || m.team2);
    if (!home || !away) return;
    results.push({ home, away, goalsHome: parseInt(gh), goalsAway: parseInt(ga) });
  });
  return results.filter(g => !isNaN(g.goalsHome) && !isNaN(g.goalsAway));
}

export async function fetchResults() {
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!res.ok) continue;
      const data = await res.json();
      const parsed = parseOpenfootball(data);
      if (parsed.length > 0) return parsed;
    } catch (e) {
      continue;
    }
  }
  console.warn("All result sources failed");
  return null;
}
