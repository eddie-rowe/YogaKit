import type { NextConfig } from "next";
import path from "path";

const releaseVersion =
  process.env.NEXT_PUBLIC_DD_VERSION ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.npm_package_version ??
  "0.1.0";

const nextConfig: NextConfig = {
  // One build-derived release identifier is embedded in RUM and reused by the
  // source-map uploader. Vercel's commit SHA prevents unrelated deploys from being
  // grouped under a static version while still allowing an explicit override.
  env: {
    NEXT_PUBLIC_DD_VERSION: releaseVersion,
  },
  turbopack: {
    root: path.join(__dirname),
  },
  // The dev tools indicator renders at [20, 788, 36, 36] — a 390x844 viewport puts
  // that squarely on top of the bottom tab bar's first tab, so in dev you cannot tap
  // Home and Playwright reports `<nextjs-portal> intercepts pointer events`. Every
  // corner collides with something on a mobile-first layout, so the indicator is off
  // rather than moved. The error overlay is unaffected.
  devIndicators: false,
  // 008 US2: without this, Next.js emits no browser source maps at all, and there is
  // nothing for scripts/upload-sourcemaps.mjs to upload — captured RUM errors would
  // group correctly but every stack frame would point into a minified chunk. The maps
  // this produces are deleted from the build output right after upload (see that
  // script), so nothing sits publicly readable at /_next/static in the deployed app.
  productionBrowserSourceMaps: true,
};

export default nextConfig;
