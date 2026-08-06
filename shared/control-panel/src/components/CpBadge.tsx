import type { ReactNode } from "react";
import { cpRadius, cpSpace, cpType } from "./cpScale";
import { useCpTokens } from "./cpTokens";

/**
 * CpBadge — status/tone indicator driven by the shared appearance token
 * badge set. Replaces screen-local badge color hacks (e.g. string-concatenated
 * alpha hex) with a single token-driven implementation.
 */
export type CpBadgeTone = "neutral" | "brand" | "promo" | "premium" | "success" | "warning" | "danger" | "info";

export function CpBadge({ tone = "neutral", children }: { readonly tone?: CpBadgeTone; readonly children: ReactNode }) {
  const { tokens } = useCpTokens();
  const state = tokens.components.badges[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: cpSpace[1],
        padding: `0.125rem ${cpSpace[2]}`,
        borderRadius: cpRadius.pill,
        fontSize: cpType.caption.fontSize,
        fontWeight: 600,
        lineHeight: 1.6,
        backgroundColor: state.backgroundColor,
        border: `1px solid ${state.borderColor}`,
        color: state.textColor,
      }}
    >
      {children}
    </span>
  );
}
