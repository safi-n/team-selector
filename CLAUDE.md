# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Manual deploy procedure (step by step)

### 1. Stage your changes
```bash
git add .
```
Stages all modified files. Use `git add <filename>` to stage specific files only.

### 2. Commit
```bash
git commit -m "your message here"
```
Saves the snapshot locally. Write a short description of what changed.

### 3. Push to GitHub
```bash
git push
```
Uploads the commit to `github.com/safi-n/team-selector`. If it's the first push on a new branch:
```bash
git push --set-upstream origin main
```

### 4. Deploy to Vercel
```bash
vercel --yes --prod
```
Builds and deploys to production. Takes ~20–30 seconds.
The live URL is: **https://football-management-seven.vercel.app**

### All in one line
```bash
git add . && git commit -m "your message" && git push && vercel --yes --prod
```

### Notes
- Environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are already set in Vercel — you don't need to re-add them on each deploy.
- `.env.local` is git-ignored and only needed for local development.
- If Vercel CLI isn't logged in: run `vercel login` first.

---

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Serve production build
```

No test runner or linter is configured.

## Architecture

This is a **Next.js 14 App Router** app — 21 players each tap their name to be randomly assigned to one of 4 teams (Green, Orange, Black, White — 5 players each). One random player gets the **Change Maker** (wildcard) role and appears as the 6th player in all team cards.

### Data layer — Supabase

A single `assignments` table in Supabase (project `yriydduxzqrlaabzpnrx`) holds all picks as rows `{ name, team }`. The primary key on `name` prevents duplicate picks.

`app/api/teams/route.js` implements three routes:
- `GET /api/teams` — fetches all rows, returns `{ assignments, counts }`
- `POST /api/teams` — randomly assigns a player to one of the available slots: 4 teams × 5 regular + 1 wildcard = 21 total
- `DELETE /api/teams` — resets all assignments (Safi-only, server-enforced)

### Required environment variables (local)

```
NEXT_PUBLIC_SUPABASE_URL=https://yriydduxzqrlaabzpnrx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```
These are already set in Vercel for production. For local dev, create `.env.local`.

### Player list

The `PLAYERS` array at the top of `app/page.jsx` is the only place to edit player names. Must stay at exactly **21 entries**.

### Change Maker

The server includes one `"wildcard"` slot in the random assignment pool. Whoever lands on it is the Change Maker — shown in all 4 team cards as the 6th player. No one can choose or predict it.

### Resetting a session

The "Safi" account has a reset button in the app header (only visible when logged in as Safi). It calls `DELETE /api/teams` which wipes all rows. Players need to clear `localStorage` key `footy_player_v1` in their browser to re-pick.
