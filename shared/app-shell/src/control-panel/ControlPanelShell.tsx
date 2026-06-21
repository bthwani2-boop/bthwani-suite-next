import type { ReactNode } from "react";

export type ControlPanelShellSlots = {
  readonly navigation: ReactNode;
  readonly topBar: ReactNode;
  readonly serviceContext?: ReactNode;
  readonly main: ReactNode;
  readonly sidePanel?: ReactNode;
  readonly statusBar?: ReactNode;
};

export type ControlPanelShellProps = ControlPanelShellSlots & {
  readonly dir?: "ltr" | "rtl";
};

export function ControlPanelShell({
  navigation,
  topBar,
  serviceContext,
  main,
  sidePanel,
  statusBar,
  dir = "rtl",
}: ControlPanelShellProps) {
  return (
    <div
      dir={dir}
      style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}
    >
      {serviceContext}
      <div style={{ flexShrink: 0 }}>{topBar}</div>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ flexShrink: 0, overflowY: "auto" }}>{navigation}</div>
        <main style={{ flex: 1, overflowY: "auto" }}>{main}</main>
        {sidePanel != null ? (
          <div style={{ flexShrink: 0, overflowY: "auto" }}>{sidePanel}</div>
        ) : null}
      </div>
      {statusBar != null ? (
        <footer style={{ flexShrink: 0 }}>{statusBar}</footer>
      ) : null}
    </div>
  );
}
