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
      {header != null && <div style={{ flexShrink: 0 }}>{header}</div>}
      {toolbar != null && <div style={{ flexShrink: 0 }}>{toolbar}</div>}
      {filters != null && <div style={{ flexShrink: 0 }}>{filters}</div>}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
          {stateView ?? children}
        </div>
        {sidePanel != null && (
          <aside
            style={{
              width: "22rem",
              flexShrink: 0,
              borderInlineStart: "1px solid rgba(0, 0, 0, 0.1)",
              overflowY: "auto",
            }}
          >
            {sidePanel}
          </aside>
        )}
      </div>
    </section>
  );
}
