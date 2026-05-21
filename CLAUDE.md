# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Serve production build
```

No test runner or linter is configured.

## Architecture

This is a **Next.js 14 App Router** app — a single-page football team selector where 15 named players each tap their name to be randomly assigned to one of three teams (Green, Orange, Black, 5 players each).

### Data layer — GitHub as a database

`data/teams.json` is the sole data store. It holds `assignments` (name → team) and `counts` (team → number). Every player pick is written back to this file via the **GitHub Contents API** as a git commit.

`app/api/teams/route.js` implements two routes:
- `GET /api/teams` — reads `data/teams.json` from GitHub
- `POST /api/teams` — reads the file, assigns a random team with an open slot, and writes back via `PUT` with the current blob SHA. Retries up to 3× on 409/422 SHA conflicts (two simultaneous picks).

### Required environment variables

```
GITHUB_TOKEN=   # Personal access token with repo write access
GITHUB_OWNER=   # GitHub org/user that owns the repo
GITHUB_REPO=    # Repository name
```

### Client state

`app/page.jsx` is a `"use client"` component. It stores the current user's chosen name in `localStorage` under key `footy_player_v1` so the browser remembers which team they joined on refresh.

### Player list

The `PLAYERS` array at the top of `app/page.jsx` is the only place to edit player names before deploying a new session. The array must stay at exactly 15 entries to match the 15-player / 3-team-of-5 logic.

### Resetting a session

Zero out `data/teams.json` back to `{ "assignments": {}, "counts": { "green": 0, "orange": 0, "black": 0 } }` and commit it to main. Players also need to clear localStorage (`footy_player_v1`) in their browser.
