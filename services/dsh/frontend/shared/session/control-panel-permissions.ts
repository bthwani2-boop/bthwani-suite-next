import scopeVocabulary from "../../../../../tools/verification/security-scope-vocabulary.json";

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

const capabilityDefinitions = scopeVocabulary.capabilities as readonly CapabilityDefinition[];
const vocabularyScopes = new Set(
  scopeVocabulary.families.flatMap((family) => family.scopes.map(({ scope }) => scope)),
);

function registeredCapabilityPermissions(
  id: string,
  action: CapabilityAction,
): readonly string[] {
  const definition = capabilityDefinitions.find((candidate) => candidate.id === id);
  const permissions = definition?.[action];
  if (!permissions || permissions.length === 0) {
    throw new Error(`Capability ${id}.${action} is missing from the canonical scope vocabulary`);
  }
  for (const permission of permissions) {
    if (!vocabularyScopes.has(permission)) {
      throw new Error(`Capability ${id}.${action} references an undeclared permission: ${permission}`);
    }
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

export function hasServiceControlPanelPermission(
  identity: ControlPanelPermissionIdentity | null | undefined,
  service: string,
  action: string,
): boolean {
  return identity?.permissions?.some((permission) =>
    permission.service === service &&
    isControlPanelPermission(permission, action),
  ) ?? false;
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
