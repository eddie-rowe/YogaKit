import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // The dev tools indicator renders at [20, 788, 36, 36] — a 390x844 viewport puts
  // that squarely on top of the bottom tab bar's first tab, so in dev you cannot tap
  // Home and Playwright reports `<nextjs-portal> intercepts pointer events`. Every
  // corner collides with something on a mobile-first layout, so the indicator is off
  // rather than moved. The error overlay is unaffected.
  devIndicators: false,
};

export default nextConfig;
