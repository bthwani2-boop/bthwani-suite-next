import type { ReactNode } from "react";
import { WebStyleSheet } from "@bthwani/ui-kit/web";

export type DataTablePageFrameProps = {
  readonly header?: ReactNode;
  readonly toolbar?: ReactNode;
  readonly filters?: ReactNode;
  readonly children: ReactNode;
  readonly stateView?: ReactNode;
  readonly sidePanel?: ReactNode;
  readonly dir?: "ltr" | "rtl";
};

export function DataTablePageFrame({ header, toolbar, filters, children, stateView, sidePanel, dir = "rtl" }: DataTablePageFrameProps) {
  return (
    <section dir={dir} style={styles.section}>
      {header != null && <div style={styles.header}>{header}</div>}
      {toolbar != null && <div style={styles.toolbar}>{toolbar}</div>}
      {filters != null && <div style={styles.filters}>{filters}</div>}
      <div style={styles.body}>
        <div style={styles.content}>{stateView ?? children}</div>
        {sidePanel != null && (
          <aside style={styles.sidePanel}>
            {sidePanel}
          </aside>
        )}
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
  body: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    overflowX: "auto",
  },
  sidePanel: {
    width: "22rem",
    flexShrink: 0,
    borderInlineStart: "1px solid var(--card-border, currentColor)",
    overflowY: "auto",
  },
});
