import type { ReactNode } from "react";

export type MetricsPageFrameProps = {
  readonly header?: ReactNode;
  readonly toolbar?: ReactNode;
  readonly summary?: ReactNode;
  readonly children: ReactNode;
  readonly stateView?: ReactNode;
  readonly dir?: "ltr" | "rtl";
};

export function MetricsPageFrame({
  header,
  toolbar,
  summary,
  children,
  stateView,
  dir = "rtl",
}: MetricsPageFrameProps) {
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
      {toolbar != null ? (
        <div style={{
          flexShrink: 0,
          padding: "0.625rem 1.5rem",
          background: "var(--dsh-card-bg)",
          borderBottom: "1px solid var(--dsh-card-border)",
        }}>
          {toolbar}
        </div>
      ) : null}
      {summary != null ? (
        <div style={{
          flexShrink: 0,
          padding: "1rem 1.5rem",
          background: "var(--dsh-card-bg)",
          borderBottom: "1px solid var(--dsh-card-border)",
        }}>
          {summary}
        </div>
      ) : null}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
        {stateView != null ? stateView : children}
      </div>
    </section>
  );
}
