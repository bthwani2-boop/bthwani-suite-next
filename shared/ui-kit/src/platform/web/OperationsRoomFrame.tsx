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
      {header != null ? <div style={{ flexShrink: 0 }}>{header}</div> : null}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {stateView != null ? stateView : children}
        </div>
        {sidePanel != null ? (
          <div style={{ flexShrink: 0, overflowY: "auto" }}>{sidePanel}</div>
        ) : null}
      </div>
      {statusBar != null ? <div style={{ flexShrink: 0 }}>{statusBar}</div> : null}
    </section>
  );
}
