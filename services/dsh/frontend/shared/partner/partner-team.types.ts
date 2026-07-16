// Team-management domain types.
// Canonical home for partner team member types shared between the
// usePartnerTeamController hook and the app-partner team screen. Types live
// in the DSH shared brain (not on a UI screen) so non-UI code does not
// depend on a surface module.

export type PartnerTeamRole = 'owner' | 'supervisor' | 'staff' | 'courier';
export type PartnerTeamStatus = 'active' | 'paused' | 'invited' | 'blocked' | 'review-needed';

export type PartnerTeamMember = {
  readonly id: string;
  readonly name: string;
  readonly role: PartnerTeamRole;
  readonly roleLabel: string;
  readonly status: PartnerTeamStatus;
  readonly statusLabel: string;
  readonly branchAssignment: string;
  readonly permissionsSummary: string;
  readonly deliveryAssignment: string;
  readonly inviteLifecycle: string;
  readonly operationalImpact: string;
  readonly auditNote: string;
  readonly inlineActionLabel: string;
};

const PARTNER_TEAM_ROLES: readonly PartnerTeamRole[] = ['owner', 'supervisor', 'staff', 'courier'];
const PARTNER_TEAM_STATUSES: readonly PartnerTeamStatus[] = ['active', 'paused', 'invited', 'blocked', 'review-needed'];

function isPartnerTeamRole(value: unknown): value is PartnerTeamRole {
  return typeof value === 'string' && (PARTNER_TEAM_ROLES as readonly string[]).includes(value);
}

function isPartnerTeamStatus(value: unknown): value is PartnerTeamStatus {
  return typeof value === 'string' && (PARTNER_TEAM_STATUSES as readonly string[]).includes(value);
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * Adapts a loosely-typed API record into a PartnerTeamMember. The team API
 * currently returns `unknown[]`, so this performs minimal shape validation
 * instead of blindly casting. Records missing a valid `id`/`name` are
 * dropped rather than rendered with garbage data.
 */
export function toPartnerTeamMember(raw: unknown): PartnerTeamMember | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.name !== 'string') return null;

  const role = isPartnerTeamRole(record.role) ? record.role : 'staff';
  const status = isPartnerTeamStatus(record.status) ? record.status : 'active';

  return {
    id: record.id,
    name: record.name,
    role,
    roleLabel: stringOr(record.roleLabel, ''),
    status,
    statusLabel: stringOr(record.statusLabel, ''),
    branchAssignment: stringOr(record.branchAssignment, ''),
    permissionsSummary: stringOr(record.permissionsSummary, ''),
    deliveryAssignment: stringOr(record.deliveryAssignment, ''),
    inviteLifecycle: stringOr(record.inviteLifecycle, ''),
    operationalImpact: stringOr(record.operationalImpact, ''),
    auditNote: stringOr(record.auditNote, ''),
    inlineActionLabel: stringOr(record.inlineActionLabel, ''),
  };
}
