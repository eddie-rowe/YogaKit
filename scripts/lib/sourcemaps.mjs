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
