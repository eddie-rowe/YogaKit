import { describe, expect, it } from 'vitest'

import { describeSupabaseRequest } from '../../../src/lib/supabase/tracing'

const SUPABASE_URL = 'https://project-ref.supabase.co'

describe('describeSupabaseRequest', () => {
  it('describes a table read without retaining its query values', () => {
    const description = describeSupabaseRequest(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.private-user-id&select=*`,
      undefined,
      SUPABASE_URL,
    )

    expect(description).toEqual({
      name: 'supabase.postgrest SELECT profiles',
      attributes: {
        'server.address': 'project-ref.supabase.co',
        'http.request.method': 'GET',
        'supabase.component': 'postgrest',
        'db.system.name': 'postgresql',
        'db.namespace': 'postgres',
        'db.operation.name': 'SELECT',
        'db.collection.name': 'profiles',
      },
    })
    expect(JSON.stringify(description)).not.toContain('private-user-id')
  })

  it('describes an allow-listed RPC as a stored procedure call', () => {
    expect(
      describeSupabaseRequest(
        `${SUPABASE_URL}/rest/v1/rpc/app_save_flow`,
        { method: 'POST', body: '{"payload":"private practice"}' },
        SUPABASE_URL,
      ),
    ).toMatchObject({
      name: 'supabase.postgrest CALL app_save_flow',
      attributes: {
        'db.operation.name': 'CALL',
        'db.stored_procedure.name': 'app_save_flow',
      },
    })
  })

  it('distinguishes an upsert from an insert using PostgREST preferences', () => {
    const description = describeSupabaseRequest(
      `${SUPABASE_URL}/rest/v1/profiles`,
      { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' } },
      SUPABASE_URL,
    )

    expect(description?.name).toBe('supabase.postgrest UPSERT profiles')
    expect(description?.attributes['db.operation.name']).toBe('UPSERT')
  })

  it('collapses unknown relations instead of creating a content-derived resource', () => {
    const description = describeSupabaseRequest(
      `${SUPABASE_URL}/rest/v1/my_private_flow_title`,
      { method: 'PATCH' },
      SUPABASE_URL,
    )

    expect(description?.name).toBe('supabase.postgrest UPDATE unknown')
    expect(description?.attributes['db.collection.name']).toBe('unknown')
    expect(JSON.stringify(description)).not.toContain('my_private_flow_title')
  })

  it('identifies non-database Supabase services without retaining object paths', () => {
    const description = describeSupabaseRequest(
      `${SUPABASE_URL}/storage/v1/object/private/user-id/flow-name.json`,
      { method: 'POST' },
      SUPABASE_URL,
    )

    expect(description).toMatchObject({
      name: 'supabase.storage POST',
      attributes: { 'supabase.component': 'storage' },
    })
    expect(JSON.stringify(description)).not.toContain('flow-name')
  })

  it('does not describe requests sent outside the configured Supabase origin', () => {
    expect(
      describeSupabaseRequest('https://api.stripe.com/v1/customers', undefined, SUPABASE_URL),
    ).toBeNull()
  })
})
