import { StateView, type StateViewProps } from "../StateView";

export type PermissionStateProps = Omit<StateViewProps, "tone">;

export function PermissionState({
  title = "Permission required",
  description = "Your current access level does not allow this action.",
  ...props
}: PermissionStateProps) {
  return <StateView title={title} description={description} tone="warning" {...props} />;
}
