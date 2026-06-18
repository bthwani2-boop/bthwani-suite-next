import type { ReactNode } from "react";
import { StyledSurface } from "../_shared";

export type SurfaceProps = {
  children?: ReactNode;
  tone?: "default" | "raised" | "inset" | "action" | "success" | "warning" | "danger" | "info";
  borderless?: boolean;
  fill?: boolean;
  centered?: boolean;
  padding?: string | number;
  gap?: string | number;
  width?: string | number;
  maxWidth?: string | number;
  onPress?: () => void;
  hoverStyle?: Record<string, unknown>;
  pressStyle?: Record<string, unknown>;
};

export function Surface({ centered, ...props }: SurfaceProps) {
  return <StyledSurface alignItems={centered ? "center" : undefined} {...props} />;
}
