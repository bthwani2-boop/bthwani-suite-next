import type { ReactNode } from "react";
import { WebStyleSheet } from "@bthwani/ui-kit/web";

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
    <section dir={dir} style={styles.section}>
      {header != null ? <div style={styles.header}>{header}</div> : null}
      <div style={styles.body}>
        {nav != null ? <div style={styles.nav}>{nav}</div> : null}
        <div style={styles.content}>
          {stateView != null ? stateView : children}
        </div>
      </div>
    </section>
  );
}

const styles = WebStyleSheet.create({
  section: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  header: {
    flexShrink: 0,
  },
  body: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  nav: {
    flexShrink: 0,
    overflowY: "auto",
  },
  content: {
    flex: 1,
    overflowY: "auto",
  },
});
