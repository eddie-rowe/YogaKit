// The grace-budget detail shown only on request from the streak detail.
//
// specs/005-daily-sadhana FR-018/019/020. Size and period come from
// data/sadhana/grace-budget.json, never a literal here. This is the only shape that carries
// the budget: nothing Today-facing imports it. Exhaustion is a plain number, not a consequence,
// so `used` is clamped to the budget and `remaining` bottoms out at 0. Pure: no copy, no UI.

import graceBudgetData from '../../../data/sadhana/grace-budget.json'
import { graceStatus, parseGraceBudget, type Checkin, type GraceBudget } from './streak'

export interface GraceBudgetDetail {
  used: number
  remaining: number
  size: number
  periodDays: number
}

const DEFAULT_BUDGET: GraceBudget = parseGraceBudget(graceBudgetData)

export function graceBudgetDetail(
  checkins: readonly Checkin[],
  today: string,
  budget: GraceBudget = DEFAULT_BUDGET,
): GraceBudgetDetail {
  const { used, remaining } = graceStatus(checkins, budget, today)
  return {
    used: Math.min(used, budget.size),
    remaining,
    size: budget.size,
    periodDays: budget.periodDays,
  }
}
