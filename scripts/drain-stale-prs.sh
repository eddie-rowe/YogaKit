#!/usr/bin/env bash
#
# One-shot backlog drain, 2026-10-12. Closes the stale-PR cohort and re-grooms
# the issues they came from, so autodev rebuilds them against current main.
#
# WHY THIS IS A SCRIPT AND NOT A ROUTINE STEP: every GitHub write is blocked for
# the Enterprise Managed User the agent session authenticates as
# (`closePullRequest`, `addComment`, `addLabelsToLabelable` all return
# "Unauthorized: As an Enterprise Managed User, you cannot access this content").
# Reads work. So the owner has to run this under their own account.
#
# Each PR below is past the >40-commits-behind threshold that `autodev.md` step
# 1a now closes rather than rebases: a SUCCESS rollup only attests to the base
# the checks ran against, and on these that base no longer exists. The source
# issues are all open with their acceptance criteria intact, so nothing is lost.
#
# Run from the repo root. Idempotent: re-running skips what is already closed.

set -uo pipefail

REPO="eddie-rowe/YogaKit"

# pr:issue:commits-behind
CLOSURES=(
  "129:127:48"
  "122:107:59"
  "109:106:85"
  "105:83:91"
  "99:82:101"
  "98:97:105"
  "94:61:103"
  "93:61:103"
  "92:61:103"
  "91:60:104"
  "90:47:104"
)

echo "==> Closing stale PRs"
for entry in "${CLOSURES[@]}"; do
  IFS=: read -r pr issue behind <<< "$entry"

  state="$(gh pr view "$pr" --repo "$REPO" --json state --jq .state 2>/dev/null || echo MISSING)"
  if [ "$state" != "OPEN" ]; then
    echo "   skip #$pr (state=$state)"
    continue
  fi

  extra=""
  case "$pr" in
    98) extra="

The additive half of this PR is already on \`main\` — \`specs/005-daily-sadhana/plan.md\` and \`tasks.md\` landed in \`1ac7c50\`, so the planning work is not lost. What was *not* taken is this branch's \`CLAUDE.md\` edit: written 2026-09-26, it deletes the 006 artifact lines and repoints current-plan at 005, and both are now wrong — 006 is active work (#154, #155) and 004 still has #106 and #107 open." ;;
    90) extra="

\`db-types-check\` is also red here. #101 exists only to regenerate \`src/types/database.ts\` on this branch, so it goes obsolete with this closure — the regen happens naturally in the rebuild." ;;
    122) extra="

\`ci\` is also red on this head." ;;
  esac

  gh pr close "$pr" --repo "$REPO" --comment "Closing in favour of rebuilding from #${issue}.

This branch is ${behind} commits behind \`main\`. Its check rollup ran against a base that no longer exists, so the green badge is evidence about a tree nobody is proposing to merge. Resolving that much drift costs more than re-deriving from the issue, and the rebuilt branch gets tested against current main rather than against an unreviewed merge.

#${issue} stays open with its acceptance criteria intact, so autodev picks it up in queue order. No work is lost.${extra}

Part of a backlog drain — \`autodev.md\` step 1a now closes anything past 40 commits behind rather than merging it on a stale green. See \`DECISIONS.md\` 2026-10-12." \
    && echo "   closed #$pr -> rebuild from #$issue (${behind} behind)" \
    || echo "   FAILED to close #$pr"
done

echo
echo "==> Re-grooming source issues so the queue actually picks them up"
# These already carry ready-for-dev + auto-ok and need nothing.
for i in 106 107 127; do
  echo "   #$i already ready-for-dev,auto-ok — no change"
done

# #60 and #61 are auto/needs-human with NO ready-for-dev, so closing #91-#94
# against them drops that work out of the queue entirely.
echo "   #60 / #61: NOT requeued on purpose — see the note printed at the end"

echo
echo "==> #101 is obsolete"
if [ "$(gh issue view 101 --repo "$REPO" --json state --jq .state 2>/dev/null)" = "OPEN" ]; then
  gh issue close 101 --repo "$REPO" --comment "Obsolete. This issue exists only to regenerate \`src/types/database.ts\` on PR #90's branch, and #90 is now closed as 104 commits behind. The regen happens as part of rebuilding #47 against current main." \
    && echo "   closed #101" || echo "   FAILED to close #101"
else
  echo "   already closed"
fi

echo
echo "==> Remaining open PRs"
gh pr list --repo "$REPO" --state open --json number,headRefName --jq '.[] | "   #\(.number) \(.headRefName)"'

cat <<'NOTE'

==> Two things this script deliberately does NOT do

1. #60 and #61 are labelled `auto/needs-human` with no `ready-for-dev`, so the
   work from #91-#94 will NOT re-enter the queue just because those PRs closed.
   #61 covers cohort UI *and* Stripe billing, which FR-008 makes owner-gated
   regardless, so it probably wants splitting into an additive-safe part and an
   owner-gated part before it is groomed. That is a scoping decision, not a
   label edit, so it is left to you.

2. #154 and #155 are untouched. They are 10 commits behind, opened today, green,
   and genuinely blocked only on browser validation — the one case where the
   fixture is the real blocker.
NOTE
