import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const TEAMS = ["green", "orange", "black", "white"];

function buildResponse(rows) {
  const assignments = {};
  const counts = { green: 0, orange: 0, black: 0, white: 0 };
  for (const { name, team } of rows) {
    assignments[name] = team;
    if (team !== "wildcard") counts[team] = (counts[team] ?? 0) + 1;
  }
  return { assignments, counts };
}

// ── GET /api/teams ────────────────────────────────────────────────────────────

export async function GET() {
  const { data, error } = await supabase.from("assignments").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(buildResponse(data));
}

// ── POST /api/teams ───────────────────────────────────────────────────────────

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name } = body;
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Missing player name" }, { status: 400 });
  }

  const { data: rows, error: fetchError } = await supabase.from("assignments").select("*");
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  // Already assigned — idempotent
  if (rows.find(r => r.name === name)) {
    return NextResponse.json({ ok: true, data: buildResponse(rows), alreadyAssigned: true });
  }

  // Build available slots: 4 teams × 5 + 1 wildcard = 21 total
  const counts = { green: 0, orange: 0, black: 0, white: 0 };
  let wildcardTaken = false;
  for (const { team } of rows) {
    if (team === "wildcard") wildcardTaken = true;
    else counts[team] = (counts[team] ?? 0) + 1;
  }
  const available = [
    ...TEAMS.filter(t => (counts[t] ?? 0) < 5),
    ...(!wildcardTaken ? ["wildcard"] : []),
  ];
  if (available.length === 0) {
    return NextResponse.json({ error: "All slots full — 21/21 players assigned." }, { status: 409 });
  }

  const team = available[Math.floor(Math.random() * available.length)];

  const { error: insertError } = await supabase.from("assignments").insert({ name, team });
  if (insertError) {
    if (insertError.code === "23505") {
      const { data: fresh } = await supabase.from("assignments").select("*");
      return NextResponse.json({ ok: true, data: buildResponse(fresh ?? []), alreadyAssigned: true });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: fresh } = await supabase.from("assignments").select("*");
  return NextResponse.json({ ok: true, data: buildResponse(fresh ?? []), team });
}

// ── DELETE /api/teams  (Safi-only reset) ─────────────────────────────────────

export async function DELETE(request) {
  let body;
  try { body = await request.json(); } catch { body = {}; }

  if (body.name !== "Safi") {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { error } = await supabase.from("assignments").delete().neq("name", "");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
