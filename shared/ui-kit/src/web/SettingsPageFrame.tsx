import type { ReactNode } from "react";

export type SettingsPageFrameProps = {
  readonly header?: ReactNode;
  readonly nav?: ReactNode;
  readonly children: ReactNode;
  readonly stateView?: ReactNode;
  readonly dir?: "ltr" | "rtl";
};

export function SettingsPageFrame({
  header,
  nav,
  children,
  stateView,
  dir = "rtl",
}: SettingsPageFrameProps) {
  return (
    <section dir={dir} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {header != null ? <div style={{ flexShrink: 0 }}>{header}</div> : null}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {nav != null ? <div style={{ flexShrink: 0, overflowY: "auto" }}>{nav}</div> : null}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {stateView != null ? stateView : children}
        </div>
      </div>
    </section>
  );
}
