import { StateView, type StateViewProps } from "../StateView";

export type ErrorStateProps = Omit<StateViewProps, "tone">;

export function ErrorState({ title = "Something went wrong", ...props }: ErrorStateProps) {
  return <StateView title={title} tone="danger" {...props} />;
}
