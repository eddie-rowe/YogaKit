# Contract: `.krama.json` Flow File Format

**Module**: `src/lib/storage/` (export/import), `src/lib/flow/types.ts` (Flow shape)
**Consumed by**: Flows tab (export/import actions), any external tool a teacher uses to
back up or hand-edit a flow
**Governs**: constitution RULE-L3 (bundled data), spec FR-016, SC-005

---

## Why a file format exists

v0.1 has no server and no account — a `.krama.json` file is the entire portability
story. A teacher who wants to back up a flow, move it to a new device, or hand it to
another teacher exports one file and imports it elsewhere. It must round-trip exactly
and it must not break when the app's internal `Flow` shape changes later.

## Envelope

```typescript
interface KramaFile {
  schema_version: string;   // semver, e.g. "0.1.0" — the file format's own version,
                              // independent of the app's package.json version
  exported_at: string;       // ISO 8601 timestamp of export
  flow: Flow;                 // see data-model.md
}
```

A `.krama.json` file is exactly one `KramaFile` object — one flow per file in v0.1 (no
multi-flow export/import bundle; if that's wanted later it's a new envelope version, not
a v0.1 concern).

## `schema_version` from day one

The envelope carries `schema_version` starting with the very first shipped version
(`"0.1.0"`) — there is no "unversioned" era to migrate away from later. Bumping rules:

- **PATCH** (`0.1.0` → `0.1.1`): no `Flow` shape change; the bump exists only if the
  export process itself changes in a way that matters for debugging.
- **MINOR** (`0.1.0` → `0.2.0`): a `Flow`, `FlowItem`, or `Phase` field is added or an
  optional field's meaning is clarified. The importer MUST fill sensible defaults for
  fields absent in an older file.
- **MAJOR** (`0.1.0` → `1.0.0`): a field is removed, renamed, or its type changes
  incompatibly. The importer MUST implement an explicit migration function for the old
  shape, or refuse the import with a clear message naming what's incompatible — it MUST
  NOT silently drop data.

## Import contract

```typescript
function importKramaFile(raw: unknown): { flow: Flow } | { error: ImportError };

interface ImportError {
  code: 'UNKNOWN_SCHEMA_VERSION' | 'MALFORMED' | 'MIGRATION_FAILED';
  message: string;   // teacher-facing, plain language
}
```

- **Known older `schema_version`**: apply the matching migration function (a pure
  function per version pair, e.g. `migrate_0_1_0_to_0_2_0`), then validate the result
  against the current `Flow` shape before returning it.
- **Unrecognized `schema_version`** (newer than the running app understands, or not in
  the migration table): return `UNKNOWN_SCHEMA_VERSION` rather than guessing. The
  teacher sees a message naming the file's version and the app's supported range —
  never a silently truncated or corrupted flow (spec Edge Cases).
- **Malformed JSON or a `flow` object failing basic shape checks**: return `MALFORMED`.
  The importer never throws uncaught; every failure path returns a typed `ImportError`.
- **Successful import**: the returned `Flow` gets a **new** local `id` (a fresh UUID) —
  importing never overwrites an existing saved flow with the same imported `id`, even if
  one happens to collide, because ids are locally generated, not globally unique across
  devices. `isBuiltIn` on an imported flow is always `false`, even if the source file
  was exported from a built-in's duplicate.

## Export contract

```typescript
function exportKramaFile(flow: Flow): KramaFile;
```

Exports the flow exactly as stored, stamped with the app's current `schema_version` and
`exported_at`. Exporting a built-in flow is allowed (a teacher may want to share the
default heart-openers vinyasa) even though built-ins can't be edited in place.

## Round-trip guarantee (SC-005)

`importKramaFile(exportKramaFile(flow))` MUST produce a `Flow` identical to `flow` in
every field except `id` (regenerated) and `isBuiltIn` (forced `false`). This is the
integration test's assertion — see `tests/unit/storage/`.

## What's deliberately NOT in the envelope

- No pose data. `flow.items[].poseSlug` is a reference; the importing app must already
  have that slug in its bundled pose library. If it doesn't (a slug from a future pose
  library the importer hasn't shipped yet), the item still imports with its slug intact
  but renders as an unresolved reference in the UI rather than failing the whole import.
- No friction/validator output. `FrictionResult` and `ValidatorWarning` are always
  recomputed at render time from the current engine — never persisted or exported. This
  keeps a `.krama.json` file portable across friction-weight tuning without going stale.
