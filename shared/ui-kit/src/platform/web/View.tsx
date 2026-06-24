import type { CSSProperties, ReactNode } from "react";

export type ViewProps = {
  readonly style?: CSSProperties;
  readonly children?: ReactNode;
};

export function View({ style, children }: ViewProps) {
  return <div style={style}>{children}</div>;
}
