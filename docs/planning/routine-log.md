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
