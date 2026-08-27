"use client";

import { type ReactNode } from 'react';
import { tamaguiConfig } from '../tamagui-config';
import { RootProviders, type RootProvidersProps } from '../providers';
import {
  buildWebThemeStyleSheet,
  directionConfig,
  resolveDirectionFromLanguage,
  type ThemeMode,
} from '../foundation';
import {
  defaultBThwaniAppearanceMode,
  getBThwaniAppearanceCookieKey,
  getBThwaniAppearanceStorageKey,
  getBThwaniAppearanceThemeMode,
} from '../appearance';

const webRootBodyCss = `
html {
  color-scheme: var(--bthwani-color-scheme, light);
  background: var(--bthwani-background);
  height: 100%;
  min-height: 100vh;
}

html, #__next {
  margin: 0;
  height: 100%;
  min-height: 100vh;
  background: var(--bthwani-background);
  color: var(--bthwani-text);
  font-family: var(--bth-font-family-latin), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow-x: hidden;
}

/* The root owns the baseline for every web surface. Individual panes may
   override geometry, but they inherit one accessible visual contract. */
html, #__next {
  scrollbar-width: thin;
  scrollbar-color: var(--bthwani-line) transparent;
}

html::-webkit-scrollbar,
#__next::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

html::-webkit-scrollbar-track,
#__next::-webkit-scrollbar-track {
  background: transparent;
}

html::-webkit-scrollbar-thumb,
#__next::-webkit-scrollbar-thumb {
  background: var(--bthwani-line-strong);
  border: 2px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
}

:where(button, a[href], input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--bthwani-focus-ring);
  outline-offset: 2px;
}

.ui-resize-none {
  resize: none;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
`;

/**
 * Single governed critical-style producer for the web lane.
 *
 * The new contract (per objective CU-E-CONTROL-PANEL-CSP-EXECUTION-BOUNDARY):
 *   - Every parser-inserted <style> we own carries the per-request CSP nonce
 *     so the strict `style-src 'self' 'nonce-…'` policy accepts it.
 *   - Tamagui's own TamaguiProvider is mounted with `disableInjectCSS`, so
 *     its `config.getCSS()` block is re-emitted here, under the same nonce,
 *     instead of being injected without one.
 *   - Tamagui runtime atomic rule insertion continues to use CSSOM
 *     `insertRule` against an empty <style> element, which CSP does not
 *     regulate, so theme/tokens keep working at runtime.
 *
 * The `nonce` prop MUST be supplied by the server layout (control-panel reads
 * the request header `x-bthwani-csp-nonce` set by `apps/control-panel/
 * runtime/src/middleware.ts`). During dev, Next's HMR also injects style
 * content; the dev CSP widens `style-src` to include 'unsafe-inline'.
 */
export function WebThemeStyle({ nonce }: { nonce?: string }) {
  const themeStyles = buildWebThemeStyleSheet('[data-ui-root="true"], [data-bth-root="true"]');
  const tamaguiBaseCss = tamaguiConfig.getCSS();
  const combined = `${webRootBodyCss}\n${themeStyles}\n${tamaguiBaseCss}`;

  return (
    <style
      id="ui-kit-theme-root"
      suppressHydrationWarning
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: combined }}
    />
  );
}

export type WebRootLayoutProps = RootProvidersProps & {
  children: ReactNode;
  appName?: string;
};
