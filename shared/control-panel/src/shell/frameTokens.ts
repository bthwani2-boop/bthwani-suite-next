import { useMemo } from "react";
import { useBThwaniAppearance } from "@bthwani/ui-kit";
import { WebStyleSheet } from "@bthwani/ui-kit/web";
export function useCpFrameTokens() { const { tokens } = useBThwaniAppearance(); return useMemo(() => { const cp = tokens.components.controlPanel; return WebStyleSheet.create({ page: { background: tokens.appBackground, color: tokens.textPrimary }, panelStart: { background: tokens.surface, borderInlineStart: `1px solid ${tokens.glassBorder}` }, panelEnd: { background: tokens.surface, borderInlineEnd: `1px solid ${tokens.glassBorder}` }, chartSurface: { background: cp.chartSurface }, auditPanel: { borderInlineStart: `3px solid ${cp.auditIndicator}` } }); }, [tokens]); }
