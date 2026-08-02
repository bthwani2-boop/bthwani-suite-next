import type { ReactNode } from "react";
import { WebStyleSheet } from "@bthwani/ui-kit/web";
import { useCpFrameTokens } from "./frameTokens";
export type FinanceReadOnlyFrameProps = { readonly header?: ReactNode; readonly summary?: ReactNode; readonly children: ReactNode; readonly stateView?: ReactNode; readonly dir?: "ltr" | "rtl"; };
export function FinanceReadOnlyFrame({ header, summary, children, stateView, dir = "rtl" }: FinanceReadOnlyFrameProps) { const frameTokens = useCpFrameTokens(); return <section dir={dir} style={{ ...styles.section, ...frameTokens.page, ...frameTokens.auditPanel }}>{header != null ? <div style={styles.header}>{header}</div> : null}{summary != null ? <div style={styles.summary}>{summary}</div> : null}<div style={styles.content}>{stateView != null ? stateView : children}</div></section>; }
const styles = WebStyleSheet.create({ section: { display: "flex", flexDirection: "column", height: "100%" }, header: { flexShrink: 0 }, summary: { flexShrink: 0 }, content: { flex: 1, overflowY: "auto" } });
