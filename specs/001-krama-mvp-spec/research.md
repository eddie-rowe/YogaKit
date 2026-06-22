# Research: Krama MVP

**Phase 0 output** | **Date**: 2026-06-22

---

## Next.js PWA Configuration

**Decision**: Use `next-pwa` (or `@ducanh2912/next-pwa` — the maintained fork) with
Workbox for service worker generation. The manifest is static JSON; the service worker
pre-caches the shell, static assets, and all pose library JSON at build time.

**Rationale**: Next.js App Router has no built-in PWA support; `next-pwa` is the
standard wrapper. The maintained fork (`@ducanh2912/next-pwa`) supports App Router
correctly. Workbox's `StaleWhileRevalidate` strategy for static JSON ensures the pose
library is always available offline.

**Alternatives considered**: Vite PWA plugin (would require switching off Next.js);
manual service worker (too much boilerplate for no benefit).

---

## Offline Storage (IndexedDB)

**Decision**: Use the `idb` library (Jake Archibald's typed wrapper) for IndexedDB
access. Stores: `sequences` (saved sequence objects), `session` (current active session
state for crash recovery). Schema versioned with `idb` upgrade callbacks.

**Rationale**: `idb` is a minimal, well-maintained wrapper with TypeScript support.
`localStorage` is synchronous and has a 5–10 MB limit — too small for a growing
sequence library. The `sequences` store will hold structured JSON blobs; no relational
database features are needed.

**Alternatives considered**: `Dexie.js` (heavier, ORM-like — unnecessary complexity);
`localForage` (abstraction layer over multiple backends — avoids locking to IndexedDB
unnecessarily, but adds a dependency for minimal gain given our known environment).

---

## Anthropic API Integration (Server-Side Only)

**Decision**: Call the Anthropic Claude API from a Next.js Route Handler
(`/api/generate`). Use `claude-sonnet-4-6` (current Sonnet) as the default model. Use
streaming responses so the teacher sees the sequence building in real time rather than
waiting for a 30-second cold response.

**Rationale**: Streaming dramatically improves perceived performance. The Route Handler
keeps the API key server-side. Claude Sonnet 4.6 offers the best quality/latency
balance for structured output tasks; Haiku is faster but produces shallower thematic
reasoning, which is core to Krama's value.

**API key handling**: Stored in Vercel environment variables, never bundled into the
client. The Route Handler reads `process.env.ANTHROPIC_API_KEY`.

**Prompt strategy**: Structured output via Claude's tool-use/JSON mode. The prompt
specifies the full dimension context and instructs Claude to output a draft sequence
in the `PipelineDraft` schema (see data-model.md). Constraints are described
categorically (per FR-006b) — no identifying student information.

**Alternatives considered**: OpenAI GPT-4o (less nuanced at thematic/philosophical
coherence for yoga domain); Gemini (similar quality concern); local model (would
require a server, violating the lightweight principle).

---

## Rules Engine Design

**Decision**: Pure TypeScript module (`src/lib/pipeline/constrain.ts`) with no external
I/O. Takes a `PipelineDraft` and the teacher's `SessionContext` (dimensions + hard
constraints) as input; returns a `ConstrainedSequence`. Runs entirely in the serverless
function (not the browser) to keep the client thin.

**Key rules the engine enforces:**
- Bilateral symmetry: if a pose is bilateral, both sides are sequenced with equal hold.
- Transition logic: body position must not change more than one family per step without
  a bridge pose (e.g., cannot go directly from supine to standing in yin).
- Rebound poses: every deep yin hold must be followed by a rebound (neutral/rest)
  before the next active pose.
- Hold time validation: each pose's hold time must fall within the pose library's
  `hold_range`; total must be within ±10% of requested duration.
- Intensity curve: the sequence of `difficulty` and `energetic_quality` values must
  approximate the requested curve shape.
- Alternate generation: each Sequence Item must have ≥1 alternate ranked by dimensional
  alignment.

**Alternatives considered**: A constraint satisfaction solver (e.g., OR-Tools); too
heavy. A declarative rule DSL; unnecessary abstraction for a known fixed rule set.

---

## Safety Layer Design

**Decision**: Pure TypeScript module (`src/lib/pipeline/validate.ts`). Takes a
`ConstrainedSequence` and the session's hard constraints; returns a `ValidatedSequence`
or throws a `SafetyViolation` error. Final authority — its output is what ships to the
client.

**Checks performed:**
1. For each pose: cross-reference `contraindications[]` against session's `hardConstraints[]`.
2. For each pose: if `props_required[]` contains a prop not in `session.propsAvailable[]`,
   check that a `prop_free_variation` exists — if not, trigger replacement (FR-015a).
3. Timing sum: total hold time ≤ requested duration + 5 min tolerance.
4. Bilateral completeness: every bilateral pose appears an even number of times.
5. Intensity ceiling: no pose with `difficulty: 'advanced'` in a beginner session.

**Adversarial test cases (required before ship):**
- AI proposes a Headstand for a student with high blood pressure → must be replaced.
- AI proposes Dragon with blocks for a class with "no props available" → must be
  replaced with prop-free variation.
- AI proposes only the right side of Sleeping Swan → must add left side.
- AI outputs malformed JSON → must not crash; must fall back to rules-engine draft.
- AI proposes a sequence that sums to 120 min when 60 min was requested → must trim.

---

## Pose Library Data Format

**Decision**: One JSON file per pose at `data/poses/<slug>.json`, validated against a
JSON Schema at `data/schemas/pose.schema.json`. CI runs `ajv validate` against all pose
files on every PR.

**Rationale**: One-file-per-pose makes community contributions diff-friendly (no merge
conflicts in a monolithic file). The JSON Schema enforces required fields and allowed
enum values, replacing any informal attribution/format conventions.

**File naming**: `<slug>.json` where slug is the canonical identifier (e.g.,
`sleeping-swan.json`). Slug format: lowercase, hyphens only, no numbers at start.

**Alternatives considered**: MDX (better for human-readable content but harder to
validate programmatically); YAML (more human-friendly but loses JSON Schema tooling);
single poses.json monolith (merge-conflict nightmare for community PRs).

---

## Meridian Data Format

**Decision**: `data/meridians/<element-slug>.json` — one file per Five-Element (wood,
fire, earth, metal, water). Each file lists its meridian pair, associated season, organ
systems, energetic direction (ascending/descending), peak hours, and emotional/thematic
associations. Poses reference meridians by a list of meridian slugs
(e.g., `["liver", "gallbladder"]`).

**Structure:**
```json
{
  "element": "wood",
  "season": "spring",
  "meridians": [
    { "slug": "liver", "organ": "Liver", "direction": "ascending" },
    { "slug": "gallbladder", "organ": "Gallbladder", "direction": "descending" }
  ],
  "themes": ["growth", "vision", "letting go", "flexibility"],
  "emotions": { "balanced": "decisiveness", "excess": "anger", "deficiency": "indecision" },
  "body_focus": ["inner leg", "outer hip", "IT band", "side body"]
}
```

**Rationale**: Separating Five-Element data from pose data allows the rules engine to
join them at runtime without duplicating data. Themes and emotional associations feed
directly into the AI prompt for thematic coherence (RULE-E1, RULE-E4).

---

## Quote Collection Format

**Decision**: `data/quotes/quotes.json` — an array of quote objects. Each has:
`text`, `attribution` (person/text), `tradition` (e.g., "Taoism", "Yoga Sutras",
"Stoicism"), `tags` (array of theme slugs, e.g., `["letting-go", "impermanence"]`),
and optionally `source_url` for public-domain verification.

**CI check**: All quotes must have non-empty `attribution` and `tradition` fields.
Quotes without `source_url` are flagged with a warning but not blocked (many oral
tradition quotes have no URL).

---

## Print CSS Strategy

**Decision**: A dedicated print stylesheet (`src/components/export/print.css`) activated
via `media="print"`. The cue sheet view is a regular Next.js page that renders cleanly
in print mode: two-column layout, no navigation chrome, page breaks between logical
sections, 11pt minimum font size.

**Rationale**: No server-side PDF generation needed. Print CSS is zero-dependency and
works universally. Teachers can use browser "Save as PDF" for digital distribution.

**Alternatives considered**: `react-to-pdf`, `jsPDF` (client-side PDF libraries — adds
bundle weight, not needed), server-side Puppeteer (requires a server, violates the
lightweight principle).

---

## Testing Strategy

**Decision**: Vitest for all unit and integration tests. Playwright for E2E.

**Coverage requirements:**
- `src/lib/pipeline/constrain.ts`: 100% line coverage, mandatory.
- `src/lib/pipeline/validate.ts`: 100% line coverage, mandatory. Adversarial test
  cases (see Safety Layer Design above) are explicit test files.
- `src/lib/pose-library/`: Schema validation tests; every pose file passes JSON Schema.
- E2E: Critical path — dimension input → generate → swap pose → export cue sheet.

**Alternatives considered**: Jest (slower, larger config for TypeScript); Cypress (heavier
than Playwright for this use case).

---

## Deployment

**Decision**: Vercel (default). Zero-config Next.js deployment. `ANTHROPIC_API_KEY`
stored as a Vercel environment variable. Cloudflare fronts DNS and CDN.

**No Vercel-specific lock-in** beyond the serverless function format — the Route Handler
is standard Next.js and would work on any Next.js-compatible host.
