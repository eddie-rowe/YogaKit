# Portability, Export & Share

**YogaKit surface:** `src/lib/storage/krama-file.ts` (schema-versioned export/import, typed `ImportError` codes), `src/app/flows/FlowsClient.tsx` (`handleExport` via `Blob` + anchor download, file-picker import, `data-testid="flows-import"` / `flows-export-{id}`)
**Status:** export/import built; org/cohort sharing planned (spec 004)

## The interaction problem
Users need three separable guarantees when an app holds their structured work: they can always get a faithful copy of it out in a format they (or another tool) can read without the vendor; re-importing that copy — today, or years later, into a newer app version — must either succeed exactly or fail loudly, never silently drop data; and sharing a single artifact with one other person should not require exporting/re-importing files by hand, nor granting them the keys to everything else. Most apps nail one of these and neglect the other two.

## Best in class

### 1. Obsidian — desktop/mobile PKM app, "file over app" philosophy, ~1.5M MAU in 2026
- **What they do:** A vault is just a folder of plain `.md` files on disk. There is no export step because there is nothing proprietary to export — opening the vault in any text editor already works.
- **Why it works:** Removing the export step removes the failure mode entirely. The cost is that "plain" Markdown still carries Obsidian-flavored syntax (block refs, transclusion) that doesn't round-trip losslessly elsewhere — portability is a spectrum, not a binary, even for the most-cited local-first exemplar.
- **Source:** https://obsidian.md/ ; https://karl-voit.at/2026/04/08/obsidian-md-portability/

### 2. VS Code Settings Sync / Profile export — Microsoft, built into the editor
- **What they do:** `Profiles: Export Profile` serializes settings/keybindings/snippets/extensions into a named, portable bundle you can save to a local file or a GitHub Gist, then `Import Profile` restores it on any machine. Each category (settings, keybindings, extensions, tasks) is independently toggleable, and a `Settings Sync: Show Synced data` command lets a user inspect the literal JSON being synced before trusting it.
- **Why it works:** Granular scoping (what's included) plus a human-inspectable underlying format (JSON) means the user is never asked to trust a black box — matching YogaKit's own choice to keep `.krama.json` hand-editable.
- **Source:** https://code.visualstudio.com/docs/configure/settings-sync ; https://bobbyhadz.com/blog/vscode-export-settings-and-extensions

### 3. Notion — "Share to web" + "Allow duplicate as template"
- **What they do:** A page owner flips one toggle to publish a read-only web link, then a second toggle ("Allow duplicate as template") lets any visitor clone the page into their own workspace with one click — no file download, no re-import step, no account-to-account transfer of edit rights. Separately, `Export → Markdown & CSV` gives a fully offline, no-account copy of the same content.
- **Why it works:** It cleanly separates "give someone their own independent copy" (duplicate-as-template, in-product, zero file handling) from "get a portable file of your own data" (export). YogaKit currently conflates these into one file-based mechanism; spec 004's org/cohort sharing is the natural home for a Notion-style in-app "duplicate this flow into your library" link.
- **Source:** https://www.notion.com/help/export-your-content ; https://www.landmarklabs.co/notion-tutorials/how-to-share-a-notion-template

### 4. GitHub Gist — single-artifact sharing via URL, GitHub (2026)
- **What they do:** One file (or small set of files) gets a URL; "secret" gists are unlisted but not access-controlled — anyone with the link can view, and there is deliberately no partial-edit-grant model (collaboration happens by forking, not by shared write access).
- **Why it works:** It's an honest, low-ambiguity permission model: the link *is* the access boundary, and the product doesn't pretend otherwise. It's also a cautionary example — "secret" reads as private to many users when it is not, a naming trap YogaKit should avoid when spec 004 introduces flow-share links.
- **Source:** https://docs.github.com/en/get-started/writing-on-github/editing-and-sharing-content-with-gists

## Cross-cutting patterns
- The most trusted apps make the export format the *native* format (Obsidian) or at minimum a fully-inspectable serialization of it (VS Code profile JSON, Krama's own `.krama.json`) — no lossy intermediate.
- Versioned export always pairs with an explicit, testable migration path on import (VS Code's timestamped local backups; Krama's `MIGRATIONS` map) rather than "just try to open it and hope."
- Sharing a single artifact and exporting your data are treated as two different affordances with two different UIs (Notion's toggle vs. its Export menu) — conflating them into one file-download flow is the smaller-product shortcut, not the best-practice one.
- Permission scope on a share link is stated in the UI in the same breath as the toggle (Notion's Can View/Can Comment/Can Edit; Gist's public/secret), never left implicit.
- Granular, category-level control over *what* gets exported/synced (VS Code) lets users share less than "everything," which matters once journal/note content sits next to a flow.

## Anti-patterns observed
- Gist's "secret" naming reads as "private" to most users but is only "unlisted" — a permission-scope mismatch between label and behavior.
- Silent, best-effort import (skipping unknown fields instead of failing) turns a version mismatch into invisible data loss years later — the opposite of Krama's typed `UNKNOWN_SCHEMA_VERSION`/`MALFORMED`/`MIGRATION_FAILED` refusal path.
- Cloud note apps that promise "your data, exportable anytime" but ship exports as flattened HTML/ZIP with broken internal links — export exists on paper but isn't actually round-trippable (the scenario the Obsidian sources warn against).

## Fold into YogaKit
- `quick win` — Surface `schema_version` and `exported_at` in the Flows UI (e.g., a small "exported v0.1.0 on {date}" caption near the export button in `FlowsClient.tsx`), so the human-inspectable contract that already exists in the file is visible before the user ever opens the JSON.
- `quick win` — On the three `ImportError` codes, show the actual `code` in a collapsible detail (not just `message`) so a user filing a bug or hand-editing the file has the exact failure category, mirroring VS Code's "show synced data" transparency move.
- `spec 004` — Add a Notion-style "duplicate" affordance for cohort sharing: a teacher shares a flow, a student clicks one button to get their own independent copy in their library — no file download/upload round trip. Keep `.krama.json` export/import as the *offline* fallback path, not the only path.
- `spec 004` — When a shared/duplicated flow crosses the author boundary, strip or gate journal/note-type fields at the data layer before the payload ever reaches the recipient's client — do not rely on the sharing UI to omit them (Principle VIII: enforce at the table/RLS layer, never application code).
- `needs decision` — Decide whether a spec-004 share link is Gist-style ("anyone with the link can view/duplicate") or Notion-style (named permission levels with an explicit default). Given RULE-O6/O7 (data stays readable without entitlement) but Principle VIII (journal content author-only), the safe default is "view/duplicate the flow structure only, never journal content," stated explicitly in the share UI rather than left implicit.

## Constitution check
- Principle V (open data survives monetization) is already honored: export/import in `krama-file.ts` has no entitlement check and no AI in its path, matching RULE-H6 and the "read/export your own data is never paywalled" rule; keep it that way when spec 004 adds sharing UI around the same file.
- The append-only migration philosophy (typed refusal over silent loss) is the standout strength here and should be the explicit bar for any future schema bump — new migrations get added to `MIGRATIONS`, never a "best effort" fallback.
- Principle VIII risk is real and not yet addressed by code: `Flow` objects as currently exported/imported don't appear to separate structural data (poses, phases, timing) from author-only content (notes/reflections) at the type level — spec 004 needs that split before any cross-user link exists, or a "share this flow" action could leak journal content by accident.
- One-accent, typography-first design and "no AI in this path" are both unaffected by this feature area — export/import/share is pure data plumbing and should stay that way.
