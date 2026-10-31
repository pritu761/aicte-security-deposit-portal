import type { Metadata, Viewport } from "next";

import { AppToaster } from "@/components/app-toaster";
import { SiteBackdrop } from "@/components/site-backdrop";

import "@fontsource-variable/inter";
import "@fontsource-variable/source-serif-4";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FDR Setu · Security Deposit & FDR Portal",
    template: "%s · FDR Setu",
  },
  description:
    "A digital workspace for the AICTE Regulation Bureau to manage security deposits, FDR verification, renewals and release authorisations.",
  applicationName: "FDR Setu",
  authors: [{ name: "AICTE Regulation Bureau" }],
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f5ee" },
    { media: "(prefers-color-scheme: dark)", color: "#071e33" },
  ],
  width: "device-width",
  initialScale: 1,
};

const themeScript = `(function(){var stored;try{stored=localStorage.getItem("fdr-setu-theme")}catch(e){}var dark=stored?stored==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;var root=document.documentElement;root.classList.toggle("dark",dark);root.style.colorScheme=dark?"dark":"light";})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <SiteBackdrop />
        <div className="relative z-10">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
          >
            Skip to main content
          </a>
          {children}
        </div>
        <AppToaster />
      </body>
    </html>
  );
}
