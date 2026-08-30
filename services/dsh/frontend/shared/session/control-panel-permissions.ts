import capabilityContract from "../../../contracts/authorization-capabilities.json";

export type ControlPanelPermissionIdentity = {
  readonly permissions?: readonly {
    readonly service?: string;
    readonly surface?: string;
    readonly action?: string;
    readonly scope?: string;
  }[];
};

type CapabilityAction = "read" | "manage" | "healthRead" | "auditRead" | "rollback";

type CapabilityDefinition = {
  readonly id: string;
  readonly read?: readonly string[];
  readonly manage?: readonly string[];
  readonly healthRead?: readonly string[];
  readonly auditRead?: readonly string[];
  readonly rollback?: readonly string[];
};

export type ControlPanelPermissionRequirement = Readonly<{
  readonly service: string;
  readonly action: string;
}>;

export type ControlPanelPermissionAlternatives = readonly (readonly ControlPanelPermissionRequirement[])[];

const capabilityDefinitions = capabilityContract.capabilities as readonly CapabilityDefinition[];

function registeredCapabilityPermissions(
  id: string,
  action: CapabilityAction,
): readonly string[] {
  const definition = capabilityDefinitions.find((candidate) => candidate.id === id);
  const permissions = definition?.[action];
  if (!permissions || permissions.length === 0) {
    throw new Error(`Capability ${id}.${action} is missing from the canonical authorization capability contract`);
  }
  return Object.freeze([...permissions]);
}

export const CONTROL_PANEL_CAPABILITIES = Object.freeze({
  platformControlRead: registeredCapabilityPermissions("platform-control", "read"),
  platformControlHealthRead: registeredCapabilityPermissions("platform-control", "healthRead"),
  platformControlAuditRead: registeredCapabilityPermissions("platform-control", "auditRead"),
  dshPlatformPolicyRead: registeredCapabilityPermissions("dsh-platform-policy", "read"),
  dshPlatformPolicyManage: registeredCapabilityPermissions("dsh-platform-policy", "manage"),
  dshServiceAreasRead: registeredCapabilityPermissions("dsh-service-areas", "read"),
  dshServiceAreasManage: registeredCapabilityPermissions("dsh-service-areas", "manage"),
  dshOperationalProfileRead: registeredCapabilityPermissions("dsh-operational-profile", "read"),
  dshOperationalProfileManage: registeredCapabilityPermissions("dsh-operational-profile", "manage"),
  dshOperationalDeliveryModeRead: registeredCapabilityPermissions("dsh-operational-delivery-mode", "read"),
  dshOperationalDeliveryModeManage: registeredCapabilityPermissions("dsh-operational-delivery-mode", "manage"),
  dshOperationalSlaRead: registeredCapabilityPermissions("dsh-operational-sla", "read"),
  dshOperationalSlaManage: registeredCapabilityPermissions("dsh-operational-sla", "manage"),
  dshOperationalCapacityRead: registeredCapabilityPermissions("dsh-operational-capacity", "read"),
  dshOperationalCapacityManage: registeredCapabilityPermissions("dsh-operational-capacity", "manage"),
  dshOperationalPolicyEvaluate: registeredCapabilityPermissions("dsh-operational-policy-evaluate", "read"),
  dshOperationalPolicyAuditRead: registeredCapabilityPermissions("dsh-operational-policy-audit", "read"),
  dshOperationalPolicyRollback: registeredCapabilityPermissions("dsh-operational-policy-rollback", "manage"),
  dshFinanceRead: registeredCapabilityPermissions("dsh-finance", "read"),
  dshFinanceManage: registeredCapabilityPermissions("dsh-finance", "manage"),
} as const);

const PLATFORM_PERMISSION_SERVICES = new Set(["dsh", "core"]);

function isControlPanelPermission(
  permission: NonNullable<ControlPanelPermissionIdentity["permissions"]>[number],
  action: string,
): boolean {
  return (
    permission.surface === "control-panel" &&
    permission.action === action
  );
}

export function hasControlPanelPermissionRequirement(
  identity: ControlPanelPermissionIdentity | null | undefined,
  requirement: ControlPanelPermissionRequirement,
): boolean {
  return identity?.permissions?.some((permission) =>
    permission.service === requirement.service &&
    isControlPanelPermission(permission, requirement.action),
  ) ?? false;
}

/**
 * A section may expose several independently governed workspaces. Access is
 * granted when the session can read at least one complete workspace path;
 * every permission in one alternative is still required.
 */
export function hasAnyControlPanelPermissionAlternative(
  identity: ControlPanelPermissionIdentity | null | undefined,
  alternatives: ControlPanelPermissionAlternatives,
): boolean {
  return alternatives.some((requirements) =>
    requirements.length > 0 && requirements.every((requirement) =>
      hasControlPanelPermissionRequirement(identity, requirement),
    ),
  );
}

export function hasServiceControlPanelPermission(
  identity: ControlPanelPermissionIdentity | null | undefined,
  service: string,
  action: string,
): boolean {
  return hasControlPanelPermissionRequirement(identity, { service, action });
}

export function hasControlPanelPermission(
  identity: ControlPanelPermissionIdentity | null | undefined,
  action: string,
): boolean {
  return identity?.permissions?.some((permission) =>
    PLATFORM_PERMISSION_SERVICES.has(permission.service ?? "") &&
    isControlPanelPermission(permission, action),
  ) ?? false;
}

export function hasAllControlPanelPermissions(
  identity: ControlPanelPermissionIdentity | null | undefined,
  actions: readonly string[],
): boolean {
  return actions.every((action) => hasControlPanelPermission(identity, action));
}
