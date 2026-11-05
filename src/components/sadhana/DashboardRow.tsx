// One cohort-dashboard row (005 T052 UI half, FR-053/054/055). Presentational and unmounted.
//
// Takes the `toDashboardRow` output plus a status key and shows only the FR-053 fields: name,
// status, streak, days since last check-in, milestone progress. The props type has no reflection,
// intention or note field, so practice content cannot reach it (FR-055). A null day count and a
// zero streak render nothing, never a number or wording that implies a lapse (Principle VII).
// The boundary caption belongs to the dashboard route, once, not to each row.

import StatusPill, { type StatusKey } from './StatusPill'
import type { DashboardRow as DashboardRowData } from '@/lib/sadhana/dashboard-row'

interface DashboardRowProps {
  row: Pick<DashboardRowData, 'studentName' | 'daysSinceLastCheckin' | 'streak' | 'milestoneProgress'>
  status: StatusKey
}

function lastCheckin(days: number): string {
  if (days <= 0) return 'Checked in today'
  return `Checked in ${days} ${days === 1 ? 'day' : 'days'} ago`
}

export default function DashboardRow({ row, status }: DashboardRowProps) {
  const { studentName, daysSinceLastCheckin, streak, milestoneProgress } = row
  return (
    <li
      data-testid="sadhana-dashboard-row"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg p-3 text-sm"
      style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
    >
      <span data-testid="sadhana-dashboard-row-name" className="font-medium">
        {studentName}
      </span>
      <StatusPill status={status} />
      {streak >= 1 && (
        <span data-testid="sadhana-dashboard-row-streak" style={{ color: 'var(--muted)' }}>
          {streak} {streak === 1 ? 'day practised' : 'days practised'}
        </span>
      )}
      {daysSinceLastCheckin !== null && (
        <span data-testid="sadhana-dashboard-row-last-checkin" style={{ color: 'var(--muted)' }}>
          {lastCheckin(daysSinceLastCheckin)}
        </span>
      )}
      <span data-testid="sadhana-dashboard-row-milestones" style={{ color: 'var(--muted)' }}>
        {milestoneProgress} {milestoneProgress === 1 ? 'milestone' : 'milestones'} reached
      </span>
    </li>
  )
}
