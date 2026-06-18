import type { ReactNode } from "react";
import { StyledText } from "../_shared";
import {
  direction as directionConfig,
  resolveTextAlign,
  type Direction,
  type LogicalAlignment,
  type TypographyRole
} from "../../tokens";

export type TextProps = {
  children?: ReactNode;
  role?: TypographyRole;
  tone?: "default" | "secondary" | "muted" | "inverse" | "action" | "success" | "warning" | "danger" | "info";
  align?: LogicalAlignment;
  direction?: Direction;
  htmlFor?: string;
  numberOfLines?: number;
};

export function Text({
  align = "start",
  direction = directionConfig.defaultDirection,
  ...props
}: TextProps) {
  return (
    <StyledText
      textAlign={resolveTextAlign(align, direction)}
      writingDirection={direction}
      {...props}
    />
  );
}
