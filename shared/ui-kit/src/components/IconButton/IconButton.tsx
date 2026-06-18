import type { ReactNode } from "react";
import { Button, type ButtonProps } from "../Button";

export type IconButtonProps = Omit<ButtonProps, "children" | "label" | "leading" | "trailing"> & {
  icon: ReactNode;
  accessibilityLabel: string;
};

export function IconButton({ icon, accessibilityLabel, size = "md", ...props }: IconButtonProps) {
  return (
    <Button
      accessibilityLabel={accessibilityLabel}
      size={size}
      circular
      {...props}
    >
      {icon}
    </Button>
  );
}
