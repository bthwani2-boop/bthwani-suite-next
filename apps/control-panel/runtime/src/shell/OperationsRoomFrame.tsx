import type { ReactNode } from "react";
import { WebStyleSheet } from "@bthwani/ui-kit/web";

export type OperationsRoomFrameProps = {
  readonly header?: ReactNode;
  readonly children: ReactNode;
  readonly sidePanel?: ReactNode;
  readonly statusBar?: ReactNode;
  readonly stateView?: ReactNode;
  readonly dir?: "ltr" | "rtl";
};

export function OperationsRoomFrame({
  header,
  children,
  sidePanel,
  statusBar,
  stateView,
  dir = "rtl",
}: OperationsRoomFrameProps) {
  return (
    <section dir={dir} style={styles.section}>
      {header != null ? <div style={styles.header}>{header}</div> : null}
      <div style={styles.body}>
        <div style={styles.content}>
          {stateView != null ? stateView : children}
        </div>
        {sidePanel != null ? (
          <div style={styles.sidePanel}>{sidePanel}</div>
        ) : null}
      </div>
      {statusBar != null ? <div style={styles.statusBar}>{statusBar}</div> : null}
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
  content: {
    flex: 1,
    overflowY: "auto",
  },
  sidePanel: {
    flexShrink: 0,
    overflowY: "auto",
  },
  statusBar: {
    flexShrink: 0,
  },
});
