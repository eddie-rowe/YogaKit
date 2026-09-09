/**
 * Source-map upload: the pure half (008 US2, docs/OBSERVABILITY.md §6).
 *
 * RUM error stack traces are minified without this step. Decidable logic —
 * whether to run at all, what arguments `datadog-ci` gets, and which files to clean up
 * afterward — lives here so it is unit-tested; `scripts/upload-sourcemaps.mjs` only
 * shells out and touches the filesystem.
 */

/**
 * Whether the upload should run. Mirrors 008's degrade-don't-abort/no-op posture
 * (FR-025/SC-011) applied to the build step: a developer running `npm run build`
 * locally, or a fork PR with no repo secrets, must get a normal successful build, not
 * a failure over an optional telemetry step.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {{ shouldRun: boolean, reason?: string }}
 */
export function shouldUpload(env) {
  if (!env.DD_API_KEY) {
    return { shouldRun: false, reason: 'DD_API_KEY not set — skipping source-map upload (this is not an error)' }
  }
  return { shouldRun: true }
}

/**
 * The environment overlay `datadog-ci` needs, on top of the ambient one.
 *
 * `sourcemaps upload` builds its own internal metrics logger *before* it uploads
 * anything, and — unlike every other upload command in the CLI, each of which passes
 * `apiKey: this.config.apiKey` — it constructs that logger with no `apiKey` at all
 * (datadog-ci 5.23.0):
 *
 *     const metricsLogger = getMetricsLogger({
 *       datadogSite: getDatadogSiteFromEnv(),
 *       defaultTags: loggerTags,
 *       prefix: 'datadog.ci.sourcemaps.',
 *     })
 *
 * The bundled `datadog-metrics` then falls back to `process.env.DATADOG_API_KEY`
 * *only*, and throws `DATADOG_API_KEY environment variable not set` when it is absent —
 * even though the command resolves the key perfectly well from `DD_API_KEY` for the
 * upload itself. The two spellings are therefore not interchangeable in this one
 * command, and a repo standardised on `DD_API_KEY` (this one is, see
 * docs/OBSERVABILITY.md) hits it on every build that has a key at all. Mirroring the
 * key under the other name is the whole fix.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {Record<string, string>} keys to add; empty when there is nothing to mirror
 */
export function uploadEnv(env) {
  const key = env.DATADOG_API_KEY || env.DD_API_KEY
  return key ? { DATADOG_API_KEY: key } : {}
}

/**
 * Warns when the maps would be uploaded to a different Datadog site than the one RUM
 * reports to. Datadog looks maps up by site + service + version + path, so a site
 * mismatch is the same class of silent failure `buildUploadArgs` guards for version —
 * except louder to miss, because *both* halves succeed: the upload returns 200 against
 * the wrong org and RUM keeps showing minified stacks forever.
 *
 * `datadog-ci` resolves its site from `DATADOG_SITE || DD_SITE`, falling back to US1
 * (`datadoghq.com`); the browser SDK reads `NEXT_PUBLIC_DD_SITE`. This project is on
 * `us5`, so an environment that sets the key but forgets `DD_SITE` uploads every map to
 * the wrong region. A warning rather than a throw: a wrong guess about which of the two
 * is authoritative must not be able to stop a deploy.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {string | undefined} the warning to print, or undefined when they agree
 */
export function siteMismatchWarning(env) {
  const rumSite = env.NEXT_PUBLIC_DD_SITE
  if (!rumSite) return undefined
  const uploadSite = env.DATADOG_SITE || env.DD_SITE || 'datadoghq.com'
  if (uploadSite === rumSite) return undefined
  return (
    `uploading to ${uploadSite} but RUM reports to ${rumSite} — ` +
    'stacks will not resolve. Set DD_SITE to match NEXT_PUBLIC_DD_SITE.'
  )
}

/** Git hosts datadog-ci can build deep links for, keyed by Vercel's provider name. */
const GIT_HOSTS = {
  github: 'github.com',
  gitlab: 'gitlab.com',
  bitbucket: 'bitbucket.org',
}

/**
 * The git metadata overlay, so unminified stack frames link to the line on GitHub.
 *
 * Vercel builds from a tarball, not a clone: there is no `.git` directory and no
 * remote, so datadog-ci's automatic detection prints "No git remotes available" and
 * uploads maps with no repository attached. Stacks de-minify, but no frame links
 * anywhere — which is half the value of uploading them.
 *
 * datadog-ci's documented answer is to supply `DD_GIT_REPOSITORY_URL` *and*
 * `DD_GIT_COMMIT_SHA`: with both present it skips invoking git entirely, which is
 * exactly the tarball case. Both or neither — one alone still shells out to git and
 * still fails. Vercel exposes the pieces as `VERCEL_GIT_*` (build and runtime), gated
 * on "Enable access to System Environment Variables" in project settings.
 *
 * One consequence worth stating plainly: in bypass mode datadog-ci takes source paths
 * from each map's own `sources` field rather than from git's list of tracked files, so
 * a path that is untracked locally can still be named. That is application source, not
 * practice content — RULE-L7 is untouched — but it should be written down rather than
 * discovered.
 *
 * Returns `{}` for any provider not in GIT_HOSTS: datadog-ci only understands hosts
 * containing github, gitlab, bitbucket, or dev.azure, and a URL it cannot parse is
 * worse than no URL, because the upload still succeeds and the links are silently wrong.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {Record<string, string>} both keys, or none
 */
export function gitEnv(env) {
  const host = GIT_HOSTS[env.VERCEL_GIT_PROVIDER ?? '']
  const owner = env.VERCEL_GIT_REPO_OWNER
  const slug = env.VERCEL_GIT_REPO_SLUG

  const url = env.DD_GIT_REPOSITORY_URL || (host && owner && slug ? `https://${host}/${owner}/${slug}` : undefined)
  const sha = env.DD_GIT_COMMIT_SHA || env.VERCEL_GIT_COMMIT_SHA

  if (!url || !sha) return {}
  return { DD_GIT_REPOSITORY_URL: url, DD_GIT_COMMIT_SHA: sha }
}

/**
 * Builds the `datadog-ci sourcemaps upload` argument list. `--release-version` must
 * equal what RUM itself reports as `version` (`NEXT_PUBLIC_DD_VERSION`) — a mismatch
 * here is the classic silent failure: the upload succeeds and stacks still don't
 * resolve, because Datadog looks up maps by service+version+path, not by upload time.
 *
 * @param {{ buildDir: string, service: string, releaseVersion: string, minifiedPathPrefix: string }} opts
 * @returns {string[]}
 */
export function buildUploadArgs({ buildDir, service, releaseVersion, minifiedPathPrefix }) {
  if (!releaseVersion) {
    throw new Error('buildUploadArgs: releaseVersion is required (expected NEXT_PUBLIC_DD_VERSION)')
  }
  return [
    'sourcemaps',
    'upload',
    buildDir,
    `--service=${service}`,
    `--release-version=${releaseVersion}`,
    `--minified-path-prefix=${minifiedPathPrefix}`,
    `--project-path=${buildDir}`,
  ]
}

/**
 * Which files to delete after a successful upload, so a map Datadog now holds
 * server-side is not also sitting publicly readable at the deployed path. Deletion
 * is the caller's job (`upload-sourcemaps.mjs`) — this only decides the file list, and
 * only from files that were actually given to it (no directory walking here), so a
 * caller that never found any `.map` files can never accidentally delete something
 * else by way of an empty/wrong glob.
 *
 * @param {string[]} files - absolute or relative paths already discovered by the caller
 * @returns {string[]} the subset that are source maps
 */
export function mapFilesToDelete(files) {
  return files.filter((f) => f.endsWith('.map'))
}
