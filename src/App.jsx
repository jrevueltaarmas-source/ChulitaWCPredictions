import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase.js";
import { fetchResults } from "./api.js";

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

const ROUND_COLORS = {
  "ROUND OF 32":"#2C3E50","ROUND OF 16":"#1A5276","QUARTER-FINALS":"#5B2C6F",
  "SEMI-FINALS":"#D35400","3rd PLACE":"#5D6D7E","FINAL ⚽":"#922B21",
};

const INITIAL_GS = [{"id":"gs_6","date":"Thu 11 Jun","canaries":"22:00","romania":"01:00","group":"A","home":"Mexico","away":"South Africa","venue":"Mexico City"},{"id":"gs_7","date":"Thu 11 Jun","canaries":"00:00","romania":"03:00","group":"A","home":"South Korea","away":"Czech Republic","venue":"Guadalajara"},{"id":"gs_9","date":"Fri 12 Jun","canaries":"21:00","romania":"00:00","group":"B","home":"Canada","away":"Bosnia-Herz.","venue":"Toronto"},{"id":"gs_10","date":"Fri 12 Jun","canaries":"00:00","romania":"03:00","group":"D","home":"USA","away":"Paraguay","venue":"Los Angeles"},{"id":"gs_12","date":"Sat 13 Jun","canaries":"20:00","romania":"23:00","group":"B","home":"Qatar","away":"Switzerland","venue":"San Francisco"},{"id":"gs_13","date":"Sat 13 Jun","canaries":"23:00","romania":"02:00","group":"C","home":"Brazil","away":"Morocco","venue":"New Jersey"},{"id":"gs_15","date":"Sun 14 Jun","canaries":"02:00","romania":"05:00","group":"C","home":"Haiti","away":"Scotland","venue":"Boston"},{"id":"gs_16","date":"Sun 14 Jun","canaries":"05:00","romania":"08:00","group":"D","home":"Australia","away":"Turkey","venue":"Vancouver"},{"id":"gs_17","date":"Sun 14 Jun","canaries":"18:00","romania":"21:00","group":"E","home":"Germany","away":"Curaçao","venue":"Houston"},{"id":"gs_18","date":"Sun 14 Jun","canaries":"21:00","romania":"00:00","group":"F","home":"Netherlands","away":"Japan","venue":"Dallas"},{"id":"gs_19","date":"Sun 14 Jun","canaries":"00:00","romania":"03:00","group":"E","home":"Ivory Coast","away":"Ecuador","venue":"Philadelphia"},{"id":"gs_21","date":"Mon 15 Jun","canaries":"03:00","romania":"06:00","group":"F","home":"Sweden","away":"Tunisia","venue":"Monterrey"},{"id":"gs_22","date":"Mon 15 Jun","canaries":"17:00","romania":"20:00","group":"H","home":"Spain","away":"Cape Verde","venue":"Atlanta"},{"id":"gs_23","date":"Mon 15 Jun","canaries":"20:00","romania":"23:00","group":"G","home":"Belgium","away":"Egypt","venue":"Seattle"},{"id":"gs_24","date":"Mon 15 Jun","canaries":"23:00","romania":"02:00","group":"H","home":"Saudi Arabia","away":"Uruguay","venue":"Miami"},{"id":"gs_26","date":"Tue 16 Jun","canaries":"02:00","romania":"05:00","group":"G","home":"Iran","away":"New Zealand","venue":"Los Angeles"},{"id":"gs_27","date":"Tue 16 Jun","canaries":"20:00","romania":"23:00","group":"I","home":"France","away":"Senegal","venue":"New Jersey"},{"id":"gs_28","date":"Tue 16 Jun","canaries":"23:00","romania":"02:00","group":"I","home":"Iraq","away":"Norway","venue":"Boston"},{"id":"gs_30","date":"Wed 17 Jun","canaries":"02:00","romania":"05:00","group":"J","home":"Argentina","away":"Algeria","venue":"Kansas City"},{"id":"gs_31","date":"Wed 17 Jun","canaries":"05:00","romania":"08:00","group":"J","home":"Austria","away":"Jordan","venue":"San Francisco"},{"id":"gs_32","date":"Wed 17 Jun","canaries":"18:00","romania":"21:00","group":"K","home":"Portugal","away":"DR Congo","venue":"Houston"},{"id":"gs_33","date":"Wed 17 Jun","canaries":"21:00","romania":"00:00","group":"L","home":"England","away":"Croatia","venue":"Dallas"},{"id":"gs_34","date":"Wed 17 Jun","canaries":"00:00","romania":"03:00","group":"L","home":"Ghana","away":"Panama","venue":"Toronto"},{"id":"gs_36","date":"Thu 18 Jun","canaries":"03:00","romania":"06:00","group":"K","home":"Uzbekistan","away":"Colombia","venue":"Mexico City"},{"id":"gs_37","date":"Thu 18 Jun","canaries":"17:00","romania":"20:00","group":"A","home":"Czech Republic","away":"South Africa","venue":"Atlanta"},{"id":"gs_38","date":"Thu 18 Jun","canaries":"20:00","romania":"23:00","group":"B","home":"Switzerland","away":"Bosnia-Herz.","venue":"Los Angeles"},{"id":"gs_39","date":"Thu 18 Jun","canaries":"23:00","romania":"02:00","group":"B","home":"Canada","away":"Qatar","venue":"Vancouver"},{"id":"gs_41","date":"Fri 19 Jun","canaries":"02:00","romania":"05:00","group":"A","home":"Mexico","away":"South Korea","venue":"Guadalajara"},{"id":"gs_42","date":"Fri 19 Jun","canaries":"20:00","romania":"23:00","group":"D","home":"USA","away":"Australia","venue":"Seattle"},{"id":"gs_43","date":"Fri 19 Jun","canaries":"23:00","romania":"02:00","group":"C","home":"Scotland","away":"Morocco","venue":"Boston"},{"id":"gs_45","date":"Sat 20 Jun","canaries":"01:30","romania":"04:30","group":"C","home":"Brazil","away":"Haiti","venue":"Philadelphia"},{"id":"gs_46","date":"Sat 20 Jun","canaries":"04:00","romania":"07:00","group":"D","home":"Turkey","away":"Paraguay","venue":"San Francisco"},{"id":"gs_47","date":"Sat 20 Jun","canaries":"18:00","romania":"21:00","group":"F","home":"Netherlands","away":"Sweden","venue":"Houston"},{"id":"gs_48","date":"Sat 20 Jun","canaries":"21:00","romania":"00:00","group":"E","home":"Germany","away":"Ivory Coast","venue":"Toronto"},{"id":"gs_50","date":"Sun 21 Jun","canaries":"01:00","romania":"04:00","group":"E","home":"Ecuador","away":"Curaçao","venue":"Kansas City"},{"id":"gs_51","date":"Sun 21 Jun","canaries":"05:00","romania":"08:00","group":"F","home":"Tunisia","away":"Japan","venue":"Monterrey"},{"id":"gs_52","date":"Sun 21 Jun","canaries":"17:00","romania":"20:00","group":"H","home":"Spain","away":"Saudi Arabia","venue":"Atlanta"},{"id":"gs_53","date":"Sun 21 Jun","canaries":"20:00","romania":"23:00","group":"G","home":"Belgium","away":"Iran","venue":"Los Angeles"},{"id":"gs_54","date":"Sun 21 Jun","canaries":"23:00","romania":"02:00","group":"H","home":"Uruguay","away":"Cape Verde","venue":"Miami"},{"id":"gs_56","date":"Mon 22 Jun","canaries":"02:00","romania":"05:00","group":"G","home":"New Zealand","away":"Egypt","venue":"Vancouver"},{"id":"gs_57","date":"Mon 22 Jun","canaries":"18:00","romania":"21:00","group":"J","home":"Argentina","away":"Austria","venue":"Dallas"},{"id":"gs_58","date":"Mon 22 Jun","canaries":"22:00","romania":"01:00","group":"I","home":"France","away":"Iraq","venue":"Philadelphia"},{"id":"gs_60","date":"Tue 23 Jun","canaries":"01:00","romania":"04:00","group":"I","home":"Norway","away":"Senegal","venue":"New Jersey"},{"id":"gs_61","date":"Tue 23 Jun","canaries":"04:00","romania":"07:00","group":"J","home":"Jordan","away":"Algeria","venue":"San Francisco"},{"id":"gs_62","date":"Tue 23 Jun","canaries":"18:00","romania":"21:00","group":"K","home":"Portugal","away":"Uzbekistan","venue":"Houston"},{"id":"gs_63","date":"Tue 23 Jun","canaries":"21:00","romania":"00:00","group":"L","home":"England","away":"Ghana","venue":"Boston"},{"id":"gs_64","date":"Tue 23 Jun","canaries":"00:00","romania":"03:00","group":"L","home":"Panama","away":"Croatia","venue":"Toronto"},{"id":"gs_66","date":"Wed 24 Jun","canaries":"03:00","romania":"06:00","group":"K","home":"Colombia","away":"DR Congo","venue":"Guadalajara"},{"id":"gs_67","date":"Wed 24 Jun","canaries":"20:00","romania":"23:00","group":"B","home":"Switzerland","away":"Canada","venue":"Vancouver"},{"id":"gs_68","date":"Wed 24 Jun","canaries":"20:00","romania":"23:00","group":"B","home":"Bosnia-Herz.","away":"Qatar","venue":"Seattle"},{"id":"gs_69","date":"Wed 24 Jun","canaries":"23:00","romania":"02:00","group":"C","home":"Scotland","away":"Brazil","venue":"Miami"},{"id":"gs_70","date":"Wed 24 Jun","canaries":"23:00","romania":"02:00","group":"C","home":"Morocco","away":"Haiti","venue":"Atlanta"},{"id":"gs_72","date":"Thu 25 Jun","canaries":"02:00","romania":"05:00","group":"A","home":"Czech Republic","away":"Mexico","venue":"Mexico City"},{"id":"gs_73","date":"Thu 25 Jun","canaries":"02:00","romania":"05:00","group":"A","home":"South Africa","away":"South Korea","venue":"Guadalajara"},{"id":"gs_74","date":"Thu 25 Jun","canaries":"21:00","romania":"00:00","group":"E","home":"Curaçao","away":"Ivory Coast","venue":"Philadelphia"},{"id":"gs_75","date":"Thu 25 Jun","canaries":"21:00","romania":"00:00","group":"E","home":"Ecuador","away":"Germany","venue":"New Jersey"},{"id":"gs_76","date":"Thu 25 Jun","canaries":"00:00","romania":"03:00","group":"F","home":"Japan","away":"Sweden","venue":"Dallas"},{"id":"gs_77","date":"Thu 25 Jun","canaries":"00:00","romania":"03:00","group":"F","home":"Tunisia","away":"Netherlands","venue":"Kansas City"},{"id":"gs_79","date":"Fri 26 Jun","canaries":"03:00","romania":"06:00","group":"D","home":"Turkey","away":"USA","venue":"Los Angeles"},{"id":"gs_80","date":"Fri 26 Jun","canaries":"03:00","romania":"06:00","group":"D","home":"Paraguay","away":"Australia","venue":"San Francisco"},{"id":"gs_81","date":"Fri 26 Jun","canaries":"20:00","romania":"23:00","group":"I","home":"Norway","away":"France","venue":"Boston"},{"id":"gs_82","date":"Fri 26 Jun","canaries":"20:00","romania":"23:00","group":"I","home":"Senegal","away":"Iraq","venue":"Toronto"},{"id":"gs_83","date":"Fri 26 Jun","canaries":"01:00","romania":"04:00","group":"H","home":"Cape Verde","away":"Saudi Arabia","venue":"Houston"},{"id":"gs_84","date":"Fri 26 Jun","canaries":"01:00","romania":"04:00","group":"H","home":"Uruguay","away":"Spain","venue":"Guadalajara"},{"id":"gs_86","date":"Sat 27 Jun","canaries":"04:00","romania":"07:00","group":"G","home":"Egypt","away":"Iran","venue":"Seattle"},{"id":"gs_87","date":"Sat 27 Jun","canaries":"04:00","romania":"07:00","group":"G","home":"New Zealand","away":"Belgium","venue":"Vancouver"},{"id":"gs_88","date":"Sat 27 Jun","canaries":"22:00","romania":"01:00","group":"L","home":"Panama","away":"England","venue":"New Jersey"},{"id":"gs_89","date":"Sat 27 Jun","canaries":"22:00","romania":"01:00","group":"L","home":"Croatia","away":"Ghana","venue":"Philadelphia"},{"id":"gs_90","date":"Sat 27 Jun","canaries":"00:30","romania":"03:30","group":"K","home":"Colombia","away":"Portugal","venue":"Miami"},{"id":"gs_91","date":"Sat 27 Jun","canaries":"00:30","romania":"03:30","group":"K","home":"DR Congo","away":"Uzbekistan","venue":"Atlanta"},{"id":"gs_93","date":"Sun 28 Jun","canaries":"03:00","romania":"06:00","group":"J","home":"Algeria","away":"Austria","venue":"Kansas City"},{"id":"gs_94","date":"Sun 28 Jun","canaries":"03:00","romania":"06:00","group":"J","home":"Jordan","away":"Argentina","venue":"Dallas"}];

const INITIAL_KO = [{"id":"P73","round":"ROUND OF 32","date":"28 Jun","canaries":"22:00","romania":"01:00"},{"id":"P74","round":"ROUND OF 32","date":"29 Jun","canaries":"03:30","romania":"06:30"},{"id":"P75","round":"ROUND OF 32","date":"30 Jun","canaries":"04:00","romania":"07:00"},{"id":"P76","round":"ROUND OF 32","date":"29 Jun","canaries":"00:00","romania":"03:00"},{"id":"P77","round":"ROUND OF 32","date":"30 Jun","canaries":"04:00","romania":"07:00"},{"id":"P78","round":"ROUND OF 32","date":"30 Jun","canaries":"00:00","romania":"03:00"},{"id":"P79","round":"ROUND OF 32","date":"1 Jul","canaries":"04:00","romania":"07:00"},{"id":"P80","round":"ROUND OF 32","date":"1 Jul","canaries":"23:00","romania":"02:00"},{"id":"P81","round":"ROUND OF 32","date":"2 Jul","canaries":"03:00","romania":"06:00"},{"id":"P82","round":"ROUND OF 32","date":"1 Jul","canaries":"03:00","romania":"06:00"},{"id":"P83","round":"ROUND OF 32","date":"2 Jul","canaries":"00:00","romania":"03:00"},{"id":"P84","round":"ROUND OF 32","date":"2 Jul","canaries":"02:00","romania":"05:00"},{"id":"P85","round":"ROUND OF 32","date":"3 Jul","canaries":"04:00","romania":"07:00"},{"id":"P86","round":"ROUND OF 32","date":"3 Jul","canaries":"00:00","romania":"03:00"},{"id":"P87","round":"ROUND OF 32","date":"4 Jul","canaries":"04:30","romania":"07:30"},{"id":"P88","round":"ROUND OF 32","date":"3 Jul","canaries":"01:00","romania":"04:00"},{"id":"P89","round":"ROUND OF 16","date":"4-5 Jul","canaries":"04:00","romania":"07:00"},{"id":"P90","round":"ROUND OF 16","date":"4-5 Jul","canaries":"00:00","romania":"03:00"},{"id":"P91","round":"ROUND OF 16","date":"5-6 Jul","canaries":"03:00","romania":"06:00"},{"id":"P92","round":"ROUND OF 16","date":"5-6 Jul","canaries":"03:00","romania":"06:00"},{"id":"P93","round":"ROUND OF 16","date":"6-7 Jul","canaries":"02:00","romania":"05:00"},{"id":"P94","round":"ROUND OF 16","date":"6-7 Jul","canaries":"03:00","romania":"06:00"},{"id":"P95","round":"ROUND OF 16","date":"7 Jul","canaries":"23:00","romania":"02:00"},{"id":"P96","round":"ROUND OF 16","date":"7 Jul","canaries":"03:00","romania":"06:00"},{"id":"P97","round":"QUARTER-FINALS","date":"9-10 Jul","canaries":"03:00","romania":"06:00"},{"id":"P98","round":"QUARTER-FINALS","date":"10 Jul","canaries":"02:00","romania":"05:00"},{"id":"P99","round":"QUARTER-FINALS","date":"11 Jul","canaries":"04:00","romania":"07:00"},{"id":"P100","round":"QUARTER-FINALS","date":"12 Jul","canaries":"04:00","romania":"07:00"},{"id":"P101","round":"SEMI-FINALS","date":"14 Jul","canaries":"02:00","romania":"05:00"},{"id":"P102","round":"SEMI-FINALS","date":"15 Jul","canaries":"02:00","romania":"05:00"},{"id":"P103","round":"3rd PLACE","date":"18 Jul","canaries":"00:00","romania":"03:00"},{"id":"P104","round":"FINAL ⚽","date":"19 Jul","canaries":"22:00","romania":"01:00"}];

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
            // Save to Supabase
            supabase.from("matches").upsert({
              id: m.id, type: "gs", goals_home: gh, goals_away: ga,
              joaquin: prev[m.id]?.joaquin || "", giada: prev[m.id]?.giada || ""
            }, { onConflict: "id" }).then(() => {});
          }
        });
        return changed ? next : prev;
      });
    }

    syncResults();
    const interval = setInterval(syncResults, 3 * 60 * 1000); // every 3 min
    return () => clearInterval(interval);
  }, []);

  const debouncedSave = useCallback(async (id, type, fields) => {
    setSaving(true);
    try {
      await upsertMatch({ id, type, ...fields });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Save error:", e);
    }
    setSaving(false);
  }, []);

  const updateGS = useCallback((id, field, val) => {
    setGsData(prev => {
      const updated = { ...prev[id], [field]: val };
      const next = { ...prev, [id]: updated };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() =>
        debouncedSave(id, "gs", {
          goals_home: next[id].goals_home ?? null,
          goals_away: next[id].goals_away ?? null,
          joaquin: next[id].joaquin || "",
          giada: next[id].giada || ""
        }), 600);
      return next;
    });
  }, [debouncedSave]);

  const updateKO = useCallback((id, field, val) => {
    setKoData(prev => {
      const updated = { ...prev[id], [field]: val };
      const next = { ...prev, [id]: updated };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() =>
        debouncedSave(id, "ko", {
          goals_home: next[id]?.goals_home ?? null,
          goals_away: next[id]?.goals_away ?? null,
          joaquin: next[id]?.joaquin || "",
          giada: next[id]?.giada || "",
          home_team: next[id]?.home_team || "",
          away_team: next[id]?.away_team || ""
        }), 600);
      return next;
    });
  }, [debouncedSave]);

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
    const homeTeam = d.home_team || resolveLabel(labels[0], standings);
    const awayTeam = d.away_team || resolveLabel(labels[1], standings);
    const res = getResult(d.goals_home, d.goals_away);
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
    const res = getResult(m.goals_home, m.goals_away);
    if (!res) return a;
    if (m.joaquin===res) a.j++;
    if (m.giada===res) a.g++;
    return a;
  }, {j:0,g:0});
  const total = { j: gsScore.j+koScore.j, g: gsScore.g+koScore.g };

  if (loading) return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",
      height:"100vh",fontFamily:"system-ui",fontSize:18,color:"#888"}}>
      ⚽ Loading...
    </div>
  );

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",maxWidth:900,
      margin:"0 auto",background:"#fff",minHeight:"100vh"}}>

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#922B21,#C0392B)",
        padding:"14px 16px",color:"#fff"}}>
        <div style={{display:"flex",justifyContent:"space-between",
          alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:17,fontWeight:800,letterSpacing:0.3}}>
              ⚽ FIFA WORLD CUP 2026
            </div>
            <div style={{fontSize:11,opacity:0.8,marginTop:1}}>
              Joaquín 🔵 vs Giada 🔴 · Predictions Tracker
            </div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <ScoreBox label="🔵 Joaquín" value={total.j} color="#1A5276"/>
            <div style={{color:"rgba(255,255,255,0.5)",fontSize:16}}>vs</div>
            <ScoreBox label="🔴 Giada" value={total.g} color="#922B21"/>
          </div>
        </div>
        <div style={{marginTop:6,fontSize:10,opacity:0.65}}>
          Groups · J {gsScore.j} G {gsScore.g} &nbsp;|&nbsp;
          Knockout · J {koScore.j} G {koScore.g}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"0 12px",borderBottom:"1px solid #E0E0E0",background:"#F8F9FA"}}>
        <div style={{display:"flex"}}>
          {[["groups","Groups"],["standings","Standings"],["knockout","Knockout"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)}
              style={{padding:"10px 14px",border:"none",cursor:"pointer",fontWeight:600,
                fontSize:13,background:"none",
                borderBottom:tab===k?"3px solid #C0392B":"3px solid transparent",
                color:tab===k?"#C0392B":"#555",transition:"all 0.15s"}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {saving && <span style={{fontSize:11,color:"#888"}}>Saving…</span>}
          {saved && <span style={{fontSize:11,color:"#1E8449",fontWeight:600}}>✓ Saved</span>}
          {lastSync && <span style={{fontSize:10,color:"#aaa"}}>
            🔄 {lastSync.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
          </span>}
          <button onClick={()=>setEditMode(!editMode)}
            style={{padding:"5px 12px",borderRadius:6,fontSize:12,fontWeight:600,
              cursor:"pointer",border:`1px solid ${editMode?"#C0392B":"#ccc"}`,
              background:editMode?"#C0392B":"#fff",color:editMode?"#fff":"#333",
              transition:"all 0.15s"}}>
            {editMode?"✓ Done":"✏️ Edit"}
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

function ScoreBox({label, value, color}) {
  return (
    <div style={{textAlign:"center",background:"rgba(255,255,255,0.15)",
      padding:"5px 12px",borderRadius:8}}>
      <div style={{fontSize:20,fontWeight:900}}>{value}</div>
      <div style={{fontSize:9,opacity:0.85}}>{label}</div>
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
        <div key={date} style={{marginBottom:14}}>
          <div style={{background:"#2C3E50",color:"#fff",padding:"4px 10px",
            borderRadius:5,fontSize:12,fontWeight:700,marginBottom:5}}>
            {date}
          </div>
          {ms.map(m=><MatchRow key={m.id} m={m} onUpdate={onUpdate}
            editMode={editMode} isKO={false}/>)}
        </div>
      ))}
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
    <div style={{borderRadius:7,overflow:"hidden",border:"1px solid #D5D8DC"}}>
      <div style={{background:"#1A5276",color:"#fff",padding:"5px 9px",
        fontWeight:700,fontSize:12}}>GROUP {group}</div>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead>
          <tr style={{background:"#1C1C1C",color:"#fff"}}>
            {["Team","P","W","D","L","GF","GA","GD","Pts"].map(h=>(
              <th key={h} style={{padding:"4px 5px",textAlign:h==="Team"?"left":"center",
                fontWeight:600,fontSize:10}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map(([name,s],i)=>(
            <tr key={name} style={{background:i<2?"#D5F5E3":i%2===0?"#F2F3F4":"#fff",
              borderTop:"1px solid #E0E0E0"}}>
              <td style={{padding:"4px 5px",fontWeight:i<2?700:400,
                color:i<2?"#1E8449":"#1C1C1C",fontSize:11}}>
                {i===0?"🥇":i===1?"🥈":i===2?"🥉":"  "} {name}
              </td>
              {[s.P,s.W,s.D,s.L,s.GF,s.GA,s.GD,s.Pts].map((v,j)=>(
                <td key={j} style={{padding:"4px 5px",textAlign:"center",
                  fontWeight:j===7?800:400,
                  color:j===7?"#1E8449":j===6&&v>0?"#C0392B":"#1C1C1C"}}>
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
function KnockoutTab({matches, onUpdate, editMode}) {
  const byRound={};
  matches.forEach(m=>{
    if(!byRound[m.round]) byRound[m.round]=[];
    byRound[m.round].push(m);
  });
  return (
    <div>
      <Legend isKO={true}/>
      <div style={{fontSize:11,color:"#888",marginBottom:10}}>
        Teams resolve automatically from standings · "Best 3rd" slots filled manually after group stage
      </div>
      {Object.entries(byRound).map(([round,ms])=>(
        <div key={round} style={{marginBottom:14}}>
          <div style={{background:ROUND_COLORS[round]||"#555",color:"#fff",
            padding:"5px 10px",borderRadius:5,fontSize:12,fontWeight:700,marginBottom:5}}>
            {round}
          </div>
          {ms.map(m=><MatchRow key={m.id} m={m} onUpdate={onUpdate}
            editMode={editMode} isKO={true}/>)}
        </div>
      ))}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend({isKO}) {
  return (
    <div style={{fontSize:10,color:"#888",marginBottom:10,padding:"6px 10px",
      background:"#F8F9FA",borderRadius:6,border:"1px solid #E0E0E0"}}>
      {isKO
        ? "Prediction: 1 = Home win at 90' · 2 = Away win at 90' · Goals auto-calculate result · ✅ correct ❌ wrong"
        : "Prediction: 1 = Home win · X = Draw · 2 = Away win · Enter goals to auto-calculate result · ✅ correct ❌ wrong"}
    </div>
  );
}

// ─── Match Row ────────────────────────────────────────────────────────────────
function MatchRow({m, onUpdate, editMode, isKO}) {
  const gh = m.goals_home, ga = m.goals_away;
  const res = getResult(gh, ga);
  const played = gh !== null && gh !== undefined && ga !== null && ga !== undefined;
  const jOk = res && m.joaquin===res;
  const gOk = res && m.giada===res;
  const preds = isKO ? ["1","2"] : ["1","X","2"];
  const homeTeam = isKO ? (m.homeTeam || m.homeLabel) : m.home;
  const awayTeam = isKO ? (m.awayTeam || m.awayLabel) : m.away;
  const isTBD_home = isKO && !m.homeTeam;
  const isTBD_away = isKO && !m.awayTeam;
  const badge = isKO ? m.id : `G${m.group}`;
  const badgeColor = isKO ? (ROUND_COLORS[m.round]||"#555") : "#F39C12";

  return (
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 8px",
      background:played?"#fff":"#F9F9F9",borderRadius:6,marginBottom:3,
      border:`1px solid ${played?"#D5D8DC":"#EAECEE"}`,flexWrap:"wrap"}}>

      {/* Badge + times */}
      <div style={{display:"flex",flexDirection:"column",gap:1,minWidth:58}}>
        <span style={{background:badgeColor,color:"#fff",padding:"1px 6px",
          borderRadius:9,fontSize:9,fontWeight:700,textAlign:"center"}}>
          {badge}
        </span>
        <span style={{fontSize:8,color:"#aaa",textAlign:"center"}}>
          🌴{m.canaries}
        </span>
        <span style={{fontSize:8,color:"#aaa",textAlign:"center"}}>
          🇷🇴{m.romania}
        </span>
      </div>

      {/* Home team */}
      <span style={{fontWeight:700,fontSize:12,textAlign:"right",flex:1,
        color:isTBD_home?"#bbb":played&&res==="1"?"#1A5276":"#1C1C1C",
        fontStyle:isTBD_home?"italic":"normal",minWidth:80}}>
        {homeTeam}
      </span>

      {/* Score / goals */}
      {editMode ? (
        <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
          <GoalInput val={gh} onChange={v=>onUpdate(m.id,"goals_home",v)}/>
          <span style={{color:"#ccc",fontSize:11}}>–</span>
          <GoalInput val={ga} onChange={v=>onUpdate(m.id,"goals_away",v)}/>
        </div>
      ) : (
        <div style={{minWidth:46,textAlign:"center",fontWeight:800,fontSize:13,
          color:"#1C1C1C",flexShrink:0}}>
          {played ? `${gh} – ${ga}` : <span style={{color:"#ccc",fontSize:11}}>vs</span>}
        </div>
      )}

      {/* Away team */}
      <span style={{fontWeight:700,fontSize:12,flex:1,
        color:isTBD_away?"#bbb":played&&res==="2"?"#C0392B":"#1C1C1C",
        fontStyle:isTBD_away?"italic":"normal",minWidth:80}}>
        {awayTeam}
      </span>

      {/* Predictions */}
      <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
        <div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
          <span style={{fontSize:8,color:"#1A5276",fontWeight:700}}>J</span>
          <div style={{display:"flex",gap:2}}>
            {preds.map(v=>(
              <PredBtn key={v} val={v} current={m.joaquin}
                onChange={val=>onUpdate(m.id,"joaquin",val)}
                disabled={!editMode}/>
            ))}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
          <span style={{fontSize:8,color:"#C0392B",fontWeight:700}}>G</span>
          <div style={{display:"flex",gap:2}}>
            {preds.map(v=>(
              <PredBtn key={v} val={v} current={m.giada}
                onChange={val=>onUpdate(m.id,"giada",val)}
                disabled={!editMode}/>
            ))}
          </div>
        </div>
      </div>

      {/* Result indicators */}
      <div style={{display:"flex",flexDirection:"column",gap:2,
        alignItems:"center",minWidth:22}}>
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
    "1":{a:"#1A5276",i:"#D6EAF8",af:"#fff",if:"#1A5276"},
    "X":{a:"#5D6D7E",i:"#EAECEE",af:"#fff",if:"#5D6D7E"},
    "2":{a:"#922B21",i:"#FDECEA",af:"#fff",if:"#922B21"},
  };
  const c = cfg[val];
  return (
    <button disabled={disabled} onClick={()=>onChange(active?"":val)}
      style={{padding:"2px 7px",borderRadius:4,border:"1px solid #BDC3C7",
        background:active?c.a:c.i,color:active?c.af:c.if,
        fontWeight:700,fontSize:12,cursor:disabled?"default":"pointer",
        minWidth:26,transition:"all 0.12s"}}>
      {val}
    </button>
  );
}

function GoalInput({val, onChange}) {
  return (
    <input type="number" min={0} max={30} value={val??""} 
      onChange={e=>onChange(e.target.value===""?null:parseInt(e.target.value))}
      style={{width:36,textAlign:"center",padding:"2px 3px",
        border:"1px solid #BDC3C7",borderRadius:4,
        background:"#D5F5E3",color:"#1E8449",fontWeight:700,fontSize:13}}/>
  );
}
