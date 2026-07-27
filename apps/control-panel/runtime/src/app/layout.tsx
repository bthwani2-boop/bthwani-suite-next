import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cairo, Inter } from "next/font/google";
import { Providers } from "./providers";
import { WebThemeStyle } from "@bthwani/ui-kit/web";
import { buildCpCssVariables, buildCpLegacyAliasVariables, renderCssVariableBlock } from "../styles/cp-css-vars";

// Self-hosted via next/font/google: the font files are fetched at build time and
// served from this origin, so the CSP never needs to allowlist
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-bth-root="true"
      data-ui-root="true"
      data-bth-theme="light"
      data-ui-theme="light"
      className={`${cairo.variable} ${inter.variable}`}
    >
      <head>
        <WebThemeStyle />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }

          :root {
${renderCssVariableBlock(buildCpCssVariables())}

            /* Typography */
            --font-arabic:     var(--font-cairo), 'system-ui', sans-serif;
            --font-latin:      var(--font-inter), 'system-ui', sans-serif;

            /* Legacy aliases (pre-Phase-0 names) — remove once every call site
               migrates to --cp-*. See src/styles/cp-css-vars.ts. */
${renderCssVariableBlock(buildCpLegacyAliasVariables())}
          }

          html, body { height: 100%; margin: 0; padding: 0; }

          body {
            font-family: var(--font-arabic);
            background: var(--main-bg);
            color: var(--text-primary);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          /* --font-latin renders Latin-script / numeral-only runs (codes, IDs,
             amounts, English labels) explicitly marked as such, rather than
             falling back to Cairo's Latin glyphs. */
          [lang="en"], [dir="ltr"], .cp-latin {
            font-family: var(--font-latin);
          }

          @keyframes dsh-fade-up {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes dsh-fade-in {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes dsh-pulse-dot {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.4; }
          }
        `}</style>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
