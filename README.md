# makefun-frontend-01

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/eli10s/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/eli10s/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, accessible frontend for [make.fun](https://make.fun), built from static files for the "Build the best make.fun frontend" bounty. It shows the live bounty board, bounty pages, leaderboards and public profiles, reading only make.fun's public API.

## Run it

```sh
node serve.ts
```

`node serve.ts` serves `app/` on http://localhost:8080. Any static HTTP server with `app/` at its root works the same way.

## How it is built

- No framework, no build step, no webfonts: `app/index.html` plus a handful of small ES modules and one stylesheet. The first load is a few small files.
- API answers are cached in memory and revalidated with ETags (the API's ETags turn over once a minute, so revalidation usually answers 304). A view fetches once; navigating back never refetches blindly. The leaderboard is paginated (25 rows a page) and images load lazily.
- Time-left labels tick every 30 seconds without refetching.
- Semantic HTML, a skip link, labelled controls, `aria-live` status text, visible focus and a layout that works on a phone.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's vendored library (`vendor/makefun-frontend.ts`, unchanged). Screenshots live in `screenshots/` (named in `shots.json`); the first by name is the cover.

Payout wallet: `ArKGXfrJ55aRU2jEk3unE5tyBdNNmPyGCmvFH9tDXauZ`.

---

Entered on [make.fun](https://make.fun/?ref=j045936m&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards
