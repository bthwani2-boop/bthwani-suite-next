import type { ReactNode } from "react";
import { WebStyleSheet } from "@bthwani/ui-kit/web";

export type QueuePageFrameProps = {
  readonly header?: ReactNode;
  readonly toolbar?: ReactNode;
  readonly filters?: ReactNode;
  readonly children: ReactNode;
  readonly stateView?: ReactNode;
  readonly dir?: "ltr" | "rtl";
};

export function QueuePageFrame({
  header,
  toolbar,
  filters,
  children,
  stateView,
  dir = "rtl",
}: QueuePageFrameProps) {
  return (
    <section dir={dir} style={styles.section}>
      {header != null ? <div style={styles.header}>{header}</div> : null}
      {toolbar != null ? <div style={styles.toolbar}>{toolbar}</div> : null}
      {filters != null ? <div style={styles.filters}>{filters}</div> : null}
      <div style={styles.content}>
        {stateView != null ? stateView : children}
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
  toolbar: {
    flexShrink: 0,
  },
  filters: {
    flexShrink: 0,
  },
  content: {
    flex: 1,
    overflowY: "auto",
  },
});
