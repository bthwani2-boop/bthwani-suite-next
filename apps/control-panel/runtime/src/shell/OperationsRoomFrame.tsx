import type { ReactNode } from "react";

export type OperationsRoomFrameProps = {
  readonly header?: ReactNode;
  readonly children: ReactNode;
  readonly sidePanel?: ReactNode;
  readonly statusBar?: ReactNode;
  readonly stateView?: ReactNode;
  readonly dir?: "ltr" | "rtl";
};

export function OperationsRoomFrame({
  header,
  children,
  sidePanel,
  statusBar,
  stateView,
  dir = "rtl",
}: OperationsRoomFrameProps) {
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
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
          {stateView != null ? stateView : children}
        </div>
        {sidePanel != null ? (
          <div style={{
            flexShrink: 0,
            overflowY: "auto",
            borderInlineStart: "1px solid var(--dsh-card-border)",
            background: "var(--dsh-card-bg)",
          }}>
            {sidePanel}
          </div>
        ) : null}
      </div>
      {statusBar != null ? (
        <div style={{
          flexShrink: 0,
          padding: "0.5rem 1.5rem",
          background: "var(--dsh-card-bg)",
          borderTop: "1px solid var(--dsh-card-border)",
          fontSize: "0.8125rem",
          color: "var(--dsh-text-muted)",
        }}>
          {statusBar}
        </div>
      ) : null}
    </section>
  );
}
