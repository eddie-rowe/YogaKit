// Sharing a flow inside an organization — feature 004 US3 (FR-022 to FR-032).
//
// The one thing to know about this file: the read path is flows → phases → flow_items,
// and it stops. The author-only notes table is not named anywhere below, and it must
// never be. That is not a filter this module applies — it is the shape of the query,
// and it is what makes SC-009 checkable by reading rather than by trusting.
// tests/unit/architecture/notes-table-unreferenced.test.ts holds the whole of src/ to
// that, so the guarantee survives someone adding a convenience join later.
//
// Contract: specs/004-sequencing-composer/contracts/flow-sharing.md

import type { Flow, FlowItem, Phase } from '@/lib/flow/types'
import type { EnergeticDirection, ModeType } from '@/lib/pose-types'
import { createClient } from '@/lib/supabase/client'
import { CURRENT_SCHEMA_VERSION } from './krama-file'
import { saveFlow } from './flow-store'
import { queueUpsert } from './sync'

export interface OrgOption {
  id: string
  name: string
}

export interface SharedFlow {
  flow: Flow
  orgId: string
  orgName: string
  /** From profile_cards — the only identity data a co-member may read (002). */
  authorName: string | null
}

/** Shape of one row of the share read query. Written out rather than inferred so the
 *  columns it asks for are readable in one place. */
interface SharedFlowRow {
  id: string
  title: string
  schema_version: string
  created_at: string
  updated_at: string
  user_id: string
  shared_org_id: string
  organizations: { name: string } | { name: string }[] | null
  phases: Array<{ id: string; name: string; intent_tag: string; position: number }>
  flow_items: Array<{
    id: string
    pose_slug: string
    mode: string
    measure_breaths: number | null
    measure_seconds: number | null
    phase_id: string | null
    position: number
  }>
}

const SHARE_SELECT =
  'id, title, schema_version, created_at, updated_at, user_id, shared_org_id, ' +
  'organizations (name), ' +
  'phases (id, name, intent_tag, position), ' +
  'flow_items (id, pose_slug, mode, measure_breaths, measure_seconds, phase_id, position)'

function firstName(embedded: { name: string } | { name: string }[] | null): string {
  if (!embedded) return ''
  return Array.isArray(embedded) ? (embedded[0]?.name ?? '') : embedded.name
}

function toFlow(row: SharedFlowRow): Flow {
  const phases: Phase[] = [...row.phases]
    .sort((a, b) => a.position - b.position)
    .map(p => ({
      id: p.id,
      name: p.name,
      intentTag: p.intent_tag as EnergeticDirection,
      order: p.position,
    }))

  const items: FlowItem[] = [...row.flow_items]
    .sort((a, b) => a.position - b.position)
    .map(i => ({
      id: i.id,
      poseSlug: i.pose_slug,
      mode: i.mode as ModeType,
      // At most one of the two is set (the flow_items_one_measure constraint), and
      // neither is legal — breathMark() renders '' for an unmeasured hold.
      measure: {
        ...(i.measure_breaths !== null ? { breaths: i.measure_breaths } : {}),
        ...(i.measure_seconds !== null ? { seconds: i.measure_seconds } : {}),
      },
      phaseId: i.phase_id,
      order: i.position,
    }))

  // No `note` on any item, because the query that produced `row` asked no table that
  // holds one. This is the assembly step where a note would have to be put back, and
  // there is nothing here to put back.
  return {
    id: row.id,
    title: row.title,
    items,
    phases,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isBuiltIn: false,
    schema_version: row.schema_version || CURRENT_SCHEMA_VERSION,
  }
}

/** The organizations this teacher may share into. Empty for a solo practitioner, which
 *  is the common case, and the share surface is absent entirely for them. */
export async function listMyOrgs(): Promise<OrgOption[]> {
  const supabase = createClient()
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return []

  const { data, error } = await supabase
    .from('memberships')
    .select('org_id, status, organizations (name)')
    .eq('user_id', userId)
    .eq('status', 'active')
  if (error) throw error

  return (data ?? []).map(row => ({
    id: row.org_id as string,
    name: firstName(row.organizations as { name: string } | { name: string }[] | null),
  }))
}

/** Which org a flow is shared with, or null. Also null when the flow has never reached
 *  the server, which is indistinguishable here and reads the same to a teacher. */
export async function getFlowShare(flowId: string): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('flows')
    .select('shared_org_id')
    .eq('id', flowId)
    .maybeSingle()
  if (error) throw error
  return (data?.shared_org_id as string | null) ?? null
}

/** Share, or move a share from one org to another. One update of one column: the
 *  policy is what decides whether it lands (the author must belong to the org). */
export async function shareFlowWithOrg(flowId: string, orgId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('flows').update({ shared_org_id: orgId }).eq('id', flowId)
  if (error) throw error
}

/** Revoke. Existing duplicates are other people's flows and are not touched — there is
 *  no link back to them to touch (FR-032). */
export async function revokeFlowShare(flowId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('flows').update({ shared_org_id: null }).eq('id', flowId)
  if (error) throw error
}

/** Flows shared with an org this teacher belongs to, excluding their own. RLS does the
 *  scoping: flows_select_shared_in_org returns exactly the rows they may see, so this
 *  needs no org filter of its own and must not grow one. */
export async function listFlowsSharedWithMe(): Promise<SharedFlow[]> {
  const supabase = createClient()
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return []

  const { data, error } = await supabase
    .from('flows')
    .select(SHARE_SELECT)
    .not('shared_org_id', 'is', null)
    .is('deleted_at', null)
    .neq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error

  const rows = (data ?? []) as unknown as SharedFlowRow[]
  if (rows.length === 0) return []

  const { data: cards } = await supabase
    .from('profile_cards')
    .select('user_id, display_name')
    .in('user_id', [...new Set(rows.map(r => r.user_id))])
  const nameByUser = new Map((cards ?? []).map(c => [c.user_id as string, c.display_name as string]))

  return rows.map(row => ({
    flow: toFlow(row),
    orgId: row.shared_org_id,
    orgName: firstName(row.organizations),
    authorName: nameByUser.get(row.user_id) ?? null,
  }))
}

/**
 * One-click duplicate (FR-025). Every id is fresh, so the copy is a flow of the
 * recipient's own with no link to the original: the author's later edits do not reach
 * it and its edits do not reach them (FR-026). Independence is a property of there
 * being nothing joining them, not of a rule someone has to enforce.
 *
 * It goes through the ordinary local-first save, so the copy is on the device before
 * any network call and syncs through the same outbox as anything else the teacher
 * writes. `shared_org_id` is not carried over — a duplicate is not itself shared.
 */
export async function adoptSharedFlow(shared: SharedFlow, now = new Date()): Promise<Flow> {
  const nowIso = now.toISOString()
  const phaseIdMap = new Map(shared.flow.phases.map(p => [p.id, crypto.randomUUID()]))

  const flow: Flow = {
    id: crypto.randomUUID(),
    title: shared.flow.title,
    phases: shared.flow.phases.map(p => ({ ...p, id: phaseIdMap.get(p.id) as string })),
    items: shared.flow.items.map(i => ({
      ...i,
      id: crypto.randomUUID(),
      phaseId: i.phaseId ? (phaseIdMap.get(i.phaseId) ?? null) : null,
    })),
    createdAt: nowIso,
    updatedAt: nowIso,
    isBuiltIn: false,
    schema_version: shared.flow.schema_version,
  }

  await saveFlow(flow)
  await queueUpsert(flow)
  return flow
}
