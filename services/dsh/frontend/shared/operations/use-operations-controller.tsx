'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CanonicalOperationsGroupId,
  OperationsFocusParams,
  OperationsGroupMeta,
  OperationsPanelId,
  OperationsViewState,
} from './operations.types';
import {
  OPERATIONS_CANONICAL_GROUPS,
  buildOperationsHref,
  coerceOperationsPanel,
  getOperationsGroupMeta,
} from './operations-registry';

export type UseOperationsControllerProps = {
  group?: CanonicalOperationsGroupId | undefined;
  orderId?: string | undefined;
  panel?: OperationsPanelId | undefined;
  state?: OperationsViewState | undefined;
  searchParams?: { get: (key: string) => string | null } | undefined;
  router?: { push: (href: string) => void } | undefined;
};

function isCanonicalOperationsGroupId(
  value: string | undefined | null,
): value is CanonicalOperationsGroupId {
  return OPERATIONS_CANONICAL_GROUPS.some((group) => group.id === value);
}

function resolveCanonicalOperationsGroup(
  value: string | undefined | null,
): CanonicalOperationsGroupId | undefined {
  return isCanonicalOperationsGroupId(value) ? value : undefined;
}

/**
 * Workspaces remain in source control for reuse, but are withheld from the
 * production navigation until a sovereign read model, mutation contract,
 * tenant authorization, audit trail, and readback are all present.
 *
 * Keeping this policy next to route resolution prevents a crafted query
 * string from bypassing the navigation gate and mounting an unbound surface.
 */
const UNBOUND_SUBGROUPS: Partial<Record<CanonicalOperationsGroupId, ReadonlySet<string>>> = {
  'live-orders': new Set(['delayed', 'assisted', 'rescue']),
  'dispatch-capacity': new Set(['heatmap']),
  exceptions: new Set(['audit']),
};

function visibleSubGroups(groupMeta: OperationsGroupMeta) {
  const groups = groupMeta.subGroups ?? [];
  const blocked = UNBOUND_SUBGROUPS[groupMeta.id];
  if (!blocked) return groups;
  return groups.filter((subGroup) => !blocked.has(subGroup.id));
}

function resolveSubGroupForGroup(
  groupMeta: OperationsGroupMeta,
  value: string | undefined,
) {
  const subGroups = visibleSubGroups(groupMeta);
  return subGroups.find((subGroup) => subGroup.id === value)?.id ?? subGroups[0]?.id;
}

export function useOperationsController({
  group = 'command-center',
  orderId,
  panel,
  searchParams,
  router,
}: UseOperationsControllerProps) {
  const rawWorkspaceParam = searchParams?.get('workspace');
  const workspaceParam = resolveCanonicalOperationsGroup(rawWorkspaceParam);
  const groupProp = resolveCanonicalOperationsGroup(group);
  const hasUrlState = Boolean(searchParams && router);
  const [activeGroupState, setActiveGroupState] = useState<CanonicalOperationsGroupId>(
    groupProp ?? 'command-center',
  );

  useEffect(() => {
    if (!hasUrlState) setActiveGroupState(groupProp ?? 'command-center');
  }, [groupProp, hasUrlState]);

  const activeGroup = hasUrlState
    ? workspaceParam ?? groupProp ?? 'command-center'
    : activeGroupState;
  const activeGroupMeta = useMemo(() => getOperationsGroupMeta(activeGroup), [activeGroup]);
  const getParam = useCallback(
    (key: string) => searchParams?.get(key) ?? undefined,
    [searchParams],
  );
  const activeSubGroup = useMemo(
    () => resolveSubGroupForGroup(activeGroupMeta, getParam('subGroup')),
    [activeGroupMeta, getParam],
  );
  const activeSubGroupMeta = useMemo(
    () => visibleSubGroups(activeGroupMeta).find((subGroup) => subGroup.id === activeSubGroup),
    [activeGroupMeta, activeSubGroup],
  );

  const focusParams = useMemo<OperationsFocusParams>(() => ({
    orderId: getParam('orderId') || orderId,
    customerId: getParam('customerId'),
    ticketId: getParam('ticketId'),
    callId: getParam('callId'),
    requestId: getParam('requestId'),
    panel: coerceOperationsPanel(getParam('panel')) ?? coerceOperationsPanel(panel),
    subGroup: activeSubGroup,
  }), [activeSubGroup, getParam, orderId, panel]);

  const hubHref = useMemo(
    () => buildOperationsHref(activeGroup, focusParams),
    [activeGroup, focusParams],
  );
  const tabItems = useMemo(
    () => OPERATIONS_CANONICAL_GROUPS.map((item) => ({
      id: item.id,
      label: item.label,
      active: item.id === activeGroup,
    })),
    [activeGroup],
  );
  const subTabItems = useMemo(
    () => visibleSubGroups(activeGroupMeta).map((subGroup) => ({
      id: subGroup.id,
      label: subGroup.label,
      active: activeSubGroup === subGroup.id,
    })),
    [activeGroupMeta, activeSubGroup],
  );
  const focusContextItems = useMemo(
    () => [
      focusParams.orderId ? { label: 'orderId', value: focusParams.orderId } : null,
      focusParams.customerId ? { label: 'customerId', value: focusParams.customerId } : null,
      focusParams.ticketId ? { label: 'ticketId', value: focusParams.ticketId } : null,
      focusParams.callId ? { label: 'callId', value: focusParams.callId } : null,
      focusParams.requestId ? { label: 'requestId', value: focusParams.requestId } : null,
    ].filter((item): item is { label: string; value: string } => item !== null),
    [focusParams],
  );

  const handleSelectTab = useCallback((id: string) => {
    const groupId = resolveCanonicalOperationsGroup(id);
    if (!groupId) return;
    const targetSubGroup = resolveSubGroupForGroup(getOperationsGroupMeta(groupId), undefined);
    const nextParams: OperationsFocusParams = {
      orderId: focusParams.orderId,
      customerId: focusParams.customerId,
      ticketId: focusParams.ticketId,
      callId: focusParams.callId,
      requestId: focusParams.requestId,
      panel: focusParams.panel,
      subGroup: targetSubGroup,
    };
    if (router) router.push(buildOperationsHref(groupId, nextParams));
    else setActiveGroupState(groupId);
  }, [focusParams, router]);

  const handleSelectSubTab = useCallback((id: string) => {
    const nextSubGroup = resolveSubGroupForGroup(activeGroupMeta, id);
    if (nextSubGroup !== id || !router) return;
    router.push(buildOperationsHref(activeGroup, { ...focusParams, subGroup: nextSubGroup }));
  }, [activeGroup, activeGroupMeta, focusParams, router]);

  return {
    activeGroup,
    activeGroupMeta,
    activeSubGroup,
    activeSubGroupMeta,
    focusParams,
    hubHref,
    tabItems,
    subTabItems,
    focusContextItems,
    handleSelectTab,
    handleSelectSubTab,
  };
}
