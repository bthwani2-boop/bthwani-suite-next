import type { ReactNode } from "react";
import { Inline } from "../_shared";

export type ActionBarProps = {
  primary?: ReactNode;
  secondary?: ReactNode;
  sticky?: boolean;
};

export function ActionBar({ primary, secondary, sticky = false }: ActionBarProps) {
  return (
    <Inline
      width="100%"
      justifyContent="flex-end"
      flexWrap="wrap"
      padding="$3"
      backgroundColor="$surfaceOverlay"
      borderTopWidth={1}
      borderTopColor="$borderColor"
      position={sticky ? "sticky" : "relative"}
      bottom={sticky ? 0 : undefined}
      zIndex={sticky ? "$sticky" : "$base"}
    >
      {secondary}
      {primary}
    </Inline>
  );
}
