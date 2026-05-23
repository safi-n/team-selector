"use client";

import { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// ✏️  EDIT THESE 21 NAMES before you deploy
// ─────────────────────────────────────────────────────────────────────────────
const PLAYERS = [
  "Safi",      "Jojo",      "JulieAnna",
  "Open Spot", "Nelson",    "Noah",
  "Innocent",  "Mitch",     "Hervé",
  "Lily M",    "Hirwa",     "Nshuti",
  "Timon",     "Open Spot", "Eddy",
  "Anthony",   "Ian",       "Sammy HF",
  "Oluwaseun", "Brain JF",  "Sammy JF",
];
// ─────────────────────────────────────────────────────────────────────────────

const TEAMS = {
  green:  { name: "Green Team",  hex: "#16a34a", light: "#f0fdf4", dark: "#15803d", emoji: "🟢", glow: "0 0 0 2px #16a34a" },
  orange: { name: "Orange Team", hex: "#ea580c", light: "#fff7ed", dark: "#c2410c", emoji: "🟠", glow: "0 0 0 2px #ea580c" },
  black:  { name: "Black Team",  hex: "#78716c", light: "#f5f5f4", dark: "#44403c", emoji: "⚫", glow: "0 0 0 2px #78716c" },
  white:  { name: "White Team",  hex: "#abc2e1", light: "#f8fafc", dark: "#0f172a", emoji: "⚪", glow: "0 0 0 2px #64748b" },
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
      flash(json.team === "wildcard" ? "⚡ You're the Change Maker!" : `🎉 You joined ${TEAMS[json.team].name}!`, "success");
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
  const assignments     = data?.assignments ?? {};
  const counts          = data?.counts      ?? { green: 0, orange: 0, black: 0, white: 0 };
  const totalPicked     = Object.keys(assignments).length;
  const changeMakerName = Object.keys(assignments).find(p => assignments[p] === "wildcard") ?? null;
  const isChangeMaker   = !!myName && assignments[myName] === "wildcard";
  const myTeam          = myName && !isChangeMaker ? TEAMS[assignments[myName]] : null;
  const allFull         = totalPicked >= 21;

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
      <header>
        {/* Black title bar */}
        <div style={s.titleBar}>
          <span style={s.titleText}>⚽ Find your team</span>
        </div>

        {/* Progress bar — 4 team segments */}
        <div style={s.barWrap}>
          {["green", "orange", "black", "white"].map(t => (
            <div key={t} style={{
              ...s.barSeg,
              background: TEAMS[t].hex,
              flex: counts[t] || 0,
              opacity: counts[t] ? 1 : 0,
            }} />
          ))}
          <div style={{ ...s.barSeg, background: "#e5e7eb", flex: Math.max(21 - totalPicked, 0) }} />
        </div>

        {/* Team pills + player count */}
        <div style={s.pillsRow}>
          <div style={s.teamCountsRow}>
            {["green", "orange", "black", "white"].map(t => (
              <span key={t} style={{ ...s.teamPill, background: TEAMS[t].hex }}>
                {TEAMS[t].emoji} {counts[t]}/5
              </span>
            ))}
          </div>
          <span style={s.sub}>{totalPicked} / 21 players</span>
        </div>

        {allFull && <div style={{ ...s.fullBadge, margin: "0 16px 10px" }}>🏆 All 4 teams set — let's play!</div>}

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
        {[["players", "Players"], ["teams", "Teams"]].map(([id, label]) => (
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
              const isWildcard = team === "wildcard";
              const ti         = taken && !isWildcard ? TEAMS[team] : null;
              const selectable = !taken && !myName && status === "idle";

              return (
                <button
                  key={name}
                  disabled={!selectable}
                  onClick={() => selectable && pickName(name)}
                  className={`name-card${shake === name ? " shake" : ""}`}
                  style={{
                    ...s.nameCard,
                    ...(taken && !isWildcard ? {
                      background:  ti.light,
                      borderColor: ti.hex,
                      color:       ti.dark,
                      cursor:      "default",
                    } : {}),
                    ...(taken && isWildcard ? {
                      background:  "#faf5ff",
                      borderColor: "#7c3aed",
                      cursor:      "default",
                    } : {}),
                    ...(isMe && !isWildcard ? { boxShadow: ti.glow } : {}),
                    ...(isMe && isWildcard  ? { boxShadow: "0 0 0 2px #7c3aed" } : {}),
                    ...(selectable ? {} : { cursor: "default" }),
                  }}>
                  {isMe && <span style={s.youTag}>YOU</span>}
                  <span style={{ ...s.playerName, ...(isWildcard ? { color: "#6d28d9" } : {}) }}>{name}</span>
                  {taken && !isWildcard && <span style={{ ...s.smallText, color: ti.dark }}>{ti.emoji} {ti.name.replace(" Team","")}</span>}
                  {taken && isWildcard   && <span style={{ ...s.smallText, color: "#7c3aed" }}>⚡ Change Maker</span>}
                  {!taken               && <span style={s.tapHint}>tap to join</span>}
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
              background: myTeam.light,
              borderColor: myTeam.hex,
            }}>
              <div style={s.heroEyebrow}>YOU&apos;RE ON</div>
              <div style={{ ...s.heroName, color: myTeam.dark }}>{myTeam.name.toUpperCase()}</div>
              <div style={{ fontSize: 20, margin: "6px 0", opacity: 0.4 }}>{"⚽ ".repeat(5).trim()}</div>
              <div style={{ ...s.heroSub, color: myTeam.dark }}>Let&apos;s go, {myName.split(" ")[0]}! 🔥</div>
            </div>
          )}

          {/* Change Maker hero — shown to the player who randomly got the wildcard */}
          {isChangeMaker && (
            <div className="hero-card" style={{ ...s.heroCard, background: "#faf5ff", borderColor: "#7c3aed" }}>
              <div style={s.heroEyebrow}>YOU ARE THE</div>
              <div style={{ ...s.heroName, color: "#6d28d9" }}>CHANGE MAKER</div>
              <div style={{ fontSize: 20, margin: "6px 0", opacity: 0.4 }}>⚡⚡⚡⚡</div>
              <div style={{ ...s.heroSub, color: "#6d28d9" }}>Play for any team that needs you! 🔥</div>
            </div>
          )}

          {/* All 4 team cards */}
          {["green", "orange", "black", "white"].map(key => {
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
                    <div key={p} style={{ ...s.memberRow, ...(p === myName ? { background: t.light, borderRadius: 8 } : {}) }}>
                      <span style={{ ...s.dot, background: t.hex }} />
                      <span style={{ color: p === myName ? t.dark : "#111827", fontWeight: p === myName ? 800 : 500, fontSize: 14 }}>
                        {p}{p === myName ? " 👈 you" : ""}
                      </span>
                    </div>
                  ))}
                  {[...Array(spots)].map((_, i) => (
                    <div key={i} style={{ ...s.memberRow, opacity: 0.3 }}>
                      <span style={{ ...s.dot, background: "#d1d5db" }} />
                      <span style={{ fontStyle: "italic", color: "#9ca3af", fontSize: 13 }}>Waiting for player…</span>
                    </div>
                  ))}

                  {/* Change Maker always appears as 6th player in every team */}
                  <div style={{ ...s.memberRow, borderTop: "1px dashed #e5e7eb", marginTop: 4, paddingTop: 10 }}>
                    <span style={{ fontSize: 13 }}>⚡</span>
                    <span style={{ fontSize: 13, color: changeMakerName ? "#6d28d9" : "#9ca3af", fontWeight: changeMakerName ? 700 : 400, fontStyle: changeMakerName ? "normal" : "italic" }}>
                      {changeMakerName
                        ? `${changeMakerName}${changeMakerName === myName ? " 👈 you" : ""}`
                        : "Change Maker (not yet picked)"}
                    </span>
                  </div>
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
  page:   { minHeight: "100vh", background: "#ffffff", color: "#111827", fontFamily: "'Inter', system-ui, sans-serif" },
  center: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" },

  toast:    { position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: "#1f2937", color: "#f9fafb", padding: "10px 22px", borderRadius: 99, fontSize: 13, fontWeight: 600, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 24px rgba(0,0,0,.2)", maxWidth: "90vw" },
  toastErr: { background: "#7f1d1d", color: "#fecaca" },
  toastOk:  { background: "#14532d", color: "#bbf7d0" },

  titleBar:  { background: "#000000", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "center" },
  titleText: { color: "#ffffff", fontSize: 20, fontWeight: 700, letterSpacing: -.3 },
  barWrap:   { display: "flex", height: 4, overflow: "hidden" },
  barSeg:    { minWidth: 0, transition: "flex .5s ease, opacity .3s" },
  pillsRow:  { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 8px" },
  teamCountsRow: { display: "flex", gap: 8 },
  teamPill:  { display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 700, color: "#fff", padding: "4px 12px", borderRadius: 99 },
  sub:       { fontSize: 13, color: "#6b7280", fontWeight: 500 },
  fullBadge: { display: "inline-flex", alignItems: "center", gap: 6, background: "#f0fdf4", color: "#15803d", fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 6, border: "1px solid #bbf7d0" },

  tabBar:    { display: "flex", background: "#ffffff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10 },
  tabBtn:    { flex: 1, background: "transparent", border: "none", borderBottom: "2px solid transparent", color: "#9ca3af", fontSize: 13, fontWeight: 700, letterSpacing: .5, padding: "14px 0", cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase", transition: "color .15s" },
  tabActive: { color: "#111827", borderBottomColor: "#111827" },

  main:   { padding: "16px", maxWidth: 460, margin: "0 auto" },
  hint:   { textAlign: "center", fontSize: 13, color: "#9ca3af", fontWeight: 500, margin: "10px 0 14px" },
  banner: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#6b7280", marginBottom: 14, textAlign: "center" },

  grid:       { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9 },
  nameCard:   { position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", padding: "12px 10px 10px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#ffffff", color: "#111827", minHeight: 72, fontFamily: "inherit", textAlign: "left", gap: 3, transition: "all .15s" },
  playerName: { fontSize: 13, fontWeight: 700, lineHeight: 1.2 },
  smallText:  { fontSize: 10, fontWeight: 600 },
  tapHint:    { fontSize: 10, color: "#d1d5db", fontStyle: "italic" },
  youTag:     { position: "absolute", top: 6, right: 7, fontSize: 8, fontWeight: 800, color: "#16a34a", letterSpacing: .5, textTransform: "uppercase" },

  heroCard:    { borderRadius: 14, padding: "20px 18px", textAlign: "left", marginBottom: 16, background: "#ffffff", border: "1px solid #e5e7eb" },
  heroEyebrow: { fontSize: 10, letterSpacing: 3, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 },
  heroName:    { fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: -1.5, margin: "0 0 8px" },
  heroSub:     { fontSize: 14, fontWeight: 600 },

  teamCard:      { borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: 12, background: "#ffffff" },
  teamHead:      { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px" },
  teamHeadName:  { fontSize: 13, fontWeight: 800, letterSpacing: .5, color: "#fff", textTransform: "uppercase" },
  teamHeadCount: { fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.9)", background: "rgba(0,0,0,.2)", padding: "2px 8px", borderRadius: 99 },
  memberList:    { padding: "4px 0 8px" },
  memberRow:     { display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", margin: "1px 4px", transition: "background .2s", fontSize: 14 },
  dot:           { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },

  resetBtn: { margin: "8px 16px 12px", display: "block", width: "calc(100% - 32px)", background: "transparent", border: "1px solid #e5e7eb", borderRadius: 8, color: "#9ca3af", fontSize: 11, fontWeight: 700, letterSpacing: .5, padding: "9px 0", cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" },
};
