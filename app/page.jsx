"use client";

import { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// ✏️  EDIT THESE 15 NAMES before you deploy
// ─────────────────────────────────────────────────────────────────────────────
const PLAYERS = [
  "Safi",      "Mitch",     "Julie Ann",
  "Mo",      "Nicolas",   "Noah",
  "Innocent",     "Jojo",   "Hervé",
  "Lily M",      "Hirwa",     "Nshuti",
  "Timon",    "Ian",    "Mr Dot",
];
// ─────────────────────────────────────────────────────────────────────────────

const TEAMS = {
  green:  { name: "Green Team",  hex: "#16a34a", light: "#dcfce7", dark: "#14532d", emoji: "🟢", glow: "0 0 0 3px #16a34a, 0 0 24px rgba(22,163,74,.45)"  },
  orange: { name: "Orange Team", hex: "#ea580c", light: "#fff0e6", dark: "#7c2d12", emoji: "🟠", glow: "0 0 0 3px #ea580c, 0 0 24px rgba(234,88,12,.45)"  },
  black:  { name: "Black Team",  hex: "#44403c", light: "#e7e5e4", dark: "#1c1917", emoji: "⚫", glow: "0 0 0 3px #44403c, 0 0 24px rgba(68,64,60,.6)"    },
};

const MY_KEY = "footy_player_v1";

export default function Page() {
  const [data,   setData]   = useState(null);       // { assignments, counts }
  const [myName, setMyName] = useState(null);
  const [status, setStatus] = useState("loading");  // loading | idle | saving
  const [tab,    setTab]    = useState("players");
  const [shake,  setShake]  = useState(null);
  const [toast,  setToast]  = useState(null);

  // ── Load data ───────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch("/api/teams", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setData(json);
      return json;
    } catch {
      flash("⚠️ Connection problem — retrying…", "error");
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const json = await fetchData();
      const saved = localStorage.getItem(MY_KEY);
      if (saved && json?.assignments?.[saved]) {
        setMyName(saved);
        setTab("teams");
      }
      setStatus("idle");
    })();
  }, [fetchData]);

  // ── Toast helper ────────────────────────────────────────────────────────────
  function flash(msg, type = "info") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  // ── Pick name ───────────────────────────────────────────────────────────────
  async function pickName(name) {
    if (myName || status === "saving") return;

    if (data?.assignments?.[name]) {
      setShake(name);
      setTimeout(() => setShake(null), 500);
      flash("That name is already taken!", "error");
      return;
    }

    setStatus("saving");
    try {
      const res  = await fetch("/api/teams", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name }),
      });
      const json = await res.json();

      if (!res.ok) {
        flash(json.error ?? "Something went wrong", "error");
        setStatus("idle");
        return;
      }

      setData(json.data);
      setMyName(name);
      localStorage.setItem(MY_KEY, name);
      setTab("teams");
      setStatus("idle");
      flash(`🎉 You joined ${TEAMS[json.team].name}!`, "success");
    } catch {
      flash("Network error — try again", "error");
      setStatus("idle");
    }
  }

  // ── Reset (Safi only) ───────────────────────────────────────────────────────
  async function resetAll() {
    if (!window.confirm("Reset all team assignments? This cannot be undone.")) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/teams", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: "Safi" }),
      });
      if (!res.ok) { flash("Reset failed", "error"); setStatus("idle"); return; }
      localStorage.removeItem(MY_KEY);
      setMyName(null);
      setTab("players");
      await fetchData();
      setStatus("idle");
      flash("♻️ All assignments cleared", "success");
    } catch {
      flash("Network error — try again", "error");
      setStatus("idle");
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const assignments = data?.assignments ?? {};
  const counts      = data?.counts      ?? { green: 0, orange: 0, black: 0 };
  const totalPicked = Object.keys(assignments).length;
  const myTeam      = myName ? TEAMS[assignments[myName]] : null;
  const allFull     = totalPicked >= 15;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (status === "loading") return (
    <div style={s.page}>
      <div style={s.center}>
        <span className="spin" style={{ fontSize: 64 }}>⚽</span>
        <p style={{ color: "#78716c", fontSize: 16, fontWeight: 600, letterSpacing: 1, marginTop: 16 }}>
          Loading teams…
        </p>
      </div>
    </div>
  );

  // ── App ──────────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>

      {/* Toast */}
      {toast && (
        <div className="toast" style={{
          ...s.toast,
          ...(toast.type === "error"   ? s.toastErr : {}),
          ...(toast.type === "success" ? s.toastOk  : {}),
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <header style={s.header}>
        <span style={s.pill}>⚽ SQUAD UP</span>
        <h1 style={s.h1}>Team<br />Selector</h1>
        <p style={s.sub}>{totalPicked} / 15 players assigned</p>

        {/* Tri-segment progress bar */}
        <div style={s.barWrap}>
          {["green", "orange", "black"].map(t => (
            <div key={t} style={{
              ...s.barSeg,
              background: TEAMS[t].hex,
              flex: counts[t] || 0,
              opacity: counts[t] ? 1 : 0,
            }} />
          ))}
          <div style={{ ...s.barSeg, background: "#292524", flex: Math.max(15 - totalPicked, 0) }} />
        </div>

        {/* Team counts row */}
        <div style={s.teamCountsRow}>
          {["green", "orange", "black"].map(t => (
            <span key={t} style={{ ...s.teamPill, background: TEAMS[t].hex }}>
              {TEAMS[t].emoji} {counts[t]}/5
            </span>
          ))}
        </div>

        {allFull && <div style={s.fullBadge}>🏆 All teams set — let's play!</div>}

        {myName === "Safi" && (
          <button
            onClick={resetAll}
            disabled={status === "saving"}
            style={s.resetBtn}>
            ♻️ Reset all assignments
          </button>
        )}
      </header>

      {/* ── Tabs ── */}
      <nav style={s.tabBar}>
        {[["players", "👥 Players"], ["teams", "🏆 Teams"]].map(([id, label]) => (
          <button key={id}
            style={{ ...s.tabBtn, ...(tab === id ? s.tabActive : {}) }}
            onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      {/* ════════════ PLAYERS TAB ════════════ */}
      {tab === "players" && (
        <main style={s.main}>
          {myName
            ? <div style={s.banner}>✅ You joined as <strong>{myName}</strong> — tap Teams to see your squad!</div>
            : <p style={s.hint}>Tap your name to join a team</p>
          }

          {status === "saving" && (
            <p style={{ ...s.hint, color: "#ea580c" }}>
              <span className="spin" style={{ fontSize: 14, marginRight: 6 }}>⚽</span>
              Assigning team…
            </p>
          )}

          <div style={s.grid}>
            {PLAYERS.map(name => {
              const team       = assignments[name];
              const taken      = !!team;
              const isMe       = name === myName;
              const ti         = team ? TEAMS[team] : null;
              const selectable = !taken && !myName && status === "idle";

              return (
                <button
                  key={name}
                  disabled={!selectable}
                  onClick={() => selectable && pickName(name)}
                  className={`name-card${shake === name ? " shake" : ""}`}
                  style={{
                    ...s.nameCard,
                    ...(taken ? {
                      background:   ti.light,
                      borderColor:  ti.hex,
                      color:        ti.dark,
                      cursor:       "default",
                    } : {}),
                    ...(isMe ? { boxShadow: ti.glow } : {}),
                    ...(selectable ? {} : { cursor: "default" }),
                  }}>
                  {isMe && <span style={s.youTag}>YOU</span>}
                  <span style={s.playerName}>{name}</span>
                  {taken
                    ? <span style={{ ...s.smallText, color: ti.dark }}>{ti.emoji} {ti.name.replace(" Team","")}</span>
                    : <span style={s.tapHint}>tap to join</span>
                  }
                </button>
              );
            })}
          </div>
        </main>
      )}

      {/* ════════════ TEAMS TAB ════════════ */}
      {tab === "teams" && (
        <main style={s.main}>

          {/* My team hero */}
          {myTeam && (
            <div className="hero-card" style={{
              ...s.heroCard,
              background: `linear-gradient(140deg, ${myTeam.dark} 0%, ${myTeam.hex} 100%)`,
            }}>
              <div style={s.heroEyebrow}>YOU&apos;RE ON</div>
              <div style={s.heroName}>{myTeam.name.toUpperCase()}</div>
              <div style={{ fontSize: 40, margin: "6px 0" }}>{"⚽".repeat(5)}</div>
              <div style={s.heroSub}>Let&apos;s go, {myName.split(" ")[0]}! 🔥</div>
            </div>
          )}

          {/* All 3 team cards */}
          {["green", "orange", "black"].map(key => {
            const t       = TEAMS[key];
            const members = PLAYERS.filter(p => assignments[p] === key);
            const spots   = 5 - members.length;
            const isMyTeam = myName && assignments[myName] === key;

            return (
              <div key={key} style={{ ...s.teamCard, borderColor: t.hex, ...(isMyTeam ? { boxShadow: `0 0 0 1px ${t.hex}` } : {}) }}>
                <div style={{ ...s.teamHead, background: t.hex }}>
                  <span style={s.teamHeadName}>{t.emoji} {t.name}</span>
                  <span style={s.teamHeadCount}>{members.length} / 5</span>
                </div>
                <div style={s.memberList}>
                  {members.map(p => (
                    <div key={p} style={{ ...s.memberRow, ...(p === myName ? { background: t.light } : {}) }}>
                      <span style={{ ...s.dot, background: t.hex }} />
                      <span style={{ color: p === myName ? t.dark : "#fafaf9", fontWeight: p === myName ? 800 : 600 }}>
                        {p}{p === myName ? " 👈 you" : ""}
                      </span>
                    </div>
                  ))}
                  {[...Array(spots)].map((_, i) => (
                    <div key={i} style={{ ...s.memberRow, opacity: 0.3 }}>
                      <span style={{ ...s.dot, background: "#57534e" }} />
                      <span style={{ fontStyle: "italic", color: "#a8a29e", fontSize: 13 }}>Waiting for player…</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </main>
      )}

      <div style={{ height: 48 }} />
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page:   { minHeight: "100vh", background: "#0f0e0d", color: "#fafaf9", fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif" },
  center: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" },

  toast:    { position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: "#292524", color: "#fafaf9", padding: "10px 20px", borderRadius: 99, fontSize: 14, fontWeight: 700, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,.5)", maxWidth: "90vw" },
  toastErr: { background: "#7f1d1d", color: "#fca5a5" },
  toastOk:  { background: "#14532d", color: "#86efac" },

  header:       { background: "linear-gradient(160deg,#1c1917 0%,#292524 100%)", padding: "28px 20px 18px", borderBottom: "2px solid #292524" },
  pill:         { display: "inline-block", background: "#ea580c", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: 2, padding: "3px 10px", borderRadius: 4, marginBottom: 10 },
  h1:           { fontSize: 52, fontWeight: 900, lineHeight: 1, letterSpacing: -1, margin: "0 0 6px", textTransform: "uppercase" },
  sub:          { fontSize: 14, color: "#78716c", margin: "0 0 12px", fontWeight: 600 },
  barWrap:      { display: "flex", height: 8, borderRadius: 99, overflow: "hidden", gap: 3, marginBottom: 12 },
  barSeg:       { minWidth: 0, borderRadius: 99, transition: "flex .6s ease, opacity .3s" },
  teamCountsRow: { display: "flex", gap: 8, marginTop: 2 },
  teamPill:     { fontSize: 12, fontWeight: 700, color: "#fff", padding: "3px 10px", borderRadius: 99 },
  fullBadge:    { marginTop: 12, display: "inline-block", background: "#15803d", color: "#bbf7d0", fontSize: 13, fontWeight: 800, letterSpacing: 1, padding: "4px 12px", borderRadius: 6 },

  tabBar:    { display: "flex", background: "#1c1917", borderBottom: "1px solid #292524", position: "sticky", top: 0, zIndex: 10 },
  tabBtn:    { flex: 1, background: "transparent", border: "none", borderBottom: "2px solid transparent", color: "#78716c", fontSize: 14, fontWeight: 700, letterSpacing: .5, padding: "14px 0", cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase", transition: "color .15s" },
  tabActive: { color: "#ea580c", borderBottomColor: "#ea580c" },

  main:   { padding: "16px", maxWidth: 500, margin: "0 auto" },
  hint:   { textAlign: "center", fontSize: 15, color: "#a8a29e", fontWeight: 600, letterSpacing: .5, margin: "10px 0 14px" },
  banner: { background: "#1c1917", border: "1px solid #292524", borderRadius: 10, padding: "11px 16px", fontSize: 14, color: "#a8a29e", marginBottom: 14, textAlign: "center" },

  grid:       { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  nameCard:   { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "12px 6px", borderRadius: 12, border: "1.5px solid #292524", background: "#1c1917", color: "#fafaf9", minHeight: 70, fontFamily: "inherit", textAlign: "center", gap: 3, transition: "all .18s" },
  playerName: { fontSize: 13, fontWeight: 700, lineHeight: 1.2 },
  smallText:  { fontSize: 10, fontWeight: 700 },
  tapHint:    { fontSize: 10, color: "#57534e", fontStyle: "italic" },
  youTag:     { position: "absolute", top: 4, right: 6, fontSize: 9, fontWeight: 800, color: "#ea580c", letterSpacing: .5 },

  heroCard:    { borderRadius: 18, padding: "26px 20px", textAlign: "center", marginBottom: 18, boxShadow: "0 8px 40px rgba(0,0,0,.5)" },
  heroEyebrow: { fontSize: 11, letterSpacing: 3, fontWeight: 800, opacity: .7, textTransform: "uppercase" },
  heroName:    { fontSize: 44, fontWeight: 900, lineHeight: 1, letterSpacing: -1, margin: "4px 0 2px" },
  heroSub:     { fontSize: 15, marginTop: 8, opacity: .85, fontWeight: 600 },

  teamCard:     { borderRadius: 14, border: "1.5px solid", overflow: "hidden", marginBottom: 14, background: "#1c1917" },
  teamHead:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px" },
  teamHeadName: { fontSize: 17, fontWeight: 800, letterSpacing: .5, color: "#fff", textTransform: "uppercase" },
  teamHeadCount: { fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.8)", background: "rgba(0,0,0,.25)", padding: "2px 8px", borderRadius: 99 },
  memberList:   { padding: "6px 0" },
  memberRow:    { display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderRadius: 8, margin: "2px 6px", transition: "background .2s", fontSize: 15 },
  dot:          { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },

  resetBtn: { marginTop: 14, display: "block", width: "100%", background: "transparent", border: "1px solid #44403c", borderRadius: 8, color: "#78716c", fontSize: 12, fontWeight: 700, letterSpacing: .5, padding: "8px 0", cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" },
};
