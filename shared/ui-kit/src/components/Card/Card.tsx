import type { ReactNode } from "react";
import { Surface } from "../Surface";

export type CardProps = {
  children?: ReactNode;
  interactive?: boolean;
  onPress?: () => void;
};

export function Card({ interactive = false, ...props }: CardProps) {
  return (
    <Surface
      tone="raised"
      {...(interactive
        ? {
            hoverStyle: { borderColor: "$action", y: -1 },
            pressStyle: { opacity: 0.92, y: 0 }
          }
        : {})}
      {...props}
    />
  );
}
