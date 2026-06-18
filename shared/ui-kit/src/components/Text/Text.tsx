import type { ReactNode } from "react";
import { StyledText } from "../_shared";

export type TextProps = {
  children?: ReactNode;
  role?: "display" | "hero" | "titleLg" | "titleMd" | "titleSm" | "bodyLg" | "body" | "bodyStrong" | "bodySm" | "label" | "caption" | "code";
  tone?: "default" | "secondary" | "muted" | "inverse" | "action" | "success" | "warning" | "danger" | "info";
  align?: "start" | "center" | "end";
  color?: string;
  htmlFor?: string;
  numberOfLines?: number;
};

export function Text(props: TextProps) {
  return <StyledText {...props} />;
}
