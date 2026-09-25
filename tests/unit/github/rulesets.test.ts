/**
 * Unit tests for the GitHub ruleset sync's pure module (#65).
 *
 * Everything here runs in memory against plain objects — no filesystem, no network,
 * no live GitHub call. This is the only path by which branch-protection config
 * reaches the live repo, so its validation/diff logic needs a test that doesn't
 * depend on the GitHub API being reachable or in any particular state.
 */

import { describe, expect, it } from 'vitest'

import { formatResultLine, planAction, validateManifest } from '../../../scripts/lib/github-rulesets.mjs'

const baseManifest = {
  name: 'main-protection',
  target: 'branch',
  enforcement: 'active',
  conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
  rules: [
    {
      type: 'required_status_checks',
      parameters: {
        strict_required_status_checks_policy: true,
        required_status_checks: [{ context: 'ci' }, { context: 'db-verify' }],
      },
    },
  ],
}

describe('validateManifest', () => {
  it('accepts a well-formed manifest whose name matches its filename', () => {
    const { valid, errors } = validateManifest('main-protection.json', baseManifest)
    expect(valid).toBe(true)
    expect(errors).toEqual([])
  })

  it('flags every missing required key at once', () => {
    const { valid, errors } = validateManifest('x.json', {})
    expect(valid).toBe(false)
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('"name"'),
        expect.stringContaining('"target"'),
        expect.stringContaining('"enforcement"'),
        expect.stringContaining('"conditions"'),
        expect.stringContaining('"rules"'),
      ]),
    )
  })

  it('rejects a target other than "branch"', () => {
    const { valid, errors } = validateManifest('main-protection.json', { ...baseManifest, target: 'tag' })
    expect(valid).toBe(false)
    expect(errors.some((e) => e.includes('"target"'))).toBe(true)
  })

  it('rejects an enforcement value outside active/disabled', () => {
    const { valid, errors } = validateManifest('main-protection.json', {
      ...baseManifest,
      enforcement: 'evaluate',
    })
    expect(valid).toBe(false)
    expect(errors.some((e) => e.includes('"enforcement"'))).toBe(true)
  })

  it('rejects a name that does not match the filename', () => {
    const { valid, errors } = validateManifest('other.json', baseManifest)
    expect(valid).toBe(false)
    expect(errors.some((e) => e.includes('does not match'))).toBe(true)
  })

  it('rejects more than one required_status_checks rule', () => {
    const { valid, errors } = validateManifest('main-protection.json', {
      ...baseManifest,
      rules: [...baseManifest.rules, baseManifest.rules[0]],
    })
    expect(valid).toBe(false)
    expect(errors.some((e) => e.includes('only one'))).toBe(true)
  })

  it('rejects an empty required_status_checks list', () => {
    const { valid, errors } = validateManifest('main-protection.json', {
      ...baseManifest,
      rules: [{ type: 'required_status_checks', parameters: { required_status_checks: [] } }],
    })
    expect(valid).toBe(false)
    expect(errors.some((e) => e.includes('at least one check'))).toBe(true)
  })

  it('rejects a status check entry with no context', () => {
    const { valid, errors } = validateManifest('main-protection.json', {
      ...baseManifest,
      rules: [
        {
          type: 'required_status_checks',
          parameters: { required_status_checks: [{ context: '' }] },
        },
      ],
    })
    expect(valid).toBe(false)
    expect(errors.some((e) => e.includes('non-empty "context"'))).toBe(true)
  })

  it('rejects rules that is not an array', () => {
    const { valid, errors } = validateManifest('main-protection.json', { ...baseManifest, rules: 'nope' })
    expect(valid).toBe(false)
    expect(errors.some((e) => e.includes('"rules" must be an array'))).toBe(true)
  })
})

describe('planAction', () => {
  it('plans "create" when no live ruleset exists', () => {
    expect(planAction(baseManifest, null)).toEqual({ action: 'create' })
  })

  it('plans "none" when the live ruleset already matches', () => {
    const live = { ...baseManifest, id: 1 }
    expect(planAction(baseManifest, live)).toEqual({ action: 'none' })
  })

  it('plans "update" with the specific differences when enforcement drifts', () => {
    const live = { ...baseManifest, id: 1, enforcement: 'disabled' }
    const result = planAction(baseManifest, live)
    expect(result.action).toBe('update')
    expect(result.differences?.some((d) => d.startsWith('enforcement:'))).toBe(true)
  })

  it('plans "update" when the required status checks list drifts', () => {
    const live = {
      ...baseManifest,
      id: 1,
      rules: [
        {
          type: 'required_status_checks',
          parameters: { required_status_checks: [{ context: 'ci' }] },
        },
      ],
    }
    const result = planAction(baseManifest, live)
    expect(result.action).toBe('update')
    expect(result.differences?.some((d) => d.startsWith('rules:'))).toBe(true)
  })

  it('ignores fields the live API returns but this tool does not manage', () => {
    const live = { ...baseManifest, id: 1, created_at: '2026-01-01', source: 'Repository' }
    expect(planAction(baseManifest, live)).toEqual({ action: 'none' })
  })
})

describe('formatResultLine', () => {
  it('formats a matching manifest', () => {
    expect(formatResultLine('main-protection.json', { action: 'none' })).toContain('OK')
  })

  it('formats a manifest with no live counterpart', () => {
    expect(formatResultLine('main-protection.json', { action: 'create' })).toContain('CREATE')
  })

  it('formats an update with each difference on its own line', () => {
    const line = formatResultLine('main-protection.json', {
      action: 'update',
      differences: ['enforcement: "disabled" -> "active"'],
    })
    expect(line).toContain('UPDATE')
    expect(line).toContain('enforcement: "disabled" -> "active"')
  })
})
