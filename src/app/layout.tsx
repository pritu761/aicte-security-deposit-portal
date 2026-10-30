import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";

import "@fontsource-variable/inter";
import "@fontsource-variable/source-serif-4";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AICTE Suraksha · Security Deposit & FDR Portal",
    template: "%s · AICTE Suraksha",
  },
  description:
    "A digital workspace for the AICTE Regulation Bureau to manage security deposits, FDR verification, renewals and release authorisations.",
  applicationName: "AICTE Suraksha",
  authors: [{ name: "AICTE Regulation Bureau" }],
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0b2b47",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className="min-h-dvh font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 5000,
            style: { fontFamily: "inherit" },
          }}
        />
      </body>
    </html>
  );
}
