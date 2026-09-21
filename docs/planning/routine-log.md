# Routine log

One line per headless-routine run, newest last. Written by `/autoobs`
(`.claude/commands/autoobs.md`) and, later, whatever routines `007-autonomous-operations`
adds. Never edited retroactively — a run's line is truth for what that run observed at
that time, even if a later run finds it was wrong.

Format:

```
YYYY-MM-DD HH:MM /autoobs [STATUS] — overall: [HEALTHY/DEGRADED/AT-RISK]; monitors: [N ok / M alert]; digest: docs/observation/autoobs/YYYY-MM-DD.md
```

2026-09-04 17:04 /autoobs [OK] — overall: DEGRADED (no traffic yet, expected — first sweep since RUM went live); monitors: 3 ok / 0 alert / 9 no-data; digest: docs/observation/autoobs/2026-09-04.md
2026-09-21 02:21 /autoobs [OK] — overall: AT-RISK (read-view synthetic failing 100% of runs both locations, SLO slow-burn alert firing; everything else healthy); monitors: 9 ok / 2 alert / 5 no-data; digest: docs/observation/autoobs/2026-09-21.md
2026-09-21 /autopm [OK, first run — no `autopm.md` spec ported yet] — board: 0→3 ready-for-dev/auto-ok issues filed (#35 npm audit, #36/#37 eslint), owner-digest #38 opened; digest: docs/planning/autopm/2026-09-21.md
2026-09-21 /autoretro [OK, first run — no `autoretro.md`/changelog/pm-reflect/reflect spec ported yet, 007-autonomous-operations still Draft] — shipped: 0 PRs merged (autoobs+autopm sweeps only, 3 issues filed); momentum: STEADY-STATE-OWNER-BLOCKED; no `/autodev` line found (dev-incomplete, carried forward); retro: docs/planning/retro/2026-09-21.md; ceo-brief: docs/planning/ceo-brief/2026-09-21.md
