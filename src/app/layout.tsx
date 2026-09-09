import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import { DatadogRumView } from "@/components/DatadogRumView";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import AppHeader, { MobileNavSpacer } from "@/components/layout/AppHeader";
import { PRE_PAINT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// globals.css has mapped --font-serif to var(--font-cormorant) since 001, but the
// font was never loaded, so every `font-serif` heading — page titles across Read,
// Flows, Settings — silently fell back to the sans stack. The serif treatment the
// design calls for had never actually rendered. See FRICTION.md, 2026-08-31.
//
// display: 'swap' rather than 'optional': these are headings on the read view, held
// at arm's length on a mat, and the typeface is the point. A first paint in the
// fallback that reflows to Cormorant is better than one that silently keeps the
// fallback forever on a slow connection.
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "YogaKit: Yoga Sequence Builder",
  description: "A free, open-source yoga sequencing tool for teachers.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "YogaKit" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1c1917",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* First child of <body> so it runs before anything paints. This layout
            stays synchronous and cookie-free on purpose — reading the theme with
            cookies() would force every page dynamic and take the 67 SSG pose
            pages and the offline read path (RULE-L2/L3/L4) with it. So the
            cookie is read here, in the browser, instead. */}
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_SCRIPT }} />
        <ServiceWorkerRegistration />
        {/* RUM init lives in src/instrumentation-client.ts (008) via Next's native
            client instrumentation hook, but the nextjsPlugin sets trackViewsManually
            and only creates a view once something mounts and commits a pathname —
            onRouterTransitionStart alone never starts one, on the initial load or any
            later transition. This is DatadogRumView, not the SDK's own
            DatadogAppRouter — see that component's doc comment for why: the SDK
            starts the view during render, guarded by a per-instance ref, which fires
            once per render *attempt* rather than once per committed navigation and
            produced dozens of spurious views per load in production. Must render
            before other children so the initial view starts before app content
            mounts. */}
        <DatadogRumView />
        <AppHeader />
        {children}
        <MobileNavSpacer />
      </body>
    </html>
  );
}
