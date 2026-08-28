import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { Cairo, Inter } from "next/font/google";
import { Providers } from "./providers";
import { WebThemeStyle } from "@bthwani/ui-kit/web";
import { renderCpCriticalCss } from "../styles/cp-critical-css";

// Self-hosted via next/font/google: the font files are fetched at build time
// and served from this origin, so the CSP never needs to allowlist
// fonts.googleapis.com / fonts.gstatic.com, and there is no render-blocking
// stylesheet round-trip (no FOUT, no preconnect needed).
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "لوحة التحكم — DSH",
  description: "منصة DSH — لوحة التحكم الإدارية",
};

const NONCE_REQUEST_HEADER = "x-bthwani-csp-nonce";

async function readCspNonce(): Promise<string | undefined> {
  const store = await headers();
  return store.get(NONCE_REQUEST_HEADER) ?? undefined;
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = await readCspNonce();
  const criticalCss = renderCpCriticalCss();
  const themeStyleNonce = nonce;
  const criticalStyleNonce = nonce;

  return (
    <html
      lang="ar"
      dir="rtl"
      data-bth-root="true"
      data-ui-root="true"
      data-bth-theme="light"
      data-ui-theme="light"
      className={`${cairo.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head suppressHydrationWarning>
        <WebThemeStyle nonce={themeStyleNonce} />
        <style
          id="control-panel-critical-css"
          suppressHydrationWarning
          nonce={criticalStyleNonce}
          dangerouslySetInnerHTML={{ __html: criticalCss }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
