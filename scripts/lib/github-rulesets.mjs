/**
 * GitHub ruleset sync: the pure half (#65).
 *
 * No filesystem, no network — every export here is a function of its arguments:
 * manifest validation and the diff between a manifest and a live ruleset. The I/O
 * lives in `scripts/github/sync-rulesets.mjs`. Same split as
 * `scripts/lib/datadog-sync.mjs`, for the same reason: this is the only path by which
 * branch-protection config reaches the live repo, so its decision logic needs to be
 * testable without touching GitHub.
 */

const REQUIRED_TOP_LEVEL_KEYS = ['name', 'target', 'enforcement', 'conditions', 'rules']

/**
 * Validate a ruleset manifest's shape. Returns `{ valid, errors }` — never throws, so
 * every manifest in a run can be checked and every failure reported at once.
 */
export function validateManifest(filename, manifest) {
  const errors = []

  for (const key of REQUIRED_TOP_LEVEL_KEYS) {
    if (!(key in manifest)) {
      errors.push(`missing required key "${key}"`)
    }
  }

  if (manifest.target !== 'branch') {
    errors.push(`"target" must be "branch", got ${JSON.stringify(manifest.target)}`)
  }

  if (manifest.enforcement !== 'active' && manifest.enforcement !== 'disabled') {
    errors.push(`"enforcement" must be "active" or "disabled", got ${JSON.stringify(manifest.enforcement)}`)
  }

  if (!Array.isArray(manifest.rules)) {
    errors.push(`"rules" must be an array`)
  } else {
    const statusCheckRules = manifest.rules.filter((r) => r.type === 'required_status_checks')
    if (statusCheckRules.length > 1) {
      errors.push(`only one "required_status_checks" rule is allowed, found ${statusCheckRules.length}`)
    }
    for (const rule of statusCheckRules) {
      const checks = rule.parameters?.required_status_checks
      if (!Array.isArray(checks) || checks.length === 0) {
        errors.push(`required_status_checks rule must list at least one check`)
      } else {
        for (const check of checks) {
          if (typeof check?.context !== 'string' || check.context.length === 0) {
            errors.push(`required_status_checks entry missing a non-empty "context"`)
          }
        }
      }
    }
  }

  const expectedName = filename.replace(/\.json$/, '')
  if (manifest.name !== expectedName) {
    errors.push(`"name" (${JSON.stringify(manifest.name)}) does not match filename-derived name (${JSON.stringify(expectedName)})`)
  }

  return { valid: errors.length === 0, errors }
}

/** Pull just the fields this tool manages out of a live ruleset API response. */
function pickManaged(ruleset) {
  return {
    name: ruleset.name,
    target: ruleset.target,
    enforcement: ruleset.enforcement,
    conditions: ruleset.conditions ?? {},
    rules: (ruleset.rules ?? []).map((r) => ({ type: r.type, parameters: r.parameters ?? {} })),
  }
}

/**
 * Diff a local manifest against the live ruleset with the same name.
 * Returns one of:
 *   { action: 'create' }                         — no live ruleset with this name
 *   { action: 'none' }                            — live ruleset already matches
 *   { action: 'update', differences: string[] }   — live ruleset exists but differs
 */
export function planAction(manifest, liveRuleset) {
  if (!liveRuleset) {
    return { action: 'create' }
  }

  const wanted = pickManaged(manifest)
  const have = pickManaged(liveRuleset)
  const differences = []

  if (wanted.target !== have.target) {
    differences.push(`target: ${JSON.stringify(have.target)} -> ${JSON.stringify(wanted.target)}`)
  }
  if (wanted.enforcement !== have.enforcement) {
    differences.push(`enforcement: ${JSON.stringify(have.enforcement)} -> ${JSON.stringify(wanted.enforcement)}`)
  }
  if (JSON.stringify(wanted.conditions) !== JSON.stringify(have.conditions)) {
    differences.push(`conditions: ${JSON.stringify(have.conditions)} -> ${JSON.stringify(wanted.conditions)}`)
  }
  if (JSON.stringify(wanted.rules) !== JSON.stringify(have.rules)) {
    differences.push(`rules: ${JSON.stringify(have.rules)} -> ${JSON.stringify(wanted.rules)}`)
  }

  return differences.length === 0 ? { action: 'none' } : { action: 'update', differences }
}

/** Render one manifest's plan as a human-readable line, for `--diff` output. */
export function formatResultLine(filename, result) {
  if (result.action === 'none') {
    return `  OK      ${filename} (matches live)`
  }
  if (result.action === 'create') {
    return `  CREATE  ${filename} (no live ruleset with this name)`
  }
  return `  UPDATE  ${filename}\n${result.differences.map((d) => `            ${d}`).join('\n')}`
}
