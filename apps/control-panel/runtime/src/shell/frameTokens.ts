import { useMemo } from "react";
import { useBThwaniAppearance } from "@bthwani/ui-kit";
import { WebStyleSheet } from "@bthwani/ui-kit/web";

/**
 * Shared appearance-token styles for `shell/*Frame.tsx` page-layout
 * components. Keeps page backgrounds, panel borders, and chart/audit
 * treatments in one place so all archetype frames recolor together when
 * the appearance mode (lightPremium / darkGlass) changes.
 */
export function useCpFrameTokens() {
  const { tokens } = useBThwaniAppearance();

  return useMemo(() => {
    const cp = tokens.components.controlPanel;
    return WebStyleSheet.create({
      page: {
        background: tokens.appBackground,
        color: tokens.textPrimary,
      },
      panelStart: {
        background: tokens.surface,
        borderInlineStart: `1px solid ${tokens.glassBorder}`,
      },
      panelEnd: {
        background: tokens.surface,
        borderInlineEnd: `1px solid ${tokens.glassBorder}`,
      },
      chartSurface: {
        background: cp.chartSurface,
      },
      auditPanel: {
        borderInlineStart: `3px solid ${cp.auditIndicator}`,
      },
    });
  }, [tokens]);
}
