import type { ReactNode } from "react";

export type SettingsPageFrameProps = {
  readonly header?: ReactNode;
  readonly nav?: ReactNode;
  readonly children: ReactNode;
  readonly stateView?: ReactNode;
  readonly dir?: "ltr" | "rtl";
};

export function SettingsPageFrame({
  header,
  nav,
  children,
  stateView,
  dir = "rtl",
}: SettingsPageFrameProps) {
  return (
    <section dir={dir} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {header != null ? (
        <div style={{
          flexShrink: 0,
          padding: "1rem 1.5rem",
          background: "var(--dsh-card-bg)",
          borderBottom: "1px solid var(--dsh-card-border)",
        }}>
          {header}
        </div>
      ) : null}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {nav != null ? (
          <div style={{
            flexShrink: 0,
            overflowY: "auto",
            borderInlineEnd: "1px solid var(--dsh-card-border)",
            background: "var(--dsh-card-bg)",
            minWidth: "12rem",
          }}>
            {nav}
          </div>
        ) : null}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
          {stateView != null ? stateView : children}
        </div>
      </div>
    </section>
  );
}
