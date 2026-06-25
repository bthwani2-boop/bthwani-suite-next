import type { ReactNode } from "react";

export type OverviewPageFrameProps = {
  readonly header?: ReactNode;
  readonly toolbar?: ReactNode;
  readonly children: ReactNode;
  readonly stateView?: ReactNode;
  readonly dir?: "ltr" | "rtl";
};

export function OverviewPageFrame({
  header,
  toolbar,
  children,
  stateView,
  dir = "rtl",
}: OverviewPageFrameProps) {
  return (
    <section dir={dir} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {header != null ? <div style={{ flexShrink: 0 }}>{header}</div> : null}
      {toolbar != null ? <div style={{ flexShrink: 0 }}>{toolbar}</div> : null}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {stateView != null ? stateView : children}
      </div>
    </section>
  );
}
