import { StateView, type StateViewProps } from "../StateView";

export type OfflineStateProps = Omit<StateViewProps, "tone">;

export function OfflineState({
  title = "You are offline",
  description = "Reconnect to continue. The current context remains available.",
  ...props
}: OfflineStateProps) {
  return <StateView title={title} description={description} tone="warning" {...props} />;
}
