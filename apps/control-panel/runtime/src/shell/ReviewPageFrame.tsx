import type { ReactNode } from "react";

export type ReviewPageFrameProps = {
  readonly header?: ReactNode;
  readonly reviewContent?: ReactNode;
  readonly actionBar?: ReactNode;
  readonly stateView?: ReactNode;
  readonly dir?: "ltr" | "rtl";
};

export function ReviewPageFrame({
  header,
  reviewContent,
  actionBar,
  stateView,
  dir = "rtl",
}: ReviewPageFrameProps) {
  return (
    <section dir={dir} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {header != null ? <div style={{ flexShrink: 0 }}>{header}</div> : null}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {stateView != null ? stateView : reviewContent}
      </div>
      {actionBar != null ? <div style={{ flexShrink: 0 }}>{actionBar}</div> : null}
    </section>
  );
}
