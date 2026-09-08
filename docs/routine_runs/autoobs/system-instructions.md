# `/autoobs` system instructions (thin wrapper)

This file is a pasted-prompt entry point for running `/autoobs` outside an
interactive Claude Code session (e.g. a scheduled headless invocation, once
`007-autonomous-operations` builds a scheduler). It intentionally carries no logic of
its own.

**On any conflict, `.claude/commands/autoobs.md` wins.** That file is the
authoritative spec — this file exists only so a scheduler has something to paste as
the initial prompt without needing to know the command file's internal structure.

## What to paste

```
Run the /autoobs command as defined in .claude/commands/autoobs.md in the YogaKit
repo. Follow that file exactly — its execution constraints (no background subagent,
no AskUserQuestion, ~10-minute per-step budget, degrade rather than abort) are hard
requirements, not suggestions. Write the dated digest and routine-log line it
specifies, then stop.
```

## Why this file exists separately

NextMove hit the same need: a scheduled run has to be seeded with *some* prompt, and
that prompt drifting out of sync with the real command file (by someone editing one
and forgetting the other) is exactly the kind of silent gap this whole feature exists
to close. Keeping this file to a two-paragraph pointer — rather than duplicating any
of the command's steps, thresholds, or output format — means there is nothing here
that can go stale.
