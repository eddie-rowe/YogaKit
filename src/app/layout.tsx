import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { DatadogRum } from "@/components/DatadogRum";
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* First child of <body> so it runs before anything paints. This layout
            stays synchronous and cookie-free on purpose — reading the theme with
            cookies() would force every page dynamic and take the 67 SSG pose
            pages and the offline read path (RULE-L2/L3/L4) with it. So the
            cookie is read here, in the browser, instead. */}
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_SCRIPT }} />
        <ServiceWorkerRegistration />
        <DatadogRum />
        <AppHeader />
        {children}
        <MobileNavSpacer />
      </body>
    </html>
  );
}
