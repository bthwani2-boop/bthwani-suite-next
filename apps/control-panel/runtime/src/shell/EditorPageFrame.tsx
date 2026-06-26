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
      {header != null ? (
        <div style={{
          flexShrink: 0,
          padding: "1rem 1.5rem",
          background: "var(--dsh-card-bg)",
          borderBottom: "1px solid var(--dsh-card-border)",
        }}>
          {header}
        </div>
      ) : null}
      {toolbar != null ? (
        <div style={{
          flexShrink: 0,
          padding: "0.625rem 1.5rem",
          background: "var(--dsh-card-bg)",
          borderBottom: "1px solid var(--dsh-card-border)",
        }}>
          {toolbar}
        </div>
      ) : null}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
        {stateView != null ? stateView : children}
      </div>
      {actionBar != null ? (
        <div style={{
          flexShrink: 0,
          padding: "0.75rem 1.5rem",
          background: "var(--dsh-card-bg)",
          borderTop: "1px solid var(--dsh-card-border)",
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
        }}>
          {actionBar}
        </div>
      ) : null}
    </section>
  );
}
