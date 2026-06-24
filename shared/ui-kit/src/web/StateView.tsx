import type { ReactNode } from "react";
import { Button } from "./Button";

export type StateViewProps = {
  readonly title: string;
  readonly description?: string;
  readonly actionLabel?: string;
  readonly onActionPress?: () => void;
  readonly tone?: "default" | "danger";
  readonly children?: ReactNode;
};

export function StateView({ title, description, actionLabel, onActionPress, children }: StateViewProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1rem",
        gap: "0.5rem",
        textAlign: "center",
        minHeight: "10rem",
      }}
    >
      <strong style={{ fontSize: "1rem" }}>{title}</strong>
      {description ? <span style={{ fontSize: "0.875rem", opacity: 0.65 }}>{description}</span> : null}
      {actionLabel && onActionPress ? (
        <Button label={actionLabel} tone="secondary" size="sm" onPress={onActionPress} />
      ) : null}
      {children}
    </div>
  );
}
