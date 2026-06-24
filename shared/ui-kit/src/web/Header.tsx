import type { ReactNode } from "react";
import { lightThemeColors } from "../tokens/colors";

export type HeaderProps = {
  readonly title: string;
  readonly subtitle?: string;
  readonly leading?: ReactNode;
  readonly actions?: ReactNode;
};

export function Header({ title, subtitle, leading, actions }: HeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: "3.5rem",
        padding: "0.75rem 1rem",
        borderBottom: `1px solid ${lightThemeColors.borderColor}`,
        gap: "0.75rem",
      }}
    >
      {leading}
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, lineHeight: 1.3 }}>{title}</h2>
        {subtitle ? <p style={{ margin: "0.125rem 0 0", fontSize: "0.8125rem", opacity: 0.65 }}>{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}
