/**
 * tools/performance/web/lighthouserc.cjs
 *
 * BTHWANI_PERFORMANCE_GOVERNANCE_GATE — Lighthouse CI Configuration
 *
 * Usage:
 *   cd apps/control-panel/runtime
 *   pnpm run build
 *   pnpm exec lhci autorun
 *
 * Or via CI: uses the performance.yml workflow which runs lhci autorun.
 * Budgets sourced from tools/performance/performance-budgets.json web section:
 *   lighthouse_performance_min: 85
 *   lighthouse_accessibility_min: 90
 *   lighthouse_lcp_max_ms: 2500
 */

"use strict";

module.exports = {
  ci: {
    collect: {
      // Build & serve using Next.js static export or start server
      startServerCommand: "pnpm run start",
      startServerReadyPattern: "ready",
      startServerReadyTimeout: 30000,
      url: [
        "http://localhost:3000",
        "http://localhost:3000/login",
      ],
      numberOfRuns: 2,
      settings: {
        // Simulate a mid-tier device
        throttlingMethod: "simulate",
        preset: "desktop",
        onlyCategories: ["performance", "accessibility", "best-practices"],
      },
    },

    assert: {
      assertions: {
        // Performance: >= 85 score
        "categories:performance": ["error", { minScore: 0.85 }],
        // Accessibility: >= 90 score
        "categories:accessibility": ["warn", { minScore: 0.90 }],
        // Core Web Vitals
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "first-contentful-paint": ["warn", { maxNumericValue: 1800 }],
        // No blocking resources in critical path
        "render-blocking-resources": ["warn", { maxLength: 0 }],
        // Images must have explicit width/height
        "unsized-images": ["warn", { maxLength: 0 }],
        // No unused JS > 150KB
        "unused-javascript": ["warn", { maxLength: 0 }],
      },
    },

    upload: {
      // Upload to temporary public storage for PR comments
      target: "temporary-public-storage",
    },
  },
};
