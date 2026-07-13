import type { CSSProperties, ReactNode } from "react";
import { useBThwaniAppearance, getBThwaniGlassRecipe, useBThwaniAppearanceContext } from "@bthwani/ui-kit";
import { WebStyleSheet } from "@bthwani/ui-kit/web";

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
  // Appearance-driven glass recipe for the top bar chrome
  const appearance = useBThwaniAppearance();
  const appearanceCtx = useBThwaniAppearanceContext();
  const glassMode = appearanceCtx?.mode ?? appearance.mode;
  const glass = getBThwaniGlassRecipe(glassMode, "surface");

  const topBarStyle: CSSProperties = {
    backdropFilter: glassMode === "darkGlass" ? "blur(20px)" : undefined,
    WebkitBackdropFilter: glassMode === "darkGlass" ? "blur(20px)" : undefined,
    background: glass.backgroundColor ?? "var(--topbar-bg, rgb(255, 255, 255))",
    borderBottom: `1px solid ${glass.borderColor ?? "var(--topbar-border, rgb(226, 232, 243))"}`,
  };

  return (
    <div dir={dir} style={styles.container}>
      {serviceContext}

      {/* Top Bar — appearance-driven glass chrome */}
      <div style={{ ...styles.topBar, ...topBarStyle }}>{topBar}</div>

      <div style={styles.body}>

        {/* Sidebar */}
        <aside style={styles.sidebar}>
          {navigation}
        </aside>

        {/* Main Content */}
        <main style={styles.main}>
          {main}
        </main>

        {/* Side Panel */}
        {sidePanel != null ? (
          <div style={styles.sidePanel}>
            {sidePanel}
          </div>
        ) : null}
      </div>

      {/* Status Bar */}
      {statusBar != null ? (
        <footer style={styles.footer}>
          {statusBar}
        </footer>
      ) : null}
    </div>
  );
}

const styles = WebStyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
    fontFamily: "var(--font-arabic)",
    background: "var(--main-bg, rgb(240, 244, 250))",
    color: "var(--text-primary, rgb(13, 20, 37))",
  },
  topBar: {
    flexShrink: 0,
    zIndex: 40,
  },
  body: {
    display: "flex",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  sidebar: {
    width: "var(--sidebar-width, 15.5rem)",
    flexShrink: 0,
    overflowY: "auto",
    overflowX: "hidden",
    background: "var(--sidebar-bg, rgb(13, 20, 37))",
    borderInlineEnd: "1px solid var(--sidebar-border, rgb(26, 42, 74))",
    display: "flex",
    flexDirection: "column",
    scrollbarWidth: "none",
  },
  main: {
    flex: 1,
    minWidth: 0,
    overflowY: "auto",
    background: "var(--main-bg, rgb(240, 244, 250))",
    scrollbarWidth: "thin",
    scrollbarColor: "var(--card-border, rgb(226, 232, 243)) transparent",
  },
  sidePanel: {
    flexShrink: 0,
    overflowY: "auto",
    background: "var(--card-bg, rgb(255, 255, 255))",
    borderInlineStart: "1px solid var(--card-border, rgb(226, 232, 243))",
  },
  footer: {
    flexShrink: 0,
    background: "var(--topbar-bg, rgb(255, 255, 255))",
    borderTop: "1px solid var(--topbar-border, rgb(226, 232, 243))",
  },
});
