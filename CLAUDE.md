# CLAUDE.md — Contest It

> Drop this at repo root. Claude Code reads it automatically. Codex users: paste the
> relevant sections into your agent's context at the start of your session.

---

## 0. TL;DR for every agent

We are building **Contest It** — a web app that tells a New Yorker their *actual statistical
odds* of beating a city summons, computed from real OATH hearing outcomes, then drafts a
defense statement.

**We have ~2.5–3 hours. Ship the demo path, nothing else.**

Non-negotiables:

1. **Gemini is the runtime model.** We use Claude Code / Codex to *write* the code, but the
   deployed app calls the Gemini API. This is a Google/GDG event on a Gemini track — an app
   that doesn't call Gemini at runtime can score zero or be ruled ineligible no matter how
   good it is. Writing tools ≠ runtime model. Do not "improve" this by swapping in another
   provider.
2. **Own your files. Never edit another person's files.** See §4 ownership table.
3. **Build against the contract in §3, not against each other's implementations.**
4. **Every feature ships behind a fallback.** If it can fail live, it needs a mock path.

---

## 1. The product in one paragraph

User uploads a photo of a NYC summons (or types the violation code, or says it out loud).
Gemini extracts the charge code and issuing agency from the image/speech. We query the NYC
OATH Hearings Division Case Status open dataset for every historical case under that charge
code and compute: dismissal rate, average penalty imposed, most common outcome. Gemini turns
those numbers into a plain-English verdict plus a drafted defense statement. One big verdict
card, sourced numbers underneath, honest "this is data, not legal advice" line on screen.

**The pitch hook:** every other team is explaining rules. We're telling you your odds — from
thousands of real decisions. You cannot get this from a chatbot; the table doesn't exist in
any model's weights.

---

## 2. Stack (locked — do not debate)

- **Next.js 15 (App Router) + TypeScript + Tailwind** — one repo, one deploy, server-side
  API key handling, no CORS pain.
- **Gemini API** via `@google/generative-ai` (AI Studio key, server-side only, in
  `.env.local` as `GEMINI_API_KEY`).
- **NYC Open Data (Socrata)** over plain `fetch`. No SDK, no auth needed for our volume.
- **Deploy: Vercel.** Free, 2-minute deploy, gives us a public URL for submission.
- **No database. No auth. No state. No tests.** If someone suggests Prisma, say no.

```bash
npx create-next-app@latest contest-it --ts --tailwind --app --eslint --src-dir=false
```

---

## 3. The contract (write this FIRST, in the first 10 minutes)

`lib/types.ts` — the lead creates this before anyone else writes a line. Everyone codes
against it. **This file is frozen after minute 10.** If it must change, the lead changes it
and announces in the group chat.

```ts
// lib/types.ts

export type Outcome = "dismissed" | "in_violation" | "settled" | "other";

/** What Gemini extracts from the ticket image / speech transcript. */
export interface TicketExtraction {
  chargeCode: string | null;       // e.g. "16-118" — null if unreadable
  chargeDescription: string | null;
  issuingAgency: string | null;    // "DSNY" | "DOB" | "DOHMH" | ...
  violationDate: string | null;    // ISO date
  penaltyOnTicket: number | null;  // dollars, if printed
  confidence: "high" | "medium" | "low";
  unreadableFields: string[];      // be honest about what we couldn't read
}

/** What the OATH data module returns for a charge code. */
export interface OathStats {
  chargeCode: string;
  totalCases: number;
  dismissalRate: number;           // 0..1
  outcomeBreakdown: Record<Outcome, number>; // counts
  avgPenaltyImposed: number | null;
  medianPenaltyImposed: number | null;
  dataSource: "live" | "cached";   // cached = our precomputed JSON
  sampleWindow: string;            // e.g. "2019-2026"
}

/** What the UI renders. */
export interface Analysis {
  extraction: TicketExtraction;
  stats: OathStats | null;         // null = no data for this code
  headline: string;                // "You have a 31% shot at a dismissal"
  reasoning: string;               // 2-3 sentences, plain English
  defenseDraft: string;            // the statement they bring to the hearing
  caveats: string[];               // always includes the not-legal-advice line
}
```

**Single API endpoint:** `POST /api/analyze`

```
Request:  { imageBase64?: string, transcript?: string, chargeCode?: string }
Response: Analysis
Errors:   { error: string } with HTTP 4xx/5xx — UI must render this gracefully
```

**Mock file:** `mocks/analysis.json` — a valid `Analysis` object. The lead writes this at
minute 10. **The UI owner builds entirely against this mock and does not wait for the
backend.**

---

## 4. Ownership — nobody touches another person's files

| Person | Role | Owns (exclusive write access) |
|---|---|---|
| **P1 — Harshil (lead)** | Contracts, AI layer, integration, deploy, pitch | `lib/types.ts`, `lib/gemini.ts`, `app/api/analyze/route.ts`, `mocks/`, `README.md`, `.env.example` |
| **P2** | OATH data module | `lib/oath.ts`, `lib/oath-cache.json`, `scripts/precompute.ts` |
| **P3** | UI | `app/page.tsx`, `components/**`, `app/globals.css` |
| **P4** | Voice + demo assets + submission | `components/VoiceInput.tsx`, `lib/speech.ts`, `demo/**`, `SUBMISSION.md` |

Shared-file rule: only **P1** edits `lib/types.ts`, `package.json`, and `app/layout.tsx`.
If you need a dependency, message P1 — do not run `npm install` on a shared branch.

---

## 5. Git protocol (designed to avoid merge hell)

With 4 people and 3 hours, PR review costs more than it saves. We use **trunk-based with
strict file ownership**:

```bash
# ONE TIME
git clone <repo> && cd contest-it && npm install
cp .env.example .env.local   # paste the shared GEMINI_API_KEY

# EVERY 15 MINUTES, WITHOUT EXCEPTION
git add <only your own files>
git commit -m "p2: oath stats aggregation"
git pull --rebase origin main
git push origin main
```

Rules:

- `git add .` is **banned**. Add your files by name. This is what prevents 90% of conflicts.
- Prefix every commit with your person tag (`p1:`, `p2:`, …) so the lead can read history fast.
- If you hit a conflict in a file you don't own: `git checkout --theirs <file>` and keep
  moving. You never win a conflict in someone else's file.
- **Two hard sync points** (see timeline): everyone pushes, lead verifies `main` builds
  (`npm run build`) before anyone continues.
- If `main` is broken, the lead announces "main frozen" and nobody pushes until it's green.

---

## 6. Timeline

T+0 = the moment you finish reading this.

| Time | What |
|---|---|
| **T+0:00–0:10** | P1: repo, scaffold, `lib/types.ts`, `mocks/analysis.json`, push, invite everyone. Others: clone, `npm install`, get dev server running. |
| **T+0:10–0:25** | **P2 sprints on the data probe (§7). This gates everything.** Others start their modules against mocks. |
| **T+0:25–1:10** | Parallel build. No integration yet. Push every 15 min. |
| **T+1:10–1:25** | **SYNC 1.** Everyone pushes. Lead wires real `/api/analyze` into the UI. Build must be green. |
| **T+1:25–1:55** | P4 lands voice input. P1 hardens error paths. P2 finalizes cache. P3 polishes verdict card. |
| **T+1:55–2:10** | **SYNC 2 — FEATURE FREEZE.** Deploy to Vercel. No new features after this line, only bug fixes. |
| **T+2:10–2:30** | Run the full demo 3× end to end. Record a screen-capture backup video. Screenshot a successful run. P4 fills the submission form. |
| **T+2:30–end** | Pitch rehearsal ×2 out loud. Submit. |

If you are behind at SYNC 2, **cut voice, not the core loop.**

---

## 7. P2 — OATH data module (start here, this gates the project)

### Step 1: probe the dataset (do this in the first 10 minutes, before writing any module)

The dataset is **OATH Hearings Division Case Status** on NYC Open Data (Socrata). Candidate
dataset ID: `jz4z-kudi` on `data.cityofnewyork.us`. **Verify the ID and the real column
names before building anything** — Socrata column names differ from the display labels and I
am not going to guess them for you.

```bash
# 1. What are the actual columns?
curl -s "https://data.cityofnewyork.us/resource/jz4z-kudi.json?\$limit=1" | jq

# 2. Is there real variance in outcomes by charge code? THIS IS THE PITCH.
curl -s "https://data.cityofnewyork.us/resource/jz4z-kudi.json?\
\$select=charge_1_code_section,hearing_result,count(*)\
&\$group=charge_1_code_section,hearing_result\
&\$limit=200" | jq
```

**Report to P1 within 10 minutes:** the real dataset ID, the real column names for charge
code / hearing result / penalty, and whether dismissal rates actually vary across codes.

> **If dismissal rates are flat across all codes, the pitch dies.** Tell P1 immediately.
> Fallback pivot: keep the same app but lead with *penalty variance* ("the average imposed
> penalty is 40% below the ticketed amount") instead of dismissal odds. Same code, different
> headline. Do not silently continue if the numbers are boring.

### Step 2: build the module

`lib/oath.ts` exports:

```ts
export async function getStatsForCharge(chargeCode: string): Promise<OathStats | null>
```

Requirements:
- Normalize `hearing_result` strings into our `Outcome` union. Log anything unmapped.
- 5-second timeout on the live fetch. On timeout/error/empty → fall back to the cache.
- Return `null` (not a throw) when we genuinely have no data for that code.

### Step 3: the cache (**this is the demo-safety feature, do not skip it**)

`scripts/precompute.ts` — pull aggregates for the **top ~50 most common charge codes** and
write `lib/oath-cache.json`. Commit that file. Venue Wi-Fi will fail at the worst moment;
with this, the demo still runs. Set `dataSource: "cached"` so the UI can show a subtle badge.

Precompute the codes for our demo tickets **first**.

---

## 8. P1 — AI layer (Harshil)

`lib/gemini.ts` exports two functions. Both take the **current Flash model** from AI Studio —
check the model picker for the exact string rather than trusting any hardcoded name.

### 8a. `extractTicket(imageBase64 | transcript): Promise<TicketExtraction>`

Force structured JSON output (`responseMimeType: "application/json"` + a response schema
matching `TicketExtraction`). Do not parse prose.

System prompt essentials:

```
You extract structured data from New York City summonses (tickets).
You will receive either a photograph of a summons or a spoken description of one.
Return ONLY JSON matching the provided schema.

Rules:
- Report the violation/charge code EXACTLY as printed. Do not normalize or guess format.
- If a field is unreadable, set it to null and list the field name in unreadableFields.
- Set confidence to "low" if the image is blurry, cropped, or you are inferring the
  charge code rather than reading it.
- NEVER invent a charge code. A null with low confidence is a correct answer;
  a plausible-looking wrong code is a failure.
```

That last rule matters for the demo: an honest "I couldn't read the bottom line — here's what
I got" reads as *engineering maturity* to judges. A confident wrong answer reads as a toy.

### 8b. `synthesize(extraction, stats): Promise<Pick<Analysis, "headline"|"reasoning"|"defenseDraft"|"caveats">>`

Prompt essentials:

```
You are given (a) the details of a NYC summons and (b) real aggregate outcome statistics
computed from the NYC OATH hearings public dataset.

Write:
- headline: one sentence stating the person's realistic odds, using the actual number.
- reasoning: 2-3 sentences explaining what the data shows and what drives outcomes for
  this charge type.
- defenseDraft: a short, factual statement the person could read at their hearing.
  First person. No invented facts about their situation — use [bracketed placeholders]
  where they must fill in specifics.
- caveats: string array. ALWAYS include: "This is a statistical summary of public
  hearing data, not legal advice."

Never state a statistic that is not present in the provided stats object.
If stats is null, say plainly that we have no outcome data for this code and skip the odds.
```

### 8c. `app/api/analyze/route.ts`

Orchestrate: extract → `getStatsForCharge` → synthesize → return `Analysis`. Wrap each stage
in try/catch and degrade gracefully (extraction works but stats fail → still return an
Analysis with `stats: null`). Never return a 500 with no body; the UI needs something to show.

---

## 9. P3 — UI

Build **entirely against `mocks/analysis.json`** until SYNC 1. Do not wait for the API.

Single page, three states: input → loading → result.

- **Input:** big drop zone for a ticket photo, a small "or enter the violation code" text
  field, and a slot where P4 will drop `<VoiceInput />`. Coordinate the prop shape with P4
  once, at the start: `<VoiceInput onTranscript={(t: string) => void} />`.
- **Loading:** a real progress indication with the three stages named ("Reading your
  summons… / Querying 400,000 hearing records… / Drafting your defense…"). This makes the
  wait feel like work being done, and it names our differentiator on screen.
- **Verdict card:** the headline is the hero — huge type, one number. Color-coded by odds.
  Below it: reasoning, then the stats breakdown (total cases, dismissal rate, avg penalty),
  then the defense draft in a bordered box with a copy button.
- **Caveats:** always visible, small, at the bottom. Not a modal, not hidden.
- **Empty/error states:** "We couldn't read the charge code — type it in?" and "No hearing
  data for this code yet." Both must look designed, not like a crash.

Style: dark, dense, civic-utility. Not a pastel SaaS landing page. One accent color.
Judges see thirty projects; make ours look like a tool, not a template.

---

## 10. P4 — Voice + demo assets + submission

Voice is a **thin input layer**, not a conversational mode. Scope is fixed:

1. Mic button → capture speech → produce a transcript string → call `onTranscript`.
   Fastest path: Web Speech API (`webkitSpeechRecognition`) in Chrome. If it fights you for
   more than 20 minutes, switch to `MediaRecorder` → send the audio blob to Gemini for
   transcription through our existing API route.
2. Optional TTS readback of the headline via `speechSynthesis`. 10 minutes, do it last.
3. **The text input path always stays visible.** If the mic fails on stage, we type. Nobody
   in the audience will know anything went wrong.

Then, from T+1:55, you own **demo safety and submission**:

- Collect 3 real ticket photos (or clean printed mock summonses) as the test set. Confirm all
  3 produce good output, and tell P2 which charge codes to precompute.
- Record a 60–90 second screen capture of a clean end-to-end run. **This is our insurance.**
- Screenshot the verdict card at full resolution.
- Open the CodingJam submission form **at T+1:55, not at the end** — read what it actually
  requires (repo link, video, description length, team names, category) and fill everything
  except the final URL immediately. Submission forms always want one field nobody anticipated.
- Write `SUBMISSION.md` with: one-line pitch, problem, what we built, data sources, what's
  real vs. mocked, and what we'd build next.

---

## 11. Honesty rules (these win points, not lose them)

- Never display a statistic we didn't compute. No illustrative numbers, ever.
- Label cached data as cached if a judge asks. "We precomputed the aggregates so the demo
  doesn't depend on venue Wi-Fi" is a *good* answer.
- Say "not legal advice" on the slide before a judge says it to us.
- If asked "how is this different from asking ChatGPT?" — the answer is: no model has this
  table. We compute odds from the city's own adjudication records, live.

---

## 12. Pitch (P1 delivers, 90 seconds)

1. **Hook (15s):** Hold up a ticket. "New York issues millions of these a year. Most people
   just pay, because contesting feels like a coin flip in a language you don't speak."
2. **Reframe (10s):** "But it isn't a coin flip. The city publishes the outcome of every
   single hearing. Nobody reads it."
3. **Demo (40s):** Photo in → the three-stage loader → verdict card with the real number →
   scroll to the defense draft. If voice is stable, do the voice input instead — it's a
   better opening beat.
4. **Depth (15s):** "That percentage isn't generated. It's a GROUP BY over the OATH hearings
   dataset. Gemini reads the summons and writes the defense; the odds come from the city."
5. **Close (10s):** "Every other tool explains the rules. This one tells you your chances."

Rehearse it out loud twice. Reading it silently does not count.

---

## 13. If something breaks (decision tree)

- **Gemini extraction unreliable on photos** → lead the demo with the manual charge-code
  input and mention photo extraction as supported-but-imperfect. Honest and still impressive.
- **OATH live queries slow/failing** → cache. Already built. Say so if asked.
- **Voice flaky at T+2:00** → cut it. Do not debug audio in the last 20 minutes.
- **Merge conflict spiral** → lead resolves alone on `main` while everyone else stops
  pushing. Four people fixing one conflict is how teams lose an hour.
- **Nothing works at T+2:20** → play the backup video and pitch over it. This is why P4
  records it.