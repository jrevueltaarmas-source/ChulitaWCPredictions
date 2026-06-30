import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase.js";
import { fetchResults } from "./api.js";

// ─── Vintage American Sport theme ─────────────────────────────────────────────
const T = {
  navy:"#0E3A53", navyDark:"#0A2A3D", red:"#C8102E", redDark:"#A50D26",
  green:"#006847", gold:"#F4B81E", cream:"#F2E8D5", card:"#FBF4E5",
  ink:"#22201C", mute:"#9E927C", line:"#E2D2B2", lineSoft:"#EBDCC6",
  jBlue:"#1B86A8", jBlueOn:"#1B86A8", gGold:"#C68A12",
  boardBg:"#161412", boardEdge:"#463C2E",
  jDigit:"#37C6F4", gDigit:"#FFC247",
};
const ROUND_COLORS = {
  "ROUND OF 32":"#0E3A53","ROUND OF 16":"#0E3A53","QUARTER-FINALS":"#5B2C6F",
  "SEMI-FINALS":"#C8102E","3rd PLACE":"#5D6D7E","FINAL ⚽":"#006847",
};
// Flag emoji per team
const FLAGS = {
  "Mexico":"🇲🇽","South Korea":"🇰🇷","South Africa":"🇿🇦","Czech Republic":"🇨🇿",
  "Canada":"🇨🇦","Bosnia-Herz.":"🇧🇦","Qatar":"🇶🇦","Switzerland":"🇨🇭",
  "Brazil":"🇧🇷","Morocco":"🇲🇦","Scotland":"🏴󠁧󠁢󠁳󠁣󠁴󠁿","Haiti":"🇭🇹",
  "USA":"🇺🇸","Paraguay":"🇵🇾","Australia":"🇦🇺","Turkey":"🇹🇷",
  "Germany":"🇩🇪","Ecuador":"🇪🇨","Ivory Coast":"🇨🇮","Curaçao":"🇨🇼",
  "Netherlands":"🇳🇱","Japan":"🇯🇵","Sweden":"🇸🇪","Tunisia":"🇹🇳",
  "Belgium":"🇧🇪","Iran":"🇮🇷","Egypt":"🇪🇬","New Zealand":"🇳🇿",
  "Spain":"🇪🇸","Uruguay":"🇺🇾","Saudi Arabia":"🇸🇦","Cape Verde":"🇨🇻",
  "France":"🇫🇷","Senegal":"🇸🇳","Norway":"🇳🇴","Iraq":"🇮🇶",
  "Argentina":"🇦🇷","Austria":"🇦🇹","Algeria":"🇩🇿","Jordan":"🇯🇴",
  "Portugal":"🇵🇹","Colombia":"🇨🇴","Uzbekistan":"🇺🇿","DR Congo":"🇨🇩",
  "England":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","Croatia":"🇭🇷","Ghana":"🇬🇭","Panama":"🇵🇦",
};
const flag = (t) => FLAGS[t] || "";

// Inject Google Fonts once
function useFonts() {
  useEffect(() => {
    if (document.getElementById("wc-fonts")) return;
    const l = document.createElement("link");
    l.id = "wc-fonts"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap";
    document.head.appendChild(l);
  }, []);
}
const FONT_DISPLAY = "'Anton',system-ui,sans-serif";
const FONT_COND = "'Oswald',system-ui,sans-serif";
const FONT_BODY = "'DM Sans',system-ui,sans-serif";

// Parse "Sun 28 Jun" + "HH:MM" into a sortable number
const MONTHS = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
function chronoKey(dateStr, timeStr) {
  // dateStr like "Sun 28 Jun"; timeStr like "20:00" (Canaries)
  let day=0, mon=5;
  if (dateStr) {
    const parts = dateStr.split(" ");
    parts.forEach(p => {
      if (/^\d+$/.test(p)) day = parseInt(p);
      if (MONTHS[p] !== undefined) mon = MONTHS[p];
    });
  }
  let h=0, mi=0;
  if (timeStr && timeStr.includes(":")) { const [a,b]=timeStr.split(":"); h=parseInt(a)||0; mi=parseInt(b)||0; }
  // Times after midnight (00:00–07:59) belong to the late-night slot of the listed date,
  // so keep them after evening games by adding 24h.
  const slot = h < 8 ? h + 24 : h;
  return (mon*100 + day)*10000 + slot*100 + mi;
}


// ─── Data ─────────────────────────────────────────────────────────────────────
const GROUP_TEAMS = {
  A:["Mexico","South Korea","South Africa","Czech Republic"],
  B:["Canada","Bosnia-Herz.","Qatar","Switzerland"],
  C:["Brazil","Morocco","Scotland","Haiti"],
  D:["USA","Paraguay","Australia","Turkey"],
  E:["Germany","Ecuador","Ivory Coast","Curaçao"],
  F:["Netherlands","Japan","Sweden","Tunisia"],
  G:["Belgium","Iran","Egypt","New Zealand"],
  H:["Spain","Uruguay","Saudi Arabia","Cape Verde"],
  I:["France","Senegal","Norway","Iraq"],
  J:["Argentina","Austria","Algeria","Jordan"],
  K:["Portugal","Colombia","Uzbekistan","DR Congo"],
  L:["England","Croatia","Ghana","Panama"],
};

const KO_LABELS = {
  P73:["2nd A","2nd B"], P74:["1st E","Best 3rd"], P75:["1st F","2nd C"],
  P76:["1st C","2nd F"], P77:["1st I","Best 3rd"], P78:["2nd E","2nd I"],
  P79:["1st A","Best 3rd"], P80:["1st L","Best 3rd"], P81:["1st D","Best 3rd"],
  P82:["1st G","Best 3rd"], P83:["2nd K","2nd L"], P84:["1st H","2nd J"],
  P85:["1st B","Best 3rd"], P86:["1st J","2nd H"], P87:["1st K","Best 3rd"],
  P88:["2nd D","2nd G"],
  P89:["W74","W77"], P90:["W73","W75"], P91:["W76","W78"], P92:["W79","W80"],
  P93:["W83","W84"], P94:["W81","W82"], P95:["W86","W88"], P96:["W85","W87"],
  P97:["W89","W90"], P98:["W93","W94"], P99:["W91","W92"], P100:["W95","W96"],
  P101:["W97","W98"], P102:["W99","W100"],
  P103:["L101","L102"], P104:["W101","W102"],
};

const INITIAL_GS = [{"id":"gs_6","date":"Thu 11 Jun","canaries":"20:00","romania":"22:00","group":"A","home":"Mexico","away":"South Africa","venue":"Mexico City"},{"id":"gs_7","date":"Thu 11 Jun","canaries":"22:00","romania":"00:00","group":"A","home":"South Korea","away":"Czech Republic","venue":"Guadalajara"},{"id":"gs_9","date":"Fri 12 Jun","canaries":"19:00","romania":"21:00","group":"B","home":"Canada","away":"Bosnia-Herz.","venue":"Toronto"},{"id":"gs_10","date":"Fri 12 Jun","canaries":"22:00","romania":"00:00","group":"D","home":"USA","away":"Paraguay","venue":"Los Angeles"},{"id":"gs_12","date":"Sat 13 Jun","canaries":"18:00","romania":"20:00","group":"B","home":"Qatar","away":"Switzerland","venue":"San Francisco"},{"id":"gs_13","date":"Sat 13 Jun","canaries":"21:00","romania":"23:00","group":"C","home":"Brazil","away":"Morocco","venue":"New Jersey"},{"id":"gs_15","date":"Sun 14 Jun","canaries":"00:00","romania":"02:00","group":"C","home":"Haiti","away":"Scotland","venue":"Boston"},{"id":"gs_16","date":"Sun 14 Jun","canaries":"03:00","romania":"05:00","group":"D","home":"Australia","away":"Turkey","venue":"Vancouver"},{"id":"gs_17","date":"Sun 14 Jun","canaries":"16:00","romania":"18:00","group":"E","home":"Germany","away":"Curaçao","venue":"Houston"},{"id":"gs_18","date":"Sun 14 Jun","canaries":"19:00","romania":"21:00","group":"F","home":"Netherlands","away":"Japan","venue":"Dallas"},{"id":"gs_19","date":"Sun 14 Jun","canaries":"22:00","romania":"00:00","group":"E","home":"Ivory Coast","away":"Ecuador","venue":"Philadelphia"},{"id":"gs_21","date":"Mon 15 Jun","canaries":"01:00","romania":"03:00","group":"F","home":"Sweden","away":"Tunisia","venue":"Monterrey"},{"id":"gs_22","date":"Mon 15 Jun","canaries":"15:00","romania":"17:00","group":"H","home":"Spain","away":"Cape Verde","venue":"Atlanta"},{"id":"gs_23","date":"Mon 15 Jun","canaries":"18:00","romania":"20:00","group":"G","home":"Belgium","away":"Egypt","venue":"Seattle"},{"id":"gs_24","date":"Mon 15 Jun","canaries":"21:00","romania":"23:00","group":"H","home":"Saudi Arabia","away":"Uruguay","venue":"Miami"},{"id":"gs_26","date":"Tue 16 Jun","canaries":"00:00","romania":"02:00","group":"G","home":"Iran","away":"New Zealand","venue":"Los Angeles"},{"id":"gs_27","date":"Tue 16 Jun","canaries":"18:00","romania":"20:00","group":"I","home":"France","away":"Senegal","venue":"New Jersey"},{"id":"gs_28","date":"Tue 16 Jun","canaries":"21:00","romania":"23:00","group":"I","home":"Iraq","away":"Norway","venue":"Boston"},{"id":"gs_30","date":"Wed 17 Jun","canaries":"00:00","romania":"02:00","group":"J","home":"Argentina","away":"Algeria","venue":"Kansas City"},{"id":"gs_31","date":"Wed 17 Jun","canaries":"03:00","romania":"05:00","group":"J","home":"Austria","away":"Jordan","venue":"San Francisco"},{"id":"gs_32","date":"Wed 17 Jun","canaries":"16:00","romania":"18:00","group":"K","home":"Portugal","away":"DR Congo","venue":"Houston"},{"id":"gs_33","date":"Wed 17 Jun","canaries":"19:00","romania":"21:00","group":"L","home":"England","away":"Croatia","venue":"Dallas"},{"id":"gs_34","date":"Wed 17 Jun","canaries":"22:00","romania":"00:00","group":"L","home":"Ghana","away":"Panama","venue":"Toronto"},{"id":"gs_36","date":"Thu 18 Jun","canaries":"01:00","romania":"03:00","group":"K","home":"Uzbekistan","away":"Colombia","venue":"Mexico City"},{"id":"gs_37","date":"Thu 18 Jun","canaries":"15:00","romania":"17:00","group":"A","home":"Czech Republic","away":"South Africa","venue":"Atlanta"},{"id":"gs_38","date":"Thu 18 Jun","canaries":"18:00","romania":"20:00","group":"B","home":"Switzerland","away":"Bosnia-Herz.","venue":"Los Angeles"},{"id":"gs_39","date":"Thu 18 Jun","canaries":"21:00","romania":"23:00","group":"B","home":"Canada","away":"Qatar","venue":"Vancouver"},{"id":"gs_41","date":"Fri 19 Jun","canaries":"00:00","romania":"02:00","group":"A","home":"Mexico","away":"South Korea","venue":"Guadalajara"},{"id":"gs_42","date":"Fri 19 Jun","canaries":"18:00","romania":"20:00","group":"D","home":"USA","away":"Australia","venue":"Seattle"},{"id":"gs_43","date":"Fri 19 Jun","canaries":"21:00","romania":"23:00","group":"C","home":"Scotland","away":"Morocco","venue":"Boston"},{"id":"gs_45","date":"Sat 20 Jun","canaries":"23:30","romania":"01:30","group":"C","home":"Brazil","away":"Haiti","venue":"Philadelphia"},{"id":"gs_46","date":"Sat 20 Jun","canaries":"02:00","romania":"04:00","group":"D","home":"Turkey","away":"Paraguay","venue":"San Francisco"},{"id":"gs_47","date":"Sat 20 Jun","canaries":"16:00","romania":"18:00","group":"F","home":"Netherlands","away":"Sweden","venue":"Houston"},{"id":"gs_48","date":"Sat 20 Jun","canaries":"19:00","romania":"21:00","group":"E","home":"Germany","away":"Ivory Coast","venue":"Toronto"},{"id":"gs_50","date":"Sun 21 Jun","canaries":"23:00","romania":"01:00","group":"E","home":"Ecuador","away":"Curaçao","venue":"Kansas City"},{"id":"gs_51","date":"Sun 21 Jun","canaries":"03:00","romania":"05:00","group":"F","home":"Tunisia","away":"Japan","venue":"Monterrey"},{"id":"gs_52","date":"Sun 21 Jun","canaries":"15:00","romania":"17:00","group":"H","home":"Spain","away":"Saudi Arabia","venue":"Atlanta"},{"id":"gs_53","date":"Sun 21 Jun","canaries":"18:00","romania":"20:00","group":"G","home":"Belgium","away":"Iran","venue":"Los Angeles"},{"id":"gs_54","date":"Sun 21 Jun","canaries":"21:00","romania":"23:00","group":"H","home":"Uruguay","away":"Cape Verde","venue":"Miami"},{"id":"gs_56","date":"Mon 22 Jun","canaries":"00:00","romania":"02:00","group":"G","home":"New Zealand","away":"Egypt","venue":"Vancouver"},{"id":"gs_57","date":"Mon 22 Jun","canaries":"16:00","romania":"18:00","group":"J","home":"Argentina","away":"Austria","venue":"Dallas"},{"id":"gs_58","date":"Mon 22 Jun","canaries":"20:00","romania":"22:00","group":"I","home":"France","away":"Iraq","venue":"Philadelphia"},{"id":"gs_60","date":"Tue 23 Jun","canaries":"23:00","romania":"01:00","group":"I","home":"Norway","away":"Senegal","venue":"New Jersey"},{"id":"gs_61","date":"Tue 23 Jun","canaries":"02:00","romania":"04:00","group":"J","home":"Jordan","away":"Algeria","venue":"San Francisco"},{"id":"gs_62","date":"Tue 23 Jun","canaries":"16:00","romania":"18:00","group":"K","home":"Portugal","away":"Uzbekistan","venue":"Houston"},{"id":"gs_63","date":"Tue 23 Jun","canaries":"19:00","romania":"21:00","group":"L","home":"England","away":"Ghana","venue":"Boston"},{"id":"gs_64","date":"Tue 23 Jun","canaries":"22:00","romania":"00:00","group":"L","home":"Panama","away":"Croatia","venue":"Toronto"},{"id":"gs_66","date":"Wed 24 Jun","canaries":"01:00","romania":"03:00","group":"K","home":"Colombia","away":"DR Congo","venue":"Guadalajara"},{"id":"gs_67","date":"Wed 24 Jun","canaries":"18:00","romania":"20:00","group":"B","home":"Switzerland","away":"Canada","venue":"Vancouver"},{"id":"gs_68","date":"Wed 24 Jun","canaries":"18:00","romania":"20:00","group":"B","home":"Bosnia-Herz.","away":"Qatar","venue":"Seattle"},{"id":"gs_69","date":"Wed 24 Jun","canaries":"21:00","romania":"23:00","group":"C","home":"Scotland","away":"Brazil","venue":"Miami"},{"id":"gs_70","date":"Wed 24 Jun","canaries":"21:00","romania":"23:00","group":"C","home":"Morocco","away":"Haiti","venue":"Atlanta"},{"id":"gs_72","date":"Thu 25 Jun","canaries":"00:00","romania":"02:00","group":"A","home":"Czech Republic","away":"Mexico","venue":"Mexico City"},{"id":"gs_73","date":"Thu 25 Jun","canaries":"00:00","romania":"02:00","group":"A","home":"South Africa","away":"South Korea","venue":"Guadalajara"},{"id":"gs_74","date":"Thu 25 Jun","canaries":"19:00","romania":"21:00","group":"E","home":"Curaçao","away":"Ivory Coast","venue":"Philadelphia"},{"id":"gs_75","date":"Thu 25 Jun","canaries":"19:00","romania":"21:00","group":"E","home":"Ecuador","away":"Germany","venue":"New Jersey"},{"id":"gs_76","date":"Thu 25 Jun","canaries":"22:00","romania":"00:00","group":"F","home":"Japan","away":"Sweden","venue":"Dallas"},{"id":"gs_77","date":"Thu 25 Jun","canaries":"22:00","romania":"00:00","group":"F","home":"Tunisia","away":"Netherlands","venue":"Kansas City"},{"id":"gs_79","date":"Fri 26 Jun","canaries":"01:00","romania":"03:00","group":"D","home":"Turkey","away":"USA","venue":"Los Angeles"},{"id":"gs_80","date":"Fri 26 Jun","canaries":"01:00","romania":"03:00","group":"D","home":"Paraguay","away":"Australia","venue":"San Francisco"},{"id":"gs_81","date":"Fri 26 Jun","canaries":"18:00","romania":"20:00","group":"I","home":"Norway","away":"France","venue":"Boston"},{"id":"gs_82","date":"Fri 26 Jun","canaries":"18:00","romania":"20:00","group":"I","home":"Senegal","away":"Iraq","venue":"Toronto"},{"id":"gs_83","date":"Fri 26 Jun","canaries":"23:00","romania":"01:00","group":"H","home":"Cape Verde","away":"Saudi Arabia","venue":"Houston"},{"id":"gs_84","date":"Fri 26 Jun","canaries":"23:00","romania":"01:00","group":"H","home":"Uruguay","away":"Spain","venue":"Guadalajara"},{"id":"gs_86","date":"Sat 27 Jun","canaries":"02:00","romania":"04:00","group":"G","home":"Egypt","away":"Iran","venue":"Seattle"},{"id":"gs_87","date":"Sat 27 Jun","canaries":"02:00","romania":"04:00","group":"G","home":"New Zealand","away":"Belgium","venue":"Vancouver"},{"id":"gs_88","date":"Sat 27 Jun","canaries":"20:00","romania":"22:00","group":"L","home":"Panama","away":"England","venue":"New Jersey"},{"id":"gs_89","date":"Sat 27 Jun","canaries":"20:00","romania":"22:00","group":"L","home":"Croatia","away":"Ghana","venue":"Philadelphia"},{"id":"gs_90","date":"Sat 27 Jun","canaries":"22:30","romania":"00:30","group":"K","home":"Colombia","away":"Portugal","venue":"Miami"},{"id":"gs_91","date":"Sat 27 Jun","canaries":"22:30","romania":"00:30","group":"K","home":"DR Congo","away":"Uzbekistan","venue":"Atlanta"},{"id":"gs_93","date":"Sun 28 Jun","canaries":"01:00","romania":"03:00","group":"J","home":"Algeria","away":"Austria","venue":"Kansas City"},{"id":"gs_94","date":"Sun 28 Jun","canaries":"01:00","romania":"03:00","group":"J","home":"Jordan","away":"Argentina","venue":"Dallas"}];

const INITIAL_KO = [{"id":"P73","round":"ROUND OF 32","date":"Sun 28 Jun","canaries":"20:00","romania":"22:00","homeTeam":"South Africa","awayTeam":"Canada"},{"id":"P74","round":"ROUND OF 32","date":"Mon 29 Jun","canaries":"21:30","romania":"23:30","homeTeam":"Germany","awayTeam":"Paraguay"},{"id":"P75","round":"ROUND OF 32","date":"Mon 29 Jun","canaries":"00:00","romania":"02:00","homeTeam":"Netherlands","awayTeam":"Morocco"},{"id":"P76","round":"ROUND OF 32","date":"Mon 29 Jun","canaries":"18:00","romania":"20:00","homeTeam":"Brazil","awayTeam":"Japan"},{"id":"P77","round":"ROUND OF 32","date":"Tue 30 Jun","canaries":"21:00","romania":"23:00","homeTeam":"France","awayTeam":"Sweden"},{"id":"P78","round":"ROUND OF 32","date":"Tue 30 Jun","canaries":"18:00","romania":"20:00","homeTeam":"Ivory Coast","awayTeam":"Norway"},{"id":"P79","round":"ROUND OF 32","date":"Tue 30 Jun","canaries":"00:00","romania":"02:00","homeTeam":"Mexico","awayTeam":"Ecuador"},{"id":"P80","round":"ROUND OF 32","date":"Wed 1 Jul","canaries":"21:00","romania":"23:00","homeTeam":"England","awayTeam":"DR Congo"},{"id":"P81","round":"ROUND OF 32","date":"Wed 1 Jul","canaries":"01:00","romania":"03:00","homeTeam":"USA","awayTeam":"Bosnia-Herz."},{"id":"P82","round":"ROUND OF 32","date":"Wed 1 Jul","canaries":"18:00","romania":"20:00","homeTeam":"Belgium","awayTeam":"Senegal"},{"id":"P83","round":"ROUND OF 32","date":"Fri 3 Jul","canaries":"00:00","romania":"02:00","homeTeam":"Portugal","awayTeam":"Croatia"},{"id":"P84","round":"ROUND OF 32","date":"Thu 2 Jul","canaries":"20:00","romania":"22:00","homeTeam":"Spain","awayTeam":"Austria"},{"id":"P85","round":"ROUND OF 32","date":"Thu 2 Jul","canaries":"00:00","romania":"02:00","homeTeam":"Switzerland","awayTeam":"Algeria"},{"id":"P86","round":"ROUND OF 32","date":"Fri 3 Jul","canaries":"21:00","romania":"23:00","homeTeam":"Argentina","awayTeam":"Cape Verde"},{"id":"P87","round":"ROUND OF 32","date":"Sat 4 Jul","canaries":"20:00","romania":"22:00","homeTeam":"Colombia","awayTeam":"Ghana"},{"id":"P88","round":"ROUND OF 32","date":"Fri 3 Jul","canaries":"18:00","romania":"20:00","homeTeam":"Australia","awayTeam":"Egypt"},{"id":"P89","round":"ROUND OF 16","date":"Sun 5 Jul","canaries":"21:00","romania":"23:00"},{"id":"P90","round":"ROUND OF 16","date":"Sun 5 Jul","canaries":"18:00","romania":"20:00"},{"id":"P91","round":"ROUND OF 16","date":"Mon 6 Jul","canaries":"02:00","romania":"04:00"},{"id":"P92","round":"ROUND OF 16","date":"Mon 6 Jul","canaries":"18:00","romania":"20:00"},{"id":"P93","round":"ROUND OF 16","date":"Sat 4 Jul","canaries":"00:00","romania":"02:00"},{"id":"P94","round":"ROUND OF 16","date":"Tue 7 Jul","canaries":"01:00","romania":"03:00"},{"id":"P95","round":"ROUND OF 16","date":"Mon 6 Jul","canaries":"22:00","romania":"00:00"},{"id":"P96","round":"ROUND OF 16","date":"Tue 7 Jul","canaries":"21:00","romania":"23:00"},{"id":"P97","round":"QUARTER-FINALS","date":"Thu 9 Jul","canaries":"02:00","romania":"04:00"},{"id":"P98","round":"QUARTER-FINALS","date":"Fri 10 Jul","canaries":"02:00","romania":"04:00"},{"id":"P99","round":"QUARTER-FINALS","date":"Sat 11 Jul","canaries":"21:00","romania":"23:00"},{"id":"P100","round":"QUARTER-FINALS","date":"Sat 11 Jul","canaries":"02:00","romania":"04:00"},{"id":"P101","round":"SEMI-FINALS","date":"Tue 14 Jul","canaries":"02:00","romania":"04:00"},{"id":"P102","round":"SEMI-FINALS","date":"Wed 15 Jul","canaries":"02:00","romania":"04:00"},{"id":"P103","round":"3rd PLACE","date":"Sat 18 Jul","canaries":"17:00","romania":"19:00"},{"id":"P104","round":"FINAL ⚽","date":"Sun 19 Jul","canaries":"16:00","romania":"18:00"}];

// Seeded predictions and results from Excel
const SEEDED = {
  gs_6:{goalsHome:2,goalsAway:0,joaquin:"",giada:""},
  gs_7:{goalsHome:2,goalsAway:1,joaquin:"",giada:""},
  gs_9:{goalsHome:1,goalsAway:1,joaquin:"1",giada:"1"},
  gs_10:{goalsHome:4,goalsAway:1,joaquin:"X",giada:"X"},
  gs_12:{goalsHome:1,goalsAway:1,joaquin:"2",giada:"X"},
  gs_13:{goalsHome:1,goalsAway:1,joaquin:"X",giada:"1"},
  gs_15:{goalsHome:0,goalsAway:1,joaquin:"2",giada:"2"},
  gs_16:{goalsHome:2,goalsAway:0,joaquin:"1",giada:"2"},
  gs_17:{joaquin:"1",giada:"1"},
  gs_18:{joaquin:"2",giada:"1"},
  gs_19:{joaquin:"2",giada:"X"},
  gs_21:{joaquin:"X",giada:"2"},
  gs_22:{joaquin:"1",giada:"1"},
  gs_23:{joaquin:"2",giada:"X"},
  gs_24:{joaquin:"2",giada:"2"},
  gs_26:{joaquin:"X",giada:"2"},
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getResult(h, a) {
  if (h === null || h === undefined || a === null || a === undefined) return "";
  if (h > a) return "1"; if (h < a) return "2"; return "X";
}

// Knockout prediction result: "1" if home advances, "2" if away advances, "" if undecided.
// Uses goals (after extra time) first; if tied, uses penalty shootout.
function getKOResult(gh, ga, ph, pa) {
  if (gh === null || gh === undefined || ga === null || ga === undefined) return "";
  if (gh > ga) return "1";
  if (ga > gh) return "2";
  // Tied on the pitch → look at penalties
  if (ph !== null && ph !== undefined && pa !== null && pa !== undefined) {
    if (ph > pa) return "1";
    if (pa > ph) return "2";
  }
  return ""; // tied and no penalty data yet → undecided
}

function calcStandings(matches) {
  const table = {};
  Object.entries(GROUP_TEAMS).forEach(([g, teams]) => {
    table[g] = {};
    teams.forEach(t => { table[g][t] = {P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,Pts:0}; });
  });
  matches.forEach(m => {
    const mData = m;
    if (mData.goals_home === null || mData.goals_home === undefined ||
        mData.goals_away === null || mData.goals_away === undefined) return;
    const gh = mData.goals_home, ga = mData.goals_away, g = m.group;
    if (!table[g] || !table[g][m.home] || !table[g][m.away]) return;
    const home = table[g][m.home], away = table[g][m.away];
    home.P++; away.P++;
    home.GF+=gh; home.GA+=ga; away.GF+=ga; away.GA+=gh;
    home.GD=home.GF-home.GA; away.GD=away.GF-away.GA;
    if(gh>ga){home.W++;home.Pts+=3;away.L++;}
    else if(gh<ga){away.W++;away.Pts+=3;home.L++;}
    else{home.D++;home.Pts++;away.D++;away.Pts++;}
  });
  const sorted = {};
  Object.entries(table).forEach(([g,teams]) => {
    sorted[g] = Object.entries(teams).sort(([na,a],[nb,b]) => {
      if(b.Pts!==a.Pts) return b.Pts-a.Pts;
      if(b.GD!==a.GD) return b.GD-a.GD;
      if(b.GF!==a.GF) return b.GF-a.GF;
      return na.localeCompare(nb);
    });
  });
  return sorted;
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────
async function loadAllMatches() {
  const { data, error } = await supabase.from("matches").select("*");
  if (error) throw error;
  return data || [];
}

async function upsertMatch(match) {
  const { error } = await supabase.from("matches").upsert(match, { onConflict: "id" });
  if (error) throw error;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  useFonts();
  const [tab, setTab] = useState("groups");
  const [gsData, setGsData] = useState({});   // id → {goals_home, goals_away, joaquin, giada}
  const [koData, setKoData] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef(null);

  // Load from Supabase and seed if empty
  useEffect(() => {
    (async () => {
      try {
        const rows = await loadAllMatches();
        const gs = {}, ko = {};

        // Apply seeds first
        Object.entries(SEEDED).forEach(([id, s]) => {
          gs[id] = { goals_home: s.goalsHome ?? null, goals_away: s.goalsAway ?? null,
                     joaquin: s.joaquin ?? "", giada: s.giada ?? "" };
        });

        // Override with DB data
        rows.forEach(r => {
          if (r.type === "gs") gs[r.id] = { goals_home: r.goals_home, goals_away: r.goals_away,
                                             joaquin: r.joaquin || "", giada: r.giada || "" };
          if (r.type === "ko") ko[r.id] = { goals_home: r.goals_home, goals_away: r.goals_away,
                                             pens_home: r.pens_home ?? null, pens_away: r.pens_away ?? null,
                                             joaquin: r.joaquin || "", giada: r.giada || "",
                                             home_team: r.home_team || "", away_team: r.away_team || "" };
        });

        // If DB was empty, seed it
        if (rows.length === 0) {
          const seedRows = Object.entries(SEEDED).map(([id, s]) => ({
            id, type: "gs",
            goals_home: s.goalsHome ?? null, goals_away: s.goalsAway ?? null,
            joaquin: s.joaquin ?? "", giada: s.giada ?? ""
          }));
          for (const row of seedRows) await upsertMatch(row);
        }

        setGsData(gs);
        setKoData(ko);
      } catch (e) {
        console.error("Load error:", e);
      }
      setLoading(false);
    })();
  }, []);

  // Auto-fetch results from free API every 3 minutes
  useEffect(() => {
    async function syncResults() {
      const results = await fetchResults();
      if (!results) return;
      setLastSync(new Date());
      
      setGsData(prev => {
        const next = { ...prev };
        let changed = false;
        INITIAL_GS.forEach(m => {
          const match = results.find(r =>
            r.home === m.home && r.away === m.away ||
            r.home === m.away && r.away === m.home  // reversed fixture
          );
          if (!match) return;
          const goalsHome = r => r.home === m.home ? r.goalsHome : r.goalsAway;
          const goalsAway = r => r.home === m.home ? r.goalsAway : r.goalsHome;
          const gh = goalsHome(match), ga = goalsAway(match);
          if (prev[m.id]?.goals_home !== gh || prev[m.id]?.goals_away !== ga) {
            next[m.id] = { ...(prev[m.id] || {}), goals_home: gh, goals_away: ga };
            changed = true;
            // Update ONLY the goal columns — never touch predictions.
            // Use update if row exists, else insert a minimal row.
            (async () => {
              const { data: existing } = await supabase
                .from("matches").select("id").eq("id", m.id).maybeSingle();
              if (existing) {
                await supabase.from("matches")
                  .update({ goals_home: gh, goals_away: ga })
                  .eq("id", m.id);
              } else {
                await supabase.from("matches").insert({
                  id: m.id, type: "gs", goals_home: gh, goals_away: ga,
                  joaquin: "", giada: ""
                });
              }
            })();
          }
        });
        return changed ? next : prev;
      });
    }

    syncResults();
    const interval = setInterval(syncResults, 3 * 60 * 1000); // every 3 min
    return () => clearInterval(interval);
  }, []);

  // Auto-sync knockout results too
  useEffect(() => {
    async function syncKO() {
      const results = await fetchResults();
      if (!results) return;
      setKoData(prev => {
        const next = { ...prev };
        let changed = false;
        INITIAL_KO.forEach(m => {
          if (!m.homeTeam || !m.awayTeam) return; // only R32 with known teams
          const match = results.find(r =>
            (r.home === m.homeTeam && r.away === m.awayTeam) ||
            (r.home === m.awayTeam && r.away === m.homeTeam)
          );
          if (!match) return;
          const gh = match.home === m.homeTeam ? match.goalsHome : match.goalsAway;
          const ga = match.home === m.homeTeam ? match.goalsAway : match.goalsHome;
          // Penalties (oriented to home/away of our fixture)
          const ph = match.pensHome === null || match.pensHome === undefined ? null
                   : (match.home === m.homeTeam ? match.pensHome : match.pensAway);
          const pa = match.pensHome === null || match.pensHome === undefined ? null
                   : (match.home === m.homeTeam ? match.pensAway : match.pensHome);
          if (prev[m.id]?.goals_home !== gh || prev[m.id]?.goals_away !== ga ||
              prev[m.id]?.pens_home !== ph || prev[m.id]?.pens_away !== pa) {
            next[m.id] = { ...(prev[m.id] || {}), goals_home: gh, goals_away: ga,
                           pens_home: ph, pens_away: pa };
            changed = true;
            // Update ONLY goals + penalties + team names — never touch predictions.
            (async () => {
              const { data: existing } = await supabase
                .from("matches").select("id").eq("id", m.id).maybeSingle();
              if (existing) {
                await supabase.from("matches")
                  .update({ goals_home: gh, goals_away: ga,
                            pens_home: ph, pens_away: pa,
                            home_team: m.homeTeam, away_team: m.awayTeam })
                  .eq("id", m.id);
              } else {
                await supabase.from("matches").insert({
                  id: m.id, type: "ko", goals_home: gh, goals_away: ga,
                  pens_home: ph, pens_away: pa,
                  joaquin: "", giada: "",
                  home_team: m.homeTeam, away_team: m.awayTeam
                });
              }
            })();
          }
        });
        return changed ? next : prev;
      });
    }
    syncKO();
    const interval = setInterval(syncKO, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const debouncedSave = useCallback(async (id, type, fields) => {
    setSaving(true);
    try {
      // Only ever write prediction columns from the UI.
      // Goals are owned by the API sync, so we never overwrite them here.
      const { data: existing } = await supabase
        .from("matches").select("id").eq("id", id).maybeSingle();
      if (existing) {
        await supabase.from("matches")
          .update({ joaquin: fields.joaquin ?? "", giada: fields.giada ?? "" })
          .eq("id", id);
      } else {
        await supabase.from("matches").insert({
          id, type,
          joaquin: fields.joaquin ?? "", giada: fields.giada ?? "",
          goals_home: null, goals_away: null,
          ...(fields.home_team ? { home_team: fields.home_team } : {}),
          ...(fields.away_team ? { away_team: fields.away_team } : {}),
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Save error:", e);
    }
    setSaving(false);
  }, []);

  // Save goals manually entered in edit mode (owns goal columns)
  const saveGoals = useCallback(async (id, type, gh, ga, extra={}) => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("matches").select("id").eq("id", id).maybeSingle();
      if (existing) {
        await supabase.from("matches")
          .update({ goals_home: gh ?? null, goals_away: ga ?? null, ...extra })
          .eq("id", id);
      } else {
        await supabase.from("matches").insert({
          id, type, goals_home: gh ?? null, goals_away: ga ?? null,
          joaquin: "", giada: "", ...extra
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Save goals error:", e);
    }
    setSaving(false);
  }, []);

  const updateGS = useCallback((id, field, val) => {
    setGsData(prev => {
      const updated = { ...prev[id], [field]: val };
      const next = { ...prev, [id]: updated };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const isGoal = field === "goals_home" || field === "goals_away";
      saveTimer.current = setTimeout(() => {
        if (isGoal) {
          saveGoals(id, "gs", next[id].goals_home ?? null, next[id].goals_away ?? null);
        } else {
          debouncedSave(id, "gs", {
            joaquin: next[id].joaquin || "", giada: next[id].giada || ""
          });
        }
      }, 600);
      return next;
    });
  }, [debouncedSave, saveGoals]);

  const updateKO = useCallback((id, field, val) => {
    setKoData(prev => {
      const updated = { ...prev[id], [field]: val };
      const next = { ...prev, [id]: updated };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const isGoal = field === "goals_home" || field === "goals_away";
      saveTimer.current = setTimeout(() => {
        if (isGoal) {
          saveGoals(id, "ko", next[id].goals_home ?? null, next[id].goals_away ?? null,
            { home_team: next[id]?.home_team || "", away_team: next[id]?.away_team || "" });
        } else {
          debouncedSave(id, "ko", {
            joaquin: next[id].joaquin || "", giada: next[id].giada || "",
            home_team: next[id]?.home_team || "", away_team: next[id]?.away_team || ""
          });
        }
      }, 600);
      return next;
    });
  }, [debouncedSave, saveGoals]);

  // Enrich GS matches with live data
  const gsMatches = INITIAL_GS.map(m => ({
    ...m, ...(gsData[m.id] || { goals_home: null, goals_away: null, joaquin: "", giada: "" })
  }));

  const standings = calcStandings(gsMatches);

  // Enrich KO matches
  const winnerMap = {}, loserMap = {};
  const resolveLabel = (lbl, standings) => {
    const gm = lbl.match(/^(\d+)\w+ ([A-L])$/);
    if (gm) { const pos=parseInt(gm[1])-1; return standings[gm[2]]?.[pos]?.[0]||null; }
    const wm = lbl.match(/^W(\d+)$/);
    if (wm) return winnerMap["P"+wm[1]] || null;
    const lm = lbl.match(/^L(\d+)$/);
    if (lm) return loserMap["P"+lm[1]] || null;
    return null;
  };

  const koMatches = INITIAL_KO.map(m => {
    const d = koData[m.id] || {};
    const labels = KO_LABELS[m.id] || ["?","?"];
    // Priority: saved DB team → fixed team in INITIAL_KO → resolved from standings/winners
    const homeTeam = d.home_team || m.homeTeam || resolveLabel(labels[0], standings);
    const awayTeam = d.away_team || m.awayTeam || resolveLabel(labels[1], standings);
    const res = getKOResult(d.goals_home, d.goals_away, d.pens_home, d.pens_away);
    if (res && homeTeam && awayTeam) {
      winnerMap[m.id] = res==="1"?homeTeam:res==="2"?awayTeam:null;
      loserMap[m.id] = res==="1"?awayTeam:res==="2"?homeTeam:null;
    }
    return { ...m, ...d, homeTeam, awayTeam, homeLabel: labels[0], awayLabel: labels[1] };
  });

  // Scoreboard
  const gsScore = gsMatches.reduce((a,m) => {
    const res = getResult(m.goals_home, m.goals_away);
    if (!res) return a;
    if (m.joaquin===res) a.j++;
    if (m.giada===res) a.g++;
    return a;
  }, {j:0,g:0});
  const koScore = koMatches.reduce((a,m) => {
    const res = getKOResult(m.goals_home, m.goals_away, m.pens_home, m.pens_away);
    if (!res) return a;
    if (m.joaquin===res) a.j++;
    if (m.giada===res) a.g++;
    return a;
  }, {j:0,g:0});
  const total = { j: gsScore.j+koScore.j, g: gsScore.g+koScore.g };

  if (loading) return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",
      height:"100vh",fontFamily:FONT_COND,fontSize:18,color:T.mute,background:T.cream}}>
      ⚽ Cargando…
    </div>
  );

  return (
    <div style={{fontFamily:FONT_BODY,maxWidth:760,
      margin:"0 auto",background:T.cream,minHeight:"100vh"}}>

      {/* Header — vintage pennant */}
      <div style={{background:T.navy,padding:"20px 18px 22px",color:T.cream,
        position:"relative",overflow:"hidden",borderBottom:`5px solid ${T.red}`}}>
        {/* tricolor top stripe (host nations) */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:6,
          background:`linear-gradient(90deg,${T.green} 0 33.3%,#FFFFFF 33.3% 66.6%,${T.red} 66.6% 100%)`}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{fontFamily:FONT_DISPLAY,fontSize:30,letterSpacing:0.5,
            lineHeight:0.95,textTransform:"uppercase",marginTop:4}}>
            World Cup <span style={{color:T.gold}}>2026</span>
          </div>
          <div style={{fontFamily:FONT_COND,fontSize:11,opacity:0.85,marginTop:3,
            letterSpacing:2,textTransform:"uppercase"}}>
            Joaquín · vs · Giada
          </div>
          <div style={{fontSize:13,letterSpacing:3,marginTop:2}}>🇲🇽 🇺🇸 🇨🇦</div>
        </div>

        {/* Stadium scoreboard */}
        <div style={{marginTop:16,background:T.boardBg,borderRadius:8,
          border:`3px solid ${T.boardEdge}`,padding:"12px 14px",
          boxShadow:`inset 0 0 0 2px #2A2620, 0 4px 0 ${T.navyDark}`,
          display:"flex",alignItems:"center",justifyContent:"space-between",
          gap:12,position:"relative",zIndex:1}}>
          <div style={{flex:1,textAlign:"center"}}>
            <div style={{fontFamily:FONT_COND,fontSize:12,fontWeight:600,
              letterSpacing:2,textTransform:"uppercase",color:T.jDigit,marginBottom:3}}>
              ▪ Joaquín
            </div>
            <div style={{fontFamily:FONT_DISPLAY,fontSize:42,lineHeight:0.8,
              letterSpacing:2,color:T.jDigit,textShadow:"0 0 10px rgba(55,198,244,0.5)"}}>
              {total.j}
            </div>
          </div>
          <div style={{fontFamily:FONT_DISPLAY,fontSize:16,color:"#6B6256",
            letterSpacing:1,borderLeft:"2px dashed #3A352C",borderRight:"2px dashed #3A352C",
            padding:"0 14px"}}>VS</div>
          <div style={{flex:1,textAlign:"center"}}>
            <div style={{fontFamily:FONT_COND,fontSize:12,fontWeight:600,
              letterSpacing:2,textTransform:"uppercase",color:T.gDigit,marginBottom:3}}>
              ▪ Giada
            </div>
            <div style={{fontFamily:FONT_DISPLAY,fontSize:42,lineHeight:0.8,
              letterSpacing:2,color:T.gDigit,textShadow:"0 0 10px rgba(255,194,71,0.5)"}}>
              {total.g}
            </div>
          </div>
        </div>
        <div style={{fontFamily:FONT_COND,fontSize:10,opacity:0.75,marginTop:9,
          textAlign:"center",letterSpacing:1.5,textTransform:"uppercase",
          position:"relative",zIndex:1}}>
          Grupos J{gsScore.j}–G{gsScore.g} · Eliminatorias J{koScore.j}–G{koScore.g}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"0 8px",borderBottom:`3px solid ${T.navy}`,background:T.card,
        position:"sticky",top:0,zIndex:5}}>
        <div style={{display:"flex"}}>
          {[["groups","Grupos"],["standings","Clasificación"],["knockout","Eliminatorias"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)}
              style={{padding:"12px 13px",border:"none",cursor:"pointer",
                fontFamily:FONT_COND,fontWeight:600,fontSize:13,background:"none",
                textTransform:"uppercase",letterSpacing:0.5,
                borderBottom:tab===k?`4px solid ${T.gold}`:"4px solid transparent",
                color:tab===k?T.red:T.mute,transition:"all 0.15s"}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {saving && <span style={{fontSize:11,color:T.mute}}>Guardando…</span>}
          {saved && <span style={{fontSize:11,color:T.green,fontWeight:600}}>✓</span>}
          {lastSync && <span style={{fontSize:10,color:T.mute}}>
            🔄 {lastSync.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
          </span>}
          <button onClick={()=>setEditMode(!editMode)}
            style={{padding:"5px 12px",borderRadius:6,fontSize:12,fontWeight:700,
              fontFamily:FONT_COND,letterSpacing:0.5,cursor:"pointer",
              border:`2px solid ${editMode?T.red:T.line}`,
              background:editMode?T.red:T.card,color:editMode?"#fff":T.ink,
              transition:"all 0.15s"}}>
            {editMode?"✓ Listo":"✏️ Editar"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{padding:"12px 14px"}}>
        {tab==="groups" &&
          <GroupsTab matches={gsMatches} onUpdate={updateGS} editMode={editMode}/>}
        {tab==="standings" && <StandingsTab standings={standings}/>}
        {tab==="knockout" &&
          <KnockoutTab matches={koMatches} onUpdate={updateKO} editMode={editMode}/>}
      </div>
    </div>
  );
}

// ─── Groups Tab ───────────────────────────────────────────────────────────────
function GroupsTab({matches, onUpdate, editMode}) {
  const byDate = {};
  matches.forEach(m => {
    if(!byDate[m.date]) byDate[m.date]=[];
    byDate[m.date].push(m);
  });
  return (
    <div>
      <Legend isKO={false}/>
      {Object.entries(byDate).map(([date,ms])=>(
        <div key={date} style={{marginBottom:16}}>
          <DateBar label={date}/>
          {ms.map(m=><MatchRow key={m.id} m={m} onUpdate={onUpdate}
            editMode={editMode} isKO={false}/>)}
        </div>
      ))}
    </div>
  );
}

// Shared date divider — vintage ticket style
function DateBar({label, small}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,
      margin: small ? "10px 2px 8px" : "4px 2px 10px"}}>
      <div style={{fontFamily:FONT_COND,fontSize: small?12:13,color:T.navy,
        letterSpacing:1,background:T.card,border:`2px solid ${T.navy}`,
        padding:"3px 12px",borderRadius:4,textTransform:"uppercase",fontWeight:600}}>
        {label}
      </div>
      <div style={{flex:1,height:2,background:T.lineSoft}}/>
    </div>
  );
}

// ─── Standings Tab ────────────────────────────────────────────────────────────
function StandingsTab({standings}) {
  const groups=Object.keys(standings);
  const pairs=[];
  for(let i=0;i<groups.length;i+=2) pairs.push([groups[i],groups[i+1]]);
  return (
    <div>
      {pairs.map(([g1,g2])=>(
        <div key={g1} style={{display:"grid",gridTemplateColumns:"1fr 1fr",
          gap:10,marginBottom:10}}>
          <GroupTable group={g1} teams={standings[g1]}/>
          {g2&&<GroupTable group={g2} teams={standings[g2]}/>}
        </div>
      ))}
    </div>
  );
}

function GroupTable({group,teams}) {
  return (
    <div style={{borderRadius:8,overflow:"hidden",border:`2px solid ${T.line}`,
      boxShadow:`0 2px 0 ${T.lineSoft}`}}>
      <div style={{background:T.navy,color:T.cream,padding:"6px 10px",
        fontFamily:FONT_DISPLAY,fontSize:14,letterSpacing:0.5,
        textTransform:"uppercase"}}>Grupo {group}</div>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,background:T.card}}>
        <thead>
          <tr style={{background:T.ink,color:T.cream}}>
            {["Equipo","PJ","G","E","P","GF","GC","DG","Pts"].map(h=>(
              <th key={h} style={{padding:"4px 5px",textAlign:h==="Equipo"?"left":"center",
                fontFamily:FONT_COND,fontWeight:600,fontSize:10,letterSpacing:0.3}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map(([name,s],i)=>(
            <tr key={name} style={{background:i<2?"#E3F1E6":i%2===0?"#F6EEDC":T.card,
              borderTop:`1px solid ${T.lineSoft}`}}>
              <td style={{padding:"5px 5px",fontWeight:i<2?700:500,
                color:i<2?T.green:T.ink,fontSize:11,whiteSpace:"nowrap"}}>
                {i===0?"①":i===1?"②":i===2?"③":"④"} {flag(name)} {name}
              </td>
              {[s.P,s.W,s.D,s.L,s.GF,s.GA,s.GD,s.Pts].map((v,j)=>(
                <td key={j} style={{padding:"5px 5px",textAlign:"center",
                  fontWeight:j===7?800:400,
                  color:j===7?T.green:j===6&&v>0?T.red:T.ink}}>
                  {j===6&&v>0?"+"+v:v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Knockout Tab ─────────────────────────────────────────────────────────────
const ROUND_ES = {
  "ROUND OF 32":"DIECISEISAVOS","ROUND OF 16":"OCTAVOS",
  "QUARTER-FINALS":"CUARTOS","SEMI-FINALS":"SEMIFINALES",
  "3rd PLACE":"3ER PUESTO","FINAL ⚽":"FINAL",
};
function KnockoutTab({matches, onUpdate, editMode}) {
  const byRound={};
  matches.forEach(m=>{
    if(!byRound[m.round]) byRound[m.round]=[];
    byRound[m.round].push(m);
  });
  return (
    <div>
      <Legend isKO={true}/>
      {Object.entries(byRound).map(([round,ms])=>{
        // Sort all matches in this round chronologically, then group by date
        const sorted = [...ms].sort((a,b) =>
          chronoKey(a.date,a.canaries) - chronoKey(b.date,b.canaries));
        const byDate = {};
        sorted.forEach(m => {
          const d = m.date || "Por definir";
          if(!byDate[d]) byDate[d]=[];
          byDate[d].push(m);
        });
        return (
        <div key={round} style={{marginBottom:18}}>
          <div style={{background:ROUND_COLORS[round]||T.navy,color:T.cream,
            padding:"7px 12px",borderRadius:6,fontFamily:FONT_DISPLAY,fontSize:16,
            letterSpacing:0.5,marginBottom:8,textTransform:"uppercase",
            boxShadow:`0 3px 0 rgba(0,0,0,0.12)`}}>
            {ROUND_ES[round]||round}
          </div>
          {Object.entries(byDate).map(([date,dms])=>(
            <div key={date} style={{marginBottom:6}}>
              <DateBar label={date} small/>
              {dms.map(m=><MatchRow key={m.id} m={m} onUpdate={onUpdate}
                editMode={editMode} isKO={true}/>)}
            </div>
          ))}
        </div>
        );
      })}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend({isKO}) {
  return (
    <div style={{fontSize:10.5,color:T.mute,marginBottom:10,padding:"7px 11px",
      background:T.card,borderRadius:6,border:`1.5px solid ${T.line}`,
      fontFamily:FONT_COND,letterSpacing:0.3}}>
      {isKO
        ? "Pronóstico: 1 = pasa el local · 2 = pasa el visitante · Resultado tras prórroga; los penaltis deciden · ✅ acierto ❌ fallo"
        : "Pronóstico: 1 = gana local · X = empate · 2 = gana visitante · Mete los goles y el resultado se calcula solo · ✅ acierto ❌ fallo"}
    </div>
  );
}

// ─── Match Row ────────────────────────────────────────────────────────────────
function MatchRow({m, onUpdate, editMode, isKO}) {
  const gh = m.goals_home, ga = m.goals_away;
  const res = isKO ? getKOResult(gh, ga, m.pens_home, m.pens_away) : getResult(gh, ga);
  const played = gh !== null && gh !== undefined && ga !== null && ga !== undefined;
  const hasPens = m.pens_home !== null && m.pens_home !== undefined &&
                  m.pens_away !== null && m.pens_away !== undefined;
  const jOk = res && m.joaquin===res;
  const gOk = res && m.giada===res;
  const preds = isKO ? ["1","2"] : ["1","X","2"];
  const homeTeam = isKO ? (m.homeTeam || m.homeLabel) : m.home;
  const awayTeam = isKO ? (m.awayTeam || m.awayLabel) : m.away;
  const isTBD_home = isKO && !m.homeTeam;
  const isTBD_away = isKO && !m.awayTeam;

  return (
    <div style={{display:"flex",alignItems:"center",gap:7,padding:"9px 11px",
      background:T.card,borderRadius:9,marginBottom:7,
      border:`2px solid ${T.line}`,
      borderLeft: played ? `5px solid ${T.green}` : `2px solid ${T.line}`,
      boxShadow:`0 2px 0 ${T.lineSoft}`,flexWrap:"wrap"}}>

      {/* Left: group badge (groups only) + times */}
      <div style={{display:"flex",flexDirection:"column",gap:1,minWidth:50,alignItems:"center"}}>
        {!isKO && (
          <span style={{background:T.red,color:T.cream,padding:"2px 7px",
            borderRadius:5,fontFamily:FONT_DISPLAY,fontSize:12,letterSpacing:0.3}}>
            {m.group}
          </span>
        )}
        <span style={{fontFamily:FONT_COND,fontSize:9.5,color:T.mute,
          textAlign:"center",marginTop:isKO?0:1}}>🌴 {m.canaries}</span>
        <span style={{fontFamily:FONT_COND,fontSize:9.5,color:T.mute,textAlign:"center"}}>
          🇷🇴 {m.romania}
        </span>
      </div>

      {/* Home team */}
      <div style={{flex:1,minWidth:84,display:"flex",alignItems:"center",
        justifyContent:"flex-end",gap:6,textAlign:"right"}}>
        <span style={{fontWeight:700,fontSize:13,
          color:isTBD_home?"#BBB1A0":played&&res==="1"?T.green:T.ink,
          fontStyle:isTBD_home?"italic":"normal",
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {homeTeam}
        </span>
        {!isTBD_home && <span style={{fontSize:18,lineHeight:1}}>{flag(homeTeam)}</span>}
      </div>

      {/* Score / goals */}
      {editMode ? (
        <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
          <GoalInput val={gh} onChange={v=>onUpdate(m.id,"goals_home",v)}/>
          <span style={{color:T.mute,fontSize:11}}>–</span>
          <GoalInput val={ga} onChange={v=>onUpdate(m.id,"goals_away",v)}/>
        </div>
      ) : (
        <div style={{minWidth:50,display:"flex",flexDirection:"column",
          alignItems:"center",flexShrink:0}}>
          <div style={{fontFamily:FONT_DISPLAY,fontSize:19,color:T.ink,letterSpacing:1}}>
            {played ? `${gh}–${ga}` : <span style={{color:"#CFC4AE",fontSize:12,
              fontFamily:FONT_COND}}>vs</span>}
          </div>
          {hasPens && (
            <div style={{fontFamily:FONT_COND,fontSize:9,fontWeight:600,color:T.red,
              background:"#F7E0E0",borderRadius:3,padding:"0 5px",marginTop:1,
              whiteSpace:"nowrap",letterSpacing:0.3}}>
              pen {m.pens_home}-{m.pens_away}
            </div>
          )}
        </div>
      )}

      {/* Away team */}
      <div style={{flex:1,minWidth:84,display:"flex",alignItems:"center",gap:6}}>
        {!isTBD_away && <span style={{fontSize:18,lineHeight:1}}>{flag(awayTeam)}</span>}
        <span style={{fontWeight:700,fontSize:13,
          color:isTBD_away?"#BBB1A0":played&&res==="2"?T.green:T.ink,
          fontStyle:isTBD_away?"italic":"normal",
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {awayTeam}
        </span>
      </div>

      {/* Predictions */}
      <div style={{display:"flex",gap:7,alignItems:"center",flexShrink:0}}>
        <div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
          <span style={{fontFamily:FONT_COND,fontSize:9,color:T.jBlue,fontWeight:700}}>J</span>
          <div style={{display:"flex",gap:2}}>
            {preds.map(v=>(
              <PredBtn key={v} val={v} current={m.joaquin}
                onChange={val=>onUpdate(m.id,"joaquin",val)} disabled={!editMode}/>
            ))}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
          <span style={{fontFamily:FONT_COND,fontSize:9,color:T.gGold,fontWeight:700}}>G</span>
          <div style={{display:"flex",gap:2}}>
            {preds.map(v=>(
              <PredBtn key={v} val={v} current={m.giada}
                onChange={val=>onUpdate(m.id,"giada",val)} disabled={!editMode}/>
            ))}
          </div>
        </div>
      </div>

      {/* Result indicators */}
      <div style={{display:"flex",flexDirection:"column",gap:2,
        alignItems:"center",minWidth:20}}>
        {res && <>
          <span style={{fontSize:13}}>{jOk?"✅":"❌"}</span>
          <span style={{fontSize:13}}>{gOk?"✅":"❌"}</span>
        </>}
      </div>
    </div>
  );
}

function PredBtn({val, current, onChange, disabled}) {
  const active = val===current;
  const cfg = {
    "1":{a:T.jBlue,i:"#E4F2F6",af:"#fff",if:T.jBlue},
    "X":{a:"#7B7066",i:"#EFE9DD",af:"#fff",if:"#7B7066"},
    "2":{a:T.red,i:"#F7E2E2",af:"#fff",if:T.red},
  };
  const c = cfg[val];
  return (
    <button disabled={disabled} onClick={()=>onChange(active?"":val)}
      style={{width:25,height:24,borderRadius:6,border:`2px solid ${active?c.a:T.line}`,
        background:active?c.a:"#fff",color:active?c.af:c.if,
        fontFamily:FONT_DISPLAY,fontSize:12,cursor:disabled?"default":"pointer",
        transition:"all 0.12s",display:"flex",alignItems:"center",justifyContent:"center"}}>
      {val}
    </button>
  );
}

function GoalInput({val, onChange}) {
  return (
    <input type="number" min={0} max={30} value={val??""} 
      onChange={e=>onChange(e.target.value===""?null:parseInt(e.target.value))}
      style={{width:38,textAlign:"center",padding:"3px 3px",
        border:`2px solid ${T.green}`,borderRadius:5,
        background:"#E3F1E6",color:T.green,fontFamily:FONT_DISPLAY,fontSize:14}}/>
  );
}
