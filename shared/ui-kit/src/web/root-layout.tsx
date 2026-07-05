"use client";

import { type ReactNode } from 'react';
import { RootProviders, type RootProvidersProps } from '../providers';
import { buildWebThemeStyleSheet, directionConfig, resolveDirectionFromLanguage, type ThemeMode } from '../foundation';
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

/* compatibility: accept both old and new root class names so styles continue to apply */
body.bth-web-root-body, body.ui-web-root-body, html, #__next {
  margin: 0;
  height: 100%;
  min-height: 100vh;
  background: var(--bthwani-background);
  color: var(--bthwani-text);
  font-family: var(--bth-font-family-latin), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow-x: hidden;
}
`;

function buildStoredLanguageBootstrapScript(appName: string | undefined, defaultThemeMode: ThemeMode) {
  const appearanceStorageKey = getBThwaniAppearanceStorageKey(appName ?? 'global');
  const appearanceCookieKey = getBThwaniAppearanceCookieKey(appName ?? 'global');
  const defaultAppearanceThemeMode = getBThwaniAppearanceThemeMode(defaultBThwaniAppearanceMode);
  const fallbackThemeMode = defaultThemeMode === 'dark' || defaultThemeMode === 'high-contrast'
    ? defaultThemeMode
    : defaultAppearanceThemeMode;

  return `
(function () {
  try {
    var key = '${directionConfig.languageStorageKey}';
    var stored = window.localStorage ? window.localStorage.getItem(key) : null;
    if (stored === 'ar' || stored === 'en') {
      document.documentElement.lang = stored;
      document.documentElement.dir = stored === 'ar' ? 'rtl' : 'ltr';
    }
  } catch (error) {}

  try {
    var appearanceKey = '${appearanceStorageKey}';
    var appearanceCookieKey = '${appearanceCookieKey}';
    var storedAppearanceMode = window.localStorage ? window.localStorage.getItem(appearanceKey) : null;
    var cookieAppearanceMode = null;
    if (typeof document.cookie === 'string' && document.cookie.length > 0) {
      var cookiePrefix = appearanceCookieKey + '=';
      var cookieEntry = document.cookie.split('; ').find(function (entry) { return entry.indexOf(cookiePrefix) === 0; });
      cookieAppearanceMode = cookieEntry ? cookieEntry.slice(cookiePrefix.length) : null;
    }
    var appearanceMode = storedAppearanceMode === 'lightPremium' || storedAppearanceMode === 'darkGlass'
      ? storedAppearanceMode
      : cookieAppearanceMode;
    var resolvedThemeMode = '${fallbackThemeMode}';
    if (appearanceMode === 'lightPremium') {
      resolvedThemeMode = 'light';
    } else if (appearanceMode === 'darkGlass') {
      resolvedThemeMode = 'dark';
    }

    document.documentElement.setAttribute('data-bth-root', 'true');
    document.documentElement.setAttribute('data-bth-theme', resolvedThemeMode);
    document.documentElement.setAttribute('data-ui-theme', resolvedThemeMode);
    document.documentElement.style.colorScheme = resolvedThemeMode === 'dark' ? 'dark' : 'light';

    var syncBody = function () {
      if (!document.body) {
        return;
      }
      document.body.setAttribute('data-bth-root', 'true');
      document.body.setAttribute('data-bth-theme', resolvedThemeMode);
      document.body.setAttribute('data-ui-theme', resolvedThemeMode);
    };

    syncBody();
    document.addEventListener('DOMContentLoaded', syncBody, { once: true });
  } catch (error) {}
})();
`.trim();
}

export function WebThemeStyle() {
  const themeStyles = buildWebThemeStyleSheet('[data-ui-root="true"], [data-bth-root="true"]');
  const combined = `${webRootBodyCss}\n${themeStyles}`;

  return (
    <style
      id="ui-kit-theme-root"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: combined }}
    />
  );
}

export type WebRootLayoutProps = RootProvidersProps & {
  children: ReactNode;
  appName?: string;
};

export function buildWebRootMetadata({ appName, lang = 'ar', dir = 'rtl' }: { appName?: string | undefined; lang?: string | undefined; dir?: 'ltr' | 'rtl' | undefined; }) {
  return {
    title: appName ? appName : 'Control Panel',
    appName,
    lang,
    dir,
  };
}

export function WebRootBody({
  children,
  appName,
  themeMode = 'light',
}: {
  children: ReactNode;
  appName?: string | undefined;
  themeMode?: ThemeMode | undefined;
}) {
  return (
    <body
      className="ui-web-root-body"
      data-ui-app={appName}
      data-ui-root="true"
      data-bth-root="true"
      data-ui-theme={themeMode}
      data-bth-theme={themeMode}
    >
      {children}
    </body>
  );
}

export function WebDocumentShell({
  children,
  appName,
  lang = directionConfig.defaultLanguage,
  dir = resolveDirectionFromLanguage(directionConfig.defaultLanguage),
  themeMode = 'light',
}: {
  children: ReactNode;
  appName?: string | undefined;
  lang?: string | undefined;
  dir?: 'ltr' | 'rtl' | undefined;
  themeMode?: ThemeMode | undefined;
}) {
  const themeStyles = buildWebThemeStyleSheet('[data-ui-root="true"], [data-bth-root="true"]');
  const combinedCss = `${webRootBodyCss}\n${themeStyles}`;

  // NOTE: We use dangerouslySetInnerHTML on the head tag to include the bootstrap script
  // and initial styles. This bypasses React 19's strict check for <script> tags inside
  // components while ensuring the script runs synchronously before the first paint.
  const headHtml = `
    <script id="language-bootstrap">${buildStoredLanguageBootstrapScript(appName, themeMode)}</script>
    <style id="ui-kit-theme-root">${combinedCss}</style>
  `.trim();

  return (
    <html
      suppressHydrationWarning
      lang={lang}
      dir={dir}
      data-ui-app={appName}
      data-bth-root="true"
      data-bth-theme={themeMode}
      data-ui-theme={themeMode}
    >
      <head suppressHydrationWarning dangerouslySetInnerHTML={{ __html: headHtml }} />
      {children}
    </html>
  );
}

export function WebRootLayout({ children, appName, ...rootProps }: WebRootLayoutProps) {
  const webRootMetadata = buildWebRootMetadata({
    appName,
    lang: rootProps.language,
    dir: resolveDirectionFromLanguage(rootProps.language),
  });
  const resolvedThemeMode = rootProps.themeMode ?? 'light';

  return (
    <WebDocumentShell
      appName={webRootMetadata.appName}
      lang={webRootMetadata.lang}
      dir={webRootMetadata.dir}
      themeMode={resolvedThemeMode}
    >
      <WebRootBody appName={webRootMetadata.appName} themeMode={resolvedThemeMode}>
        <RootProviders {...rootProps} themeMode={resolvedThemeMode}>{children}</RootProviders>
      </WebRootBody>
    </WebDocumentShell>
  );
}
