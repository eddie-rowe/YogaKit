# Claude Code Commands for YogaKit

Command specs ported from a prior project (NextMove) and retargeted for
YogaKit on 2026-09-21. This is a short index — each command's own file is the
authoritative spec.

## Autonomous routines (the primary reason this tree exists)

Four headless routines close a daily observe → plan → build → reflect loop.
All are hand-launched today — no scheduler exists yet
(`007-autonomous-operations`'s job). Full schedule, file layout, and label
vocabulary: [`docs/planning/routines.md`](../../docs/planning/routines.md).

| Routine | Spec |
|---|---|
| `/tools:03_observation:autoobs` | [`tools/03_observation/autoobs.md`](tools/03_observation/autoobs.md) |
| `/tools:01_project_management:autopm` | [`tools/01_project_management/autopm.md`](tools/01_project_management/autopm.md) |
| `/tools:02_development:autodev` | [`tools/02_development/autodev.md`](tools/02_development/autodev.md) |
| `/tools:01_project_management:autoretro` | [`tools/01_project_management/autoretro.md`](tools/01_project_management/autoretro.md) |

Each routine's chained subcommands (`changelog`, `pm-reflect`, `reflect`,
`audit`, `ceo`) live under the same two directories and are retargeted to
YogaKit's real paths — see each file for its own output location.

## Supporting commands

| Category | Directory | Commands |
|---|---|---|
| Project management | [`tools/01_project_management/`](tools/01_project_management/) | `audit`, `ceo`, `changelog`, `pm-reflect`, plus interactive SDLC commands (`vision`, `research`, `roadmap`, `issues`, `kanban`, `milestone`) — not retargeted in this pass, see note below |
| Development | [`tools/02_development/`](tools/02_development/) | `autodev`, `reflect`, plus interactive SDLC commands (`up`, `down`, `plan`, `dev`, `test`, `validate`, `pr`, `review`, `merge`, `finalize`, `team-dev`, `vibe`) — not retargeted in this pass |
| Observation | [`tools/03_observation/`](tools/03_observation/) | `autoobs`, plus interactive commands (`status`, `slo`, `metrics`, `ux`, `incident`, `postmortem`, `digest`, `datadog-report`) — not retargeted in this pass |
| Spec-driven development | [`tools/speckit/`](tools/speckit/) | `speckit.*` — duplicated by the `.claude/skills/speckit-*` skills; not retargeted in this pass |
| Deploy | [`tools/deploy.md`](tools/deploy.md) | Manual production deploy via Vercel CLI |

The commands marked "not retargeted in this pass" may still carry stale
references to the prior project — check the file before relying on it
unattended. The four routines above and their chained subcommands are the
ones verified current for YogaKit.

## Provenance

This tree was copied wholesale from a prior project (NextMove) and had never
been retargeted. The four autonomous routines and their chained subcommands
were retargeted to YogaKit — correct repo (`eddie-rowe/YogaKit`), correct
Datadog service (`yogakit`), correct paths, no scheduler assumed — on
2026-09-21. A handful of genuinely unportable commands (sandbox seeding,
OAuth reconnect, prior-project-specific design/improve/execute-spec commands)
were deleted rather than retargeted, since YogaKit has no equivalent
concept.
