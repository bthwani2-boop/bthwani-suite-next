import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "لوحة التحكم — DSH",
  description: "منصة DSH — لوحة التحكم الإدارية",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }

          :root {
            /* Brand */
            --dsh-navy:        rgb(13, 20, 37);
            --dsh-navy-mid:    rgb(21, 32, 64);
            --dsh-navy-light:  rgb(30, 45, 85);
            --dsh-blue:        rgb(59, 123, 255);
            --dsh-blue-glow:   rgba(59, 123, 255, 0.2);
            --dsh-blue-bright: rgb(94, 151, 255);
            --dsh-accent-teal: rgb(0, 194, 168);

            /* Sidebar */
            --sidebar-bg:      var(--dsh-navy);
            --sidebar-hover:   var(--dsh-navy-mid);
            --sidebar-active:  var(--dsh-navy-light);
            --sidebar-text:    rgb(168, 191, 223);
            --sidebar-text-active: rgb(255, 255, 255);
            --sidebar-border:  rgb(26, 42, 74);
            --sidebar-width:   15.5rem;

            /* Main content */
            --main-bg:         rgb(240, 244, 250);
            --card-bg:         rgb(255, 255, 255);
            --card-border:     rgb(226, 232, 243);
            --card-shadow:     0 1px 3px rgba(13,20,37,0.07), 0 4px 16px rgba(13,20,37,0.06);
            --card-shadow-hover: 0 8px 32px rgba(59,123,255,0.15), 0 2px 8px rgba(13,20,37,0.1);

            /* Topbar */
            --topbar-bg:       rgb(255, 255, 255);
            --topbar-border:   rgb(226, 232, 243);
            --topbar-height:   3.75rem;

            /* Text */
            --text-primary:    rgb(13, 20, 37);
            --text-secondary:  rgb(90, 106, 133);
            --text-muted:      rgb(138, 155, 187);

            /* Gradients */
            --grad-blue:       linear-gradient(135deg, rgb(59, 123, 255) 0%, rgb(94, 151, 255) 100%);
            --grad-teal:       linear-gradient(135deg, rgb(0, 194, 168) 0%, rgb(0, 168, 150) 100%);
            --grad-orange:     linear-gradient(135deg, rgb(255, 122, 61) 0%, rgb(255, 90, 31) 100%);
            --grad-purple:     linear-gradient(135deg, rgb(124, 92, 255) 0%, rgb(155, 125, 255) 100%);

            /* Typography */
            --font-arabic:     'Cairo', 'system-ui', sans-serif;
            --font-latin:      'Inter', 'system-ui', sans-serif;

            /* Animation */
            --ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1);
            --ease-smooth:     cubic-bezier(0.4, 0, 0.2, 1);
          }

          html, body { height: 100%; margin: 0; padding: 0; }

          body {
            font-family: var(--font-arabic);
            background: var(--main-bg);
            color: var(--text-primary);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
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
