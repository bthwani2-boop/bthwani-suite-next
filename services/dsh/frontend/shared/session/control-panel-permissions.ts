export type ControlPanelPermissionIdentity = {
  readonly permissions?: readonly {
    readonly service?: string;
    readonly surface?: string;
    readonly action?: string;
    readonly scope?: string;
  }[];
};

const PLATFORM_PERMISSION_SERVICES = new Set(["dsh", "core"]);

export function hasControlPanelPermission(
  identity: ControlPanelPermissionIdentity | null | undefined,
  action: string,
): boolean {
  return identity?.permissions?.some((permission) =>
    PLATFORM_PERMISSION_SERVICES.has(permission.service ?? "") &&
    (permission.surface === "control-panel" || permission.surface === "all" || permission.surface === "*") &&
    (permission.scope === "all" || permission.scope === "*") &&
    (permission.action === action || permission.action === "*"),
  ) ?? false;
}
