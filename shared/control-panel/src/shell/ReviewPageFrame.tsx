import type { ReactNode } from "react";
import { WebStyleSheet } from "@bthwani/ui-kit/web";
import { useCpFrameTokens } from "./frameTokens";
export type ReviewPageFrameProps = { readonly header?: ReactNode; readonly reviewContent?: ReactNode; readonly actionBar?: ReactNode; readonly stateView?: ReactNode; readonly dir?: "ltr" | "rtl"; };
export function ReviewPageFrame({ header, reviewContent, actionBar, stateView, dir = "rtl" }: ReviewPageFrameProps) { const frameTokens = useCpFrameTokens(); return <section dir={dir} style={{ ...styles.section, ...frameTokens.page }}>{header != null ? <div style={styles.header}>{header}</div> : null}<div style={styles.content}>{stateView != null ? stateView : reviewContent}</div>{actionBar != null ? <div style={styles.actionBar}>{actionBar}</div> : null}</section>; }
const styles = WebStyleSheet.create({ section: { display: "flex", flexDirection: "column", height: "100%" }, header: { flexShrink: 0 }, content: { flex: 1, overflowY: "auto" }, actionBar: { flexShrink: 0 } });
