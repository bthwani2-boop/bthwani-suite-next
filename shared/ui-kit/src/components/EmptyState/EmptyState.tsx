import { StateView, type StateViewProps } from "../StateView";

export type EmptyStateProps = Omit<StateViewProps, "tone">;

export function EmptyState({ title = "Nothing here yet", ...props }: EmptyStateProps) {
  return <StateView title={title} tone="neutral" {...props} />;
}
