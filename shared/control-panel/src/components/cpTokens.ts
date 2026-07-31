import type { CSSProperties } from "react";
import { useMemo } from "react";
import { alpha, useBThwaniAppearance } from "@bthwani/ui-kit";
import { WebStyleSheet } from "@bthwani/ui-kit/web";
import { cpElevation, cpRadius, cpSpace, cpType } from "./cpScale";

export type CpAppearanceTokens = ReturnType<typeof useBThwaniAppearance>["tokens"];
type CpAppearanceShadow = CpAppearanceTokens["shadowSoft"];
export function shadowToBoxShadow(shadow: CpAppearanceShadow): string { const { shadowOffset, shadowRadius, shadowColor, shadowOpacity } = shadow; return `${shadowOffset.width}px ${shadowOffset.height}px ${shadowRadius}px ${alpha(shadowColor, shadowOpacity)}`; }
export function useCpTokens() {
  const { tokens, mode } = useBThwaniAppearance();
  const styles = useMemo(() => {
    const cp = tokens.components.controlPanel; const input = tokens.components.inputs;
    const inputBase: CSSProperties = { minHeight: "2.75rem", padding: `${cpSpace[2]} ${cpSpace[3]}`, border: `1px solid ${input.border}`, borderRadius: cpRadius.md, background: input.background, color: tokens.textPrimary, fontSize: cpType.body.fontSize };
    return WebStyleSheet.create({
      select: { ...inputBase, cursor: "pointer" }, searchInput: { ...inputBase, cursor: "text" }, searchWide: { minWidth: "14rem" }, textInput: { ...inputBase, width: "100%", cursor: "text" },
      table: { width: "100%", borderCollapse: "collapse", fontSize: cpType.body.fontSize },
      tableHeaderCell: { padding: `${cpSpace[2]} ${cpSpace[3]}`, textAlign: "start", fontWeight: 600, background: cp.tableHeader, color: tokens.textPrimary, borderBottom: `2px solid ${tokens.borderStrong}`, whiteSpace: "nowrap" },
      tableCell: { padding: `${cpSpace[2]} ${cpSpace[3]}`, background: cp.tableRow, color: tokens.textPrimary, borderBottom: `1px solid ${tokens.border}`, verticalAlign: "middle" },
      kpiCard: { display: "flex", flexDirection: "column", gap: cpSpace[1], minWidth: "9rem", padding: `${cpSpace[3]} ${cpSpace[4]}`, border: `1px solid ${cp.kpiBorder}`, borderRadius: cpRadius.lg, background: cp.kpiSurface, boxShadow: cpElevation.raised },
      kpiValue: { fontSize: cpType.display.fontSize, fontWeight: 700, lineHeight: 1, color: tokens.textPrimary }, kpiLabel: { fontSize: cpType.caption.fontSize, opacity: 0.65, color: tokens.textMuted }, kpiStrip: { display: "flex", gap: cpSpace[6], padding: `${cpSpace[3]} 0`, flexWrap: "wrap" },
      pageHeader: { padding: `${cpSpace[4]} ${cpSpace[4]} 0` }, pageHeaderTitle: { margin: `0 0 ${cpSpace[2]}`, fontSize: cpType.title.fontSize, fontWeight: 700, color: tokens.textPrimary },
      filterBar: { display: "flex", flexWrap: "wrap", gap: cpSpace[3], padding: `${cpSpace[2]} ${cpSpace[4]}`, alignItems: "center", background: cp.filterSurface, borderRadius: cpRadius.md },
      statePanel: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: `${cpSpace[8]} ${cpSpace[4]}`, gap: cpSpace[2], textAlign: "center", minHeight: "12rem", borderRadius: cpRadius.lg }, statePanelAlert: { background: cp.warningPanelSurface, border: `1px solid ${cp.warningPanelBorder}` },
      statePanelTitle: { fontSize: cpType.subtitle.fontSize, color: tokens.textPrimary }, statePanelDesc: { fontSize: cpType.body.fontSize, opacity: 0.65, color: tokens.textMuted }, statePanelCode: { fontSize: cpType.caption.fontSize, opacity: 0.75, fontFamily: "monospace", wordBreak: "break-all", maxWidth: "32rem", color: tokens.textMuted },
      retryButton: { marginTop: cpSpace[3], padding: `0.375rem ${cpSpace[4]}`, border: `1px solid ${tokens.accent}`, borderRadius: cpRadius.sm, background: "transparent", cursor: "pointer", fontSize: cpType.body.fontSize, color: tokens.accent },
      emptyTableMessage: { padding: `${cpSpace[6]} ${cpSpace[4]}`, fontSize: cpType.body.fontSize, opacity: 0.65, color: tokens.textMuted }, selectableTableRow: { cursor: "pointer", background: cp.tableRow }, selectableTableRowHover: { background: cp.tableRowHover }, selectableTableRowSelected: { background: cp.tableRowSelected, boxShadow: `inset 0 0 0 2px ${tokens.glassBorder}` },
      inlineCode: { fontSize: cpType.caption.fontSize, fontFamily: "monospace", color: tokens.textPrimary }, mutedInline: { marginInlineStart: "0.375rem", opacity: 0.55, color: tokens.textMuted },
      detailPanel: { padding: cpSpace[4], height: "100%", background: tokens.surface }, detailPanelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: cpSpace[4] }, detailPanelTitle: { margin: 0, fontSize: cpType.body.fontSize, fontWeight: 600, color: tokens.textPrimary }, detailPanelCloseButton: { background: "none", border: "none", cursor: "pointer", fontSize: cpType.title.fontSize, lineHeight: 1, color: tokens.textMuted }, detailMessage: { opacity: 0.65, color: tokens.textMuted }, detailErrorTitle: { marginBottom: cpSpace[2], color: tokens.danger }, detailErrorCode: { fontSize: cpType.caption.fontSize, opacity: 0.7, fontFamily: "monospace", wordBreak: "break-all", color: tokens.textMuted },
      descriptionList: { margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }, descriptionRow: { display: "flex", flexDirection: "column", gap: "0.125rem" }, descriptionRowLabel: { fontSize: cpType.caption.fontSize, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.55, color: tokens.textMuted }, descriptionRowValue: { margin: 0, fontSize: cpType.body.fontSize, color: tokens.textPrimary }, externalLink: { wordBreak: "break-all", fontSize: cpType.label.fontSize, color: tokens.accent }, amountDisplay: { fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum"' },
    });
  }, [tokens]);
  return { tokens, mode, styles };
}
