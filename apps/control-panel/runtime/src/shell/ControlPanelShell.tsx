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
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--dsh-content-bg)",
        color: "var(--dsh-text-primary)",
        fontFamily: "var(--font-arabic)",
      }}
    >
      {/* Dark sidebar — full height, appears on the inline-end in RTL */}
      <aside
        style={{
          width: "var(--dsh-sidebar-width)",
          flexShrink: 0,
          background: "var(--dsh-sidebar-bg)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          boxShadow: "var(--dsh-sidebar-shadow)",
          zIndex: 20,
          position: "relative",
        }}
      >
        {navigation}
      </aside>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {serviceContext}

        {/* TopBar */}
        <div style={{ flexShrink: 0, zIndex: 10, position: "relative" }}>
          {topBar}
        </div>

        {/* Scrollable main + optional side panel */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
          <main
            style={{
              flex: 1,
              minWidth: 0,
              overflowY: "auto",
              background: "var(--dsh-content-bg)",
            }}
          >
            {main}
          </main>

          {sidePanel != null ? (
            <div
              style={{
                flexShrink: 0,
                overflowY: "auto",
                borderInlineStart: "1px solid var(--dsh-card-border)",
                background: "var(--dsh-card-bg)",
              }}
            >
              {sidePanel}
            </div>
          ) : null}
        </div>

        {statusBar != null ? (
          <footer
            style={{
              flexShrink: 0,
              borderTop: "1px solid var(--dsh-card-border)",
              background: "var(--dsh-card-bg)",
            }}
          >
            {statusBar}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
