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
        background: "var(--main-bg, rgb(240, 244, 250))",
        color: "var(--text-primary, rgb(13, 20, 37))",
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
            background: "var(--sidebar-bg, rgb(13, 20, 37))",
            borderInlineEnd: "1px solid var(--sidebar-border, rgb(26, 42, 74))",
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
            background: "var(--main-bg, rgb(240, 244, 250))",
            scrollbarWidth: "thin",
            scrollbarColor: "var(--card-border, rgb(226, 232, 243)) transparent",
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
              background: "var(--card-bg, rgb(255, 255, 255))",
              borderInlineStart: "1px solid var(--card-border, rgb(226, 232, 243))",
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
            background: "var(--topbar-bg, rgb(255, 255, 255))",
            borderTop: "1px solid var(--topbar-border, rgb(226, 232, 243))",
          }}
        >
          {statusBar}
        </footer>
      ) : null}
    </div>
  );
}
