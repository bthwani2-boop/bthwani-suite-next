// Canonical location: dsh/frontend/shared/platform/platform-vars.view-model.ts
// Authority: core/platform-control generated read model. This module only groups
// and formats the canonical response for the control-panel surface; it never
// stores or applies a local platform value.

import type { PlatformVariable } from './platform-control.api';

export type VarsDomainId = 'dsh' | 'wlt' | 'provider' | 'design';

const SENSITIVE_CLASSIFICATIONS = new Set([
  'secret',
  'sensitive',
  'confidential',
  'restricted',
  'credential',
  'credentials',
  'password',
  'token',
  'private_key',
  'api_key',
  'client_secret',
]);

function normalized(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

export function isSensitivePlatformVariable(variable: Pick<PlatformVariable, 'classification'>): boolean {
  return SENSITIVE_CLASSIFICATIONS.has(normalized(variable.classification));
}

export function resolvePlatformVarsDomain(variable: Pick<PlatformVariable, 'key' | 'ownerService'>): VarsDomainId {
  if (variable.key.startsWith('VAR_UI_')) return 'design';
  const owner = normalized(variable.ownerService);
  if (owner === 'wlt') return 'wlt';
  if (owner === 'provider' || owner === 'providers') return 'provider';
  return 'dsh';
}

export function resolvePlatformVarsDomainRecords(
  records: readonly PlatformVariable[],
  domain: VarsDomainId,
): PlatformVariable[] {
  return records.filter((record) => resolvePlatformVarsDomain(record) === domain);
}

/**
 * Stable display order follows the fields returned by the canonical query. It
 * is deliberately not a local scope-precedence policy.
 */
export function sortPlatformVarsByScope(records: readonly PlatformVariable[]): PlatformVariable[] {
  return [...records].sort((a, b) =>
    `${a.key}\u0000${a.scopeType}\u0000${a.scopeId ?? ''}`.localeCompare(
      `${b.key}\u0000${b.scopeType}\u0000${b.scopeId ?? ''}`,
    ),
  );
}

/** Return the unique scopes present in the current canonical read model. */
export function resolvePlatformVarsFilteredScopes(
  records: readonly PlatformVariable[],
): string[] {
  const scopes = new Set<string>();
  for (const record of records) {
    const scope = record.scopeType.trim();
    if (scope) scopes.add(scope);
  }
  return [...scopes];
}

export function platformVariableIdentity(
  variable: Pick<PlatformVariable, 'key' | 'scopeType' | 'scopeId'>,
): string {
  return `${variable.key}:${variable.scopeType}:${variable.scopeId ?? ''}`;
}

export function formatPlatformVariableValue(variable: Pick<PlatformVariable, 'classification' | 'value'>): string {
  if (isSensitivePlatformVariable(variable)) return '••••••';
  if (variable.value === undefined || variable.value === null) return '';
  if (typeof variable.value === 'string') return variable.value;
  try {
    return JSON.stringify(variable.value);
  } catch {
    return '[unserializable]';
  }
}

/** Never place a sensitive runtime value in an editable browser control. */
export function platformVariableEditorValue(variable: PlatformVariable): string {
  if (isSensitivePlatformVariable(variable)) return '';
  if (typeof variable.value === 'string') return variable.value;
  if (variable.value === undefined || variable.value === null) return '';
  try {
    return JSON.stringify(variable.value);
  } catch {
    return '';
  }
}
