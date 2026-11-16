'use client'

// Today (005 US1) — a shell mounting the built sadhana components over in-memory state
// only. No network, DB, auth or storage call: persistence waits on the 005 C1 schema. A
// reload starts empty. Streak logic is the shared pure module, so the count only grows.

import { useState } from 'react'

import CheckinForm, { type CheckinSubmission } from '@/components/sadhana/CheckinForm'
import GraceBudgetDetail from '@/components/sadhana/GraceBudgetDetail'
import LogActions from '@/components/sadhana/LogActions'
import MilestoneCard from '@/components/sadhana/MilestoneCard'
import StreakDisplay from '@/components/sadhana/StreakDisplay'
import { resolveLocalDay } from '@/lib/sadhana/local-day'
import { nextMilestone } from '@/lib/sadhana/milestones'
import { computeStreak, type Checkin } from '@/lib/sadhana/streak'

/** One row per local day (FR-008). Practice outranks rest on the same day (FR-014). */
function record(list: readonly Checkin[], localDate: string, kind: Checkin['kind']): Checkin[] {
  const current = list.find((c) => c.localDate === localDate)
  if (current?.kind === 'practice') return [...list]
  return [...list.filter((c) => c.localDate !== localDate), { localDate, kind }]
}

export default function TodayPage() {
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [acknowledged, setAcknowledged] = useState<number[]>([])

  const streak = computeStreak(checkins)
  const milestone = nextMilestone(streak, acknowledged)
  const today = resolveLocalDay(new Date())

  function onSubmit(c: CheckinSubmission) {
    setCheckins((list) => record(list, c.localDate, 'practice'))
  }

  return (
    <main data-testid="sadhana-today" className="mx-auto max-w-md space-y-6 p-4">
      <StreakDisplay streak={streak} />
      {milestone !== null && (
        <MilestoneCard milestone={milestone} onDismiss={(m) => setAcknowledged((a) => [...a, m])} />
      )}
      <LogActions
        onLogPractice={() => setCheckins((list) => record(list, resolveLocalDay(new Date()), 'practice'))}
        onLogRest={() => setCheckins((list) => record(list, resolveLocalDay(new Date()), 'rest'))}
      />
      <CheckinForm existing={checkins} onSubmit={onSubmit} />
      <GraceBudgetDetail checkins={checkins} today={today} />
    </main>
  )
}
