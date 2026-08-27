import type React from "react";

export type IconRendererProps = {
  readonly name: string;
  readonly size: number;
  readonly color: string;
  readonly style?: unknown;
  readonly accessibilityLabel?: string;
};

export type IconRenderer = (props: IconRendererProps) => React.ReactElement | null;

export type IconProps = {
  name: string;
  size?: number;
  tone?: "brand" | "success" | "warning" | "danger" | "muted" | "action";
  color?: string;
  style?: unknown;
  mirrored?: boolean;
  accessibilityLabel?: string;
};
