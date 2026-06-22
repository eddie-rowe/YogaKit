# Contract: Sequence Generation API

**Endpoint**: `POST /api/generate`
**Type**: Next.js Route Handler (serverless)
**Auth**: None (no auth in v1)
**Streaming**: Yes — Server-Sent Events (SSE) for progressive display

---

## Request

```typescript
// POST /api/generate
// Content-Type: application/json
{
  sessionContext: SessionContext;  // see data-model.md
}
```

**Constraints on request:**
- `sessionContext.hardConstraints` is always present; `contraindications` and
  `propsAvailable` may be empty arrays.
- `durationMinutes` defaults to 60 if omitted.
- No student-identifying information may be included (enforced by the client — the
  server does not store or log request bodies in v1).

---

## Response (Streaming)

The handler streams `text/event-stream` with the following event types:

```
event: progress
data: {"stage": "proposing" | "constraining" | "validating", "message": string}

event: sequence
data: <JSON-serialized ValidatedSequence>

event: error
data: {"code": string, "message": string, "fallback": boolean}
```

**On success**: A single `sequence` event followed by the stream closing.

**On AI unavailability**: One `progress` event with `stage: "proposing"` and
`fallback: true`, then the rules engine runs and a `sequence` event is emitted with
`generationProvenance: "rules-only"`.

**On unrecoverable error**: An `error` event. The client shows an inline error message
(not a full-page error).

---

## Error Codes

| Code | Meaning |
|------|---------|
| `SAFETY_UNRESOLVABLE` | Safety layer could not find a valid replacement for a blocked pose and the sequence cannot be produced safely. Teacher sees the conflict description and is asked to modify constraints. |
| `DURATION_CONFLICT` | Requested duration is too short for the requested depth even after compression. Client presents the options (compress/extend/reduce). |
| `NO_POSES_MATCH` | No poses in the library satisfy all active filters. Client shows which filters conflict. |
| `AI_ERROR` | AI service returned an error (not a timeout). Falls back to rules-only automatically; this code is only emitted if fallback also fails. |

---

## Pipeline Execution Order (enforced in handler)

```
1. Validate request schema
2. Load pose library + meridian data (from build-time static import)
3. Call AI (propose) — wrapped in try/catch with 25s timeout
   → on failure: set generationProvenance = 'rules-only', seed a minimal draft
4. Call rules engine (constrain) — synchronous, no I/O
5. Call safety layer (validate) — synchronous, no I/O
   → on SafetyViolation: attempt auto-replacement (FR-015a), then re-validate
   → if still failing: emit SAFETY_UNRESOLVABLE
6. Emit sequence event
```

This order is immutable per RULE-H2 and RULE-H3.

---

## What the AI Prompt Contains

The AI prompt includes (all categorical — no PII):
- Style, duration, time of day, season
- Experience level (e.g., "intermediate")
- Target body system and meridians (e.g., "hips, Liver/Gallbladder meridian")
- Dosha and Five-Element emphasis
- Theme and goal (free text from teacher)
- Contraindications as categorical descriptors (e.g., "the class includes a student
  with hypertension and one with a recent hip replacement")
- Props available
- Intensity curve and density preferences
- Instruction to output a `PipelineDraft`-shaped JSON object

The AI prompt does NOT include: student names, ages, any personally identifying
information, or the teacher's personal data.
