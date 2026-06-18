import { StateView, type StateViewProps } from "../StateView";

export type LoadingStateProps = Omit<StateViewProps, "loading" | "tone">;

export function LoadingState({ title = "Loading", ...props }: LoadingStateProps) {
  return <StateView title={title} loading tone="info" {...props} />;
}
