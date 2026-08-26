import { buildCpCssVariables, renderCssVariableBlock } from "./cp-css-vars";

/**
 * Canonical, build-time-static critical CSS for the Control Panel shell
 * chrome. Rendered into the document head as a single nonced <style> element
 * so the strict CSP can govern every parser-inserted style block. The
 * template MUST remain free of any value that could vary per request.
 */
export function renderCpCriticalCss(): string {
  return `
    *, *::before, *::after { box-sizing: border-box; }

    :root {
${renderCssVariableBlock(buildCpCssVariables())}

      /* Typography */
      --font-arabic:     var(--font-cairo), 'system-ui', sans-serif;
      --font-latin:      var(--font-inter), 'system-ui', sans-serif;
    }

    html, body { height: 100%; margin: 0; padding: 0; }

    body {
      font-family: var(--font-arabic);
      background: var(--cp-main-bg);
      color: var(--cp-text-primary);
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
  `;
}
