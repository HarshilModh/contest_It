# Contest It

**Your real odds of beating a New York City summons — computed from the city's own hearing records, not a guess.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-Flash-8E75B2?style=flat-square&logo=google)](https://ai.google.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![NYC Open Data](https://img.shields.io/badge/NYC_Open_Data-OATH_Hearings-informational?style=flat-square)](https://data.cityofnewyork.us/City-Government/OATH-Hearings-Division-Case-Status/jz4z-kudi)

---

## The problem

NYC issues hundreds of thousands of administrative summonses a year — sidewalk violations, sanitation, buildings, health code. Most people just pay, because contesting one feels like a coin flip in a language they don't speak.

It isn't a coin flip. NYC's Office of Administrative Trials and Hearings (OATH) publishes the outcome of every hearing it has ever held. Nobody reads it. **Contest It** does.

## What it does

1. **Read the ticket.** Upload a photo, say the violation code out loud, or type it. Gemini extracts the charge code, agency, and penalty from whatever you give it — and says so honestly when it can't read something, instead of guessing.
2. **Compute the real odds.** The app runs a live aggregate query against NYC's OATH hearings dataset for that exact charge code: how many hearings happened, how many were dismissed, what the average and median penalty ended up being for people who lost. A precomputed cache keeps the demo alive if the live API is slow or the venue Wi-Fi isn't.
3. **Explain it and draft the defense.** Gemini turns those numbers into a plain-English verdict and a factual defense statement, using only the numbers the app computed — never a number Gemini invented itself.

## The proof this isn't generic

This is the whole pitch: **odds vary enormously by charge**, and no chatbot has this table in its weights. Numbers below are live aggregates from the actual dataset, dismissal rate computed among hearings that were actually contested (excludes pending, defaulted, and written-off cases, which never went before a hearing officer):

| Charge section | Dismissal rate | Contested hearings | Avg. penalty if found in violation |
|---|---|---|---|
| `10-119` | **72.9%** | 3,724 | $106 |
| `10.119` | 65.8% | 145,162 | $96 |
| `10-125` | 62.1% | 1,303 | $23 |
| `16-120` (receptacle storage) | 39.8% | 462,553 | $142 |
| `16-118` (sidewalk snow/ice) | 34.0% | 719,266 | $158 |
| `19-102` | 33.7% | 64,544 | $1,321 |
| `1-08` | 37.0% | 205,833 | $53 |
| `28-301.1` | **10.1%** | 130,985 | $931 |

A near-7x spread between the best and worst charge code — that's the whole product in one table.

## Architecture

```
User input (photo / voice / text)
        │
        ▼
  Gemini extracts charge code, agency, penalty      lib/gemini.ts
        │
        ▼
  Live GROUP BY over NYC OATH hearings dataset       lib/oath.ts
  (falls back to precomputed cache on timeout)       lib/oath-cache.json
        │
        ▼
  Gemini writes the plain-English verdict            lib/gemini.ts
  and the defense draft, from real numbers only
        │
        ▼
  Verdict card: odds, outcome breakdown,              app/page.tsx
  defense draft, sourced and labeled honestly
```

Single API surface: `POST /api/analyze` in `app/api/analyze/route.ts`, orchestrating extract → aggregate → synthesize, with every stage degrading gracefully instead of throwing a 500.

### Stack

- **Next.js 16 (App Router) + React 19 + TypeScript** — one repo, one deploy, server-side API key handling.
- **Gemini API** via [`@google/generative-ai`](https://www.npmjs.com/package/@google/generative-ai), called server-side only.
- **NYC Open Data (Socrata)** — [OATH Hearings Division Case Status](https://data.cityofnewyork.us/City-Government/OATH-Hearings-Division-Case-Status/jz4z-kudi) (`jz4z-kudi`), queried directly with `fetch`, no SDK.
- **Tailwind CSS v4** for styling, deployed on **Vercel**.
- No database, no auth, no server-held user state.

### Project structure

```
app/
  api/analyze/route.ts     Orchestration: extract -> aggregate -> synthesize
  page.tsx                 Input / loading / verdict UI states
  globals.css               Design tokens, theme, backdrop
components/
  VoiceInput.tsx            Web Speech API mic input, text fallback always visible
  HeroSection.tsx, StatsAndFaq.tsx, BackgroundAtmosphere.tsx, ThemeToggle.tsx
lib/
  types.ts                  The shared contract (TicketExtraction, OathStats, Analysis)
  gemini.ts                 extractTicket() and synthesize() — structured JSON output
  oath.ts                   getStatsForCharge() — live aggregate with cache fallback
  oath-cache.json           Precomputed stats for the demo's charge codes
  baseline.ts               Citywide baseline dismissal rate, for comparison copy
scripts/
  precompute.ts             Rebuilds oath-cache.json from live queries
demo/
  ticket-*.png / .svg       Three labeled test-fixture summonses, no real personal data
mocks/
  analysis.json             A valid Analysis object for frontend-only development
```

## Getting started

**Prerequisites:** Node 18.17+, and a Gemini API key from [Google AI Studio](https://aistudio.google.com/).

```bash
git clone <this-repo>
cd contest_it
npm install
cp .env.example .env.local        # then paste your GEMINI_API_KEY
npm run dev                       # http://localhost:3000
```

Production build: `npm run build && npm run start`.

Rebuild the OATH cache (needed if you add charge codes to `scripts/precompute.ts`):

```bash
npx tsx scripts/precompute.ts
```

## Try it

These charge codes are precomputed and load instantly even if the live NYC Open Data API is slow:

| Try | Charge | What it's actually for |
|---|---|---|
| `A.C. 16-118 2 A` | Sidewalk snow/ice | `demo/ticket-01-dirty-sidewalk.png` |
| `10.119.` | Illegal posting / handbill | `demo/ticket-02-handbill.png` |
| `A.C. 16-120 C` | Storage of receptacles | `demo/ticket-03-receptacles.png` |
| `10-125` | — | Highest dismissal rate in the cache (62.1%) |
| `28-301.1` | — | Lowest dismissal rate in the cache (10.1%) |

Any other charge code runs a live query against NYC Open Data; if there's genuinely no data for it, the app says so instead of inventing a number.

## What's real vs. what's cached

- **Every statistic on screen is computed by this app from the OATH dataset** — Gemini never generates a number, only the prose around one.
- Results are labeled **Live data** or **Cached data** in the UI. Cached means precomputed by `scripts/precompute.ts` so the demo survives unreliable Wi-Fi — not a substitute dataset.
- If a charge code has no hearing history, the app says exactly that rather than guessing.
- The three tickets in `demo/` are clearly marked test fixtures with no real personal information.

## Disclaimer

Contest It is a civic-technology demonstration built for informational purposes. Dismissal probabilities and penalty figures are statistical summaries of public NYC OATH hearing records. **This is not legal advice**, and Contest It does not provide legal representation.

## License

MIT. See `LICENSE`.
