// app/api/teams/route.js
// Next.js App Router API route
// Reads and writes  data/teams.json  in the GitHub repo via GitHub Contents API.
// The JSON file IS the database — every pick is a git commit.

import { NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO  = process.env.GITHUB_REPO;
const FILE_PATH    = "data/teams.json";
const BRANCH       = "main";

const GH_HEADERS = {
  Authorization: `token ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github.v3+json",
  "Content-Type": "application/json",
  "User-Agent": "team-selector-nextjs",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getFile() {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
  const res  = await fetch(url, { headers: GH_HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`GitHub GET ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const data = JSON.parse(Buffer.from(json.content, "base64").toString("utf8"));
  return { data, sha: json.sha };
}

async function putFile(data, sha) {
  const url     = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");
  const res = await fetch(url, {
    method: "PUT",
    headers: GH_HEADERS,
    body: JSON.stringify({
      message: `chore: assign ${Object.keys(data.assignments).at(-1) ?? "player"} to team [skip ci]`,
      content,
      sha,
      branch: BRANCH,
    }),
  });
  if (!res.ok) throw new Error(`GitHub PUT ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── GET /api/teams ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const { data } = await getFile();
    return NextResponse.json(data);
  } catch (e) {
    console.error("[GET /api/teams]", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── DELETE /api/teams  (Safi-only reset) ─────────────────────────────────────

export async function DELETE(request) {
  let body;
  try { body = await request.json(); } catch { body = {}; }

  if (body.name !== "Safi") {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  try {
    const { sha } = await getFile();
    const empty = { assignments: {}, counts: { green: 0, orange: 0, black: 0 } };
    await putFile(empty, sha);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/teams]", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── POST /api/teams ───────────────────────────────────────────────────────────

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name } = body;
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Missing player name" }, { status: 400 });
  }

  const TEAMS = ["green", "orange", "black"];

  // Retry up to 3× on SHA conflicts (two players click at the same time)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data, sha } = await getFile();

      // Already assigned — idempotent, return current state
      if (data.assignments[name]) {
        return NextResponse.json({ ok: true, data, alreadyAssigned: true });
      }

      // Find teams with open slots
      const available = TEAMS.filter(t => (data.counts[t] ?? 0) < 5);
      if (available.length === 0) {
        return NextResponse.json(
          { error: "All teams are full — 15/15 players assigned." },
          { status: 409 }
        );
      }

      // Random assignment
      const team = available[Math.floor(Math.random() * available.length)];
      const next = {
        assignments: { ...data.assignments, [name]: team },
        counts: { ...data.counts, [team]: (data.counts[team] ?? 0) + 1 },
      };

      await putFile(next, sha);
      return NextResponse.json({ ok: true, data: next, team });

    } catch (e) {
      const isConflict = e.message.includes("409") || e.message.includes("422");
      if (attempt < 2 && isConflict) {
        await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }
      console.error("[POST /api/teams]", e.message);
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }
}
