import type { ReactNode } from "react";

export type DetailPageFrameProps = {
  readonly header?: ReactNode;
  readonly actionBar?: ReactNode;
  readonly children: ReactNode;
  readonly stateView?: ReactNode;
  readonly dir?: "ltr" | "rtl";
};

export function DetailPageFrame({
  header,
  actionBar,
  children,
  stateView,
  dir = "rtl",
}: DetailPageFrameProps) {
  return (
    <section dir={dir} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {header != null ? <div style={{ flexShrink: 0 }}>{header}</div> : null}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {stateView != null ? stateView : children}
      </div>
      {actionBar != null ? <div style={{ flexShrink: 0 }}>{actionBar}</div> : null}
    </section>
  );
}
