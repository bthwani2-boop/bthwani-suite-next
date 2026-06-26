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
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "var(--font-arabic)",
        background: "var(--main-bg, #F0F4FA)",
        color: "var(--text-primary, #0D1425)",
      }}
    >
      {serviceContext}

      {/* Top Bar */}
      <div style={{ flexShrink: 0, zIndex: 40 }}>{topBar}</div>

      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>

        {/* Sidebar */}
        <aside
          style={{
            width: "var(--sidebar-width, 15.5rem)",
            flexShrink: 0,
            overflowY: "auto",
            overflowX: "hidden",
            background: "var(--sidebar-bg, #0D1425)",
            borderInlineEnd: "1px solid var(--sidebar-border, #1A2A4A)",
            display: "flex",
            flexDirection: "column",
            scrollbarWidth: "none",
          }}
        >
          {navigation}
        </aside>

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            background: "var(--main-bg, #F0F4FA)",
            scrollbarWidth: "thin",
            scrollbarColor: "var(--card-border, #E2E8F3) transparent",
          }}
        >
          {main}
        </main>

        {/* Side Panel */}
        {sidePanel != null ? (
          <div
            style={{
              flexShrink: 0,
              overflowY: "auto",
              background: "var(--card-bg, #FFFFFF)",
              borderInlineStart: "1px solid var(--card-border, #E2E8F3)",
            }}
          >
            {sidePanel}
          </div>
        ) : null}
      </div>

      {/* Status Bar */}
      {statusBar != null ? (
        <footer
          style={{
            flexShrink: 0,
            background: "var(--topbar-bg, #FFFFFF)",
            borderTop: "1px solid var(--topbar-border, #E2E8F3)",
          }}
        >
          {statusBar}
        </footer>
      ) : null}
    </div>
  );
}
