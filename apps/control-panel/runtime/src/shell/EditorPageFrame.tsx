import type { ReactNode } from "react";
import { WebStyleSheet } from "@bthwani/ui-kit/web";

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
    <section dir={dir} style={styles.section}>
      {header != null ? <div style={styles.header}>{header}</div> : null}
      {toolbar != null ? <div style={styles.toolbar}>{toolbar}</div> : null}
      <div style={styles.content}>
        {stateView != null ? stateView : children}
      </div>
      {actionBar != null ? <div style={styles.actionBar}>{actionBar}</div> : null}
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
  toolbar: {
    flexShrink: 0,
  },
  content: {
    flex: 1,
    overflowY: "auto",
  },
  actionBar: {
    flexShrink: 0,
  },
});
