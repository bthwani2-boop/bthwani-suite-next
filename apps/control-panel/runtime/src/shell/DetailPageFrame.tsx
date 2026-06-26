import type { ReactNode } from "react";

export type DetailPageFrameProps = {
  readonly header?: ReactNode;
  readonly actionBar?: ReactNode;
  readonly children: ReactNode;
  readonly stateView?: ReactNode;
  readonly dir?: "ltr" | "rtl";
};

export function DetailPageFrame({
  header,
  actionBar,
  children,
  stateView,
  dir = "rtl",
}: DetailPageFrameProps) {
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
      <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
        {stateView != null ? stateView : children}
      </div>
      {actionBar != null ? (
        <div style={{
          flexShrink: 0,
          padding: "0.75rem 1.5rem",
          background: "var(--dsh-card-bg)",
          borderTop: "1px solid var(--dsh-card-border)",
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
        }}>
          {actionBar}
        </div>
      ) : null}
    </section>
  );
}
