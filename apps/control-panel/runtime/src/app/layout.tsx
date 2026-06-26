import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "لوحة التحكم — DSH",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, fontFamily: "'Cairo', system-ui, sans-serif" }}>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }

          :root {
            /* Sidebar */
            --dsh-sidebar-width: 15rem;
            --dsh-sidebar-bg: rgb(11, 17, 32);
            --dsh-sidebar-bg-hover: rgba(255,255,255,0.055);
            --dsh-sidebar-bg-active: rgba(59,123,255,0.14);
            --dsh-sidebar-border: rgba(255,255,255,0.07);
            --dsh-sidebar-text: rgba(160,185,220,0.82);
            --dsh-sidebar-text-active: rgb(255,255,255);
            --dsh-sidebar-accent: rgb(59,123,255);
            --dsh-sidebar-shadow: -4px 0 32px rgba(0,0,0,0.22);

            /* TopBar */
            --dsh-topbar-height: 3.5rem;
            --dsh-topbar-bg: rgb(255,255,255);
            --dsh-topbar-border: rgb(226,232,243);

            /* Content */
            --dsh-content-bg: rgb(244,246,250);

            /* Cards */
            --dsh-card-bg: rgb(255,255,255);
            --dsh-card-border: rgb(226,232,243);
            --dsh-card-shadow: 0 1px 3px rgba(15,30,64,0.07), 0 1px 2px rgba(15,30,64,0.04);
            --dsh-card-shadow-hover: 0 8px 28px rgba(15,30,64,0.13), 0 2px 8px rgba(15,30,64,0.06);

            /* Text */
            --dsh-text-primary: rgb(13,20,37);
            --dsh-text-secondary: rgb(90,106,133);
            --dsh-text-muted: rgb(138,155,187);

            /* Backward compat aliases used by page.tsx */
            --card-bg: var(--dsh-card-bg);
            --card-border: var(--dsh-card-border);
            --card-shadow: var(--dsh-card-shadow);
            --card-shadow-hover: var(--dsh-card-shadow-hover);
            --text-primary: var(--dsh-text-primary);
            --text-secondary: var(--dsh-text-secondary);
            --text-muted: var(--dsh-text-muted);

            /* Easing */
            --ease-smooth: cubic-bezier(0.22, 0.61, 0.36, 1);
            --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
            --font-arabic: 'Cairo', system-ui, sans-serif;
          }

          @keyframes dsh-fade-up {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          html, body { height: 100%; overflow: hidden; }
          body { background: var(--dsh-content-bg); color: var(--dsh-text-primary); }
          button { font-family: inherit; }
          a { color: inherit; text-decoration: none; }
          ul, ol { list-style: none; margin: 0; padding: 0; }

          ::-webkit-scrollbar { width: 5px; height: 5px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(59,123,255,0.25); border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(59,123,255,0.45); }
        `}</style>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
