import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import { WebThemeStyle } from "@bthwani/ui-kit/web";
import {
  alpha,
  dshAccentTeal,
  dshAccentTealDeep,
  dshBlue,
  dshBlueBright,
  dshCardBg,
  dshCardBorder,
  dshMainBg,
  dshNavy,
  dshNavyLight,
  dshNavyMid,
  dshOrange,
  dshOrangeDeeper,
  dshPurple,
  dshPurpleDeep,
  dshSidebarBorder,
  dshSidebarText,
  dshSidebarTextActive,
  dshTextMuted,
  dshTextPrimary,
  dshTextSecondary,
  dshTopbarBg,
  dshTopbarBorder,
} from "../theme/dsh-colors";

export const metadata: Metadata = {
  title: "لوحة التحكم — DSH",
  description: "منصة DSH — لوحة التحكم الإدارية",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-bth-root="true" data-ui-root="true" data-bth-theme="light" data-ui-theme="light">
      <head>
        <WebThemeStyle />
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
            --dsh-navy:        ${dshNavy};
            --dsh-navy-mid:    ${dshNavyMid};
            --dsh-navy-light:  ${dshNavyLight};
            --dsh-blue:        ${dshBlue};
            --dsh-blue-glow:   ${alpha(dshBlue, 0.2)};
            --dsh-blue-bright: ${dshBlueBright};
            --dsh-accent-teal: ${dshAccentTeal};

            /* Sidebar */
            --sidebar-bg:      var(--dsh-navy);
            --sidebar-hover:   var(--dsh-navy-mid);
            --sidebar-active:  var(--dsh-navy-light);
            --sidebar-text:    ${dshSidebarText};
            --sidebar-text-active: ${dshSidebarTextActive};
            --sidebar-border:  ${dshSidebarBorder};
            --sidebar-width:   15.5rem;

            /* Main content */
            --main-bg:         ${dshMainBg};
            --card-bg:         ${dshCardBg};
            --card-border:     ${dshCardBorder};
            --card-shadow:     0 1px 3px ${alpha(dshTextPrimary, 0.07)}, 0 4px 16px ${alpha(dshTextPrimary, 0.06)};
            --card-shadow-hover: 0 8px 32px ${alpha(dshBlue, 0.15)}, 0 2px 8px ${alpha(dshTextPrimary, 0.1)};

            /* Topbar */
            --topbar-bg:       ${dshTopbarBg};
            --topbar-border:   ${dshTopbarBorder};
            --topbar-height:   3.75rem;

            /* Text */
            --text-primary:    ${dshTextPrimary};
            --text-secondary:  ${dshTextSecondary};
            --text-muted:      ${dshTextMuted};

            /* Gradients */
            --grad-blue:       linear-gradient(135deg, ${dshBlue} 0%, ${dshBlueBright} 100%);
            --grad-teal:       linear-gradient(135deg, ${dshAccentTeal} 0%, ${dshAccentTealDeep} 100%);
            --grad-orange:     linear-gradient(135deg, ${dshOrange} 0%, ${dshOrangeDeeper} 100%);
            --grad-purple:     linear-gradient(135deg, ${dshPurple} 0%, ${dshPurpleDeep} 100%);

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
