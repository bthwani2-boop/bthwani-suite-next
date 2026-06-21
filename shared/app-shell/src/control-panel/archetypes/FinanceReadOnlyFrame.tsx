import type { ReactNode } from "react";

/**
 * READ-ONLY frame for finance visibility.
 * No financial mutations, payments, refunds, settlements, or ledger writes allowed.
 * DSH cannot use this frame for financial mutations — WLT boundary enforced separately.
 */
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
