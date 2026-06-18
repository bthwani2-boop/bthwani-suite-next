import type { ReactNode } from "react";
import { Inline } from "../_shared";

export type ToolbarProps = {
  children?: ReactNode;
  wrap?: boolean;
};

export function Toolbar({ children, wrap = true }: ToolbarProps) {
  return (
    <Inline
      width="100%"
      minHeight={48}
      flexWrap={wrap ? "wrap" : "nowrap"}
      justifyContent="space-between"
      padding="$2"
      borderRadius="$md"
      backgroundColor="$surfaceRaised"
      borderWidth={1}
      borderColor="$borderColor"
    >
      {children}
    </Inline>
  );
}
