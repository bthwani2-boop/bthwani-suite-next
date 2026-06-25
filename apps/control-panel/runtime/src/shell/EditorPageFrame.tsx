import type { ReactNode } from "react";

export type EditorPageFrameProps = {
  readonly header?: ReactNode;
  readonly toolbar?: ReactNode;
  readonly children: ReactNode;
  readonly actionBar?: ReactNode;
  readonly stateView?: ReactNode;
  readonly dir?: "ltr" | "rtl";
};

export function EditorPageFrame({
  header,
  toolbar,
  children,
  actionBar,
  stateView,
  dir = "rtl",
}: EditorPageFrameProps) {
  return (
    <section dir={dir} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {header != null ? <div style={{ flexShrink: 0 }}>{header}</div> : null}
      {toolbar != null ? <div style={{ flexShrink: 0 }}>{toolbar}</div> : null}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {stateView != null ? stateView : children}
      </div>
      {actionBar != null ? <div style={{ flexShrink: 0 }}>{actionBar}</div> : null}
    </section>
  );
}
