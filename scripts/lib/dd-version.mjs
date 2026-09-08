/**
 * The release version every Datadog surface reports (008, docs/OBSERVABILITY.md §3).
 *
 * One function, because three places have to agree or the whole thing is decorative:
 * RUM's `version` (src/instrumentation-client.ts), the server's `service.version`
 * (src/instrumentation.ts), and `--release-version` on the source-map upload
 * (scripts/upload-sourcemaps.mjs). Datadog looks maps up by service + version + path,
 * so if the upload and the browser disagree by even one character, stacks stay
 * minified and nothing anywhere reports an error.
 *
 * Until now this was the literal string `1.0.0`, set by hand in the environment and
 * never changed. Every deploy since RUM went live has reported as the same release —
 * which means Error Tracking cannot say which deploy introduced a regression, and
 * every build's maps accumulate under one version.
 */

/**
 * Resolves the version, preferring the commit SHA of the deploy actually being built.
 *
 * Note the precedence: `VERCEL_GIT_COMMIT_SHA` beats an explicitly-set `DD_VERSION`,
 * which is the opposite of the usual "explicit wins" convention and is deliberate. The
 * explicit value is a stale constant left in the Vercel dashboard; the SHA is the
 * truth about what is being deployed. It also means the fix needs no dashboard edit to
 * take effect, and a local `npm run dev` (no `VERCEL_*` in the environment) still picks
 * up whatever `.env.local` says.
 *
 * The full 40-character SHA, not the short form: `DD_GIT_COMMIT_SHA` on the source-map
 * upload is the full one, and Datadog can only join a version tag to a commit when the
 * two match exactly.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {string} never empty — `buildUploadArgs` throws on a falsy version, and a
 *   build without git metadata is still a build that should ship
 */
export function resolveVersion(env) {
  return (
    env.VERCEL_GIT_COMMIT_SHA ||
    env.NEXT_PUBLIC_DD_VERSION ||
    env.DD_VERSION ||
    '0.0.0-dev'
  )
}
