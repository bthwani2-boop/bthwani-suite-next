import type { ReactNode } from "react";

export type FinanceReadOnlyFrameProps = {
  readonly header?: ReactNode;
  readonly summary?: ReactNode;
  readonly children: ReactNode;
  readonly stateView?: ReactNode;
  readonly dir?: "ltr" | "rtl";
};

export function FinanceReadOnlyFrame({
  header,
  summary,
  children,
  stateView,
  dir = "rtl",
}: FinanceReadOnlyFrameProps) {
  return (
    <section dir={dir} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {header != null ? <div style={{ flexShrink: 0 }}>{header}</div> : null}
      {summary != null ? <div style={{ flexShrink: 0 }}>{summary}</div> : null}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {stateView != null ? stateView : children}
      </div>
    </section>
  );
}
