import type { ReactNode } from "react";

export type DataTablePageFrameProps = {
  readonly header?: ReactNode;
  readonly toolbar?: ReactNode;
  readonly filters?: ReactNode;
  readonly children: ReactNode;
  readonly stateView?: ReactNode;
  readonly sidePanel?: ReactNode;
  readonly dir?: "ltr" | "rtl";
};

export function DataTablePageFrame({
  header,
  toolbar,
  filters,
  children,
  stateView,
  sidePanel,
  dir = "rtl",
}: DataTablePageFrameProps) {
  return (
    <section dir={dir} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {header != null && (
        <div style={{
          flexShrink: 0,
          padding: "1rem 1.5rem",
          background: "var(--dsh-card-bg)",
          borderBottom: "1px solid var(--dsh-card-border)",
        }}>
          {header}
        </div>
      )}
      {toolbar != null && (
        <div style={{
          flexShrink: 0,
          padding: "0.625rem 1.5rem",
          background: "var(--dsh-card-bg)",
          borderBottom: "1px solid var(--dsh-card-border)",
        }}>
          {toolbar}
        </div>
      )}
      {filters != null && (
        <div style={{
          flexShrink: 0,
          padding: "0.625rem 1.5rem",
          background: "var(--dsh-card-bg)",
          borderBottom: "1px solid var(--dsh-card-border)",
        }}>
          {filters}
        </div>
      )}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: "1.25rem 1.5rem" }}>
          {stateView ?? children}
        </div>
        {sidePanel != null && (
          <aside style={{
            width: "22rem",
            flexShrink: 0,
            borderInlineStart: "1px solid var(--dsh-card-border)",
            background: "var(--dsh-card-bg)",
            overflowY: "auto",
          }}>
            {sidePanel}
          </aside>
        )}
      </div>
    </section>
  );
}
