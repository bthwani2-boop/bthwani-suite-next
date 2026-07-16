'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import type {
  CanonicalOperationsGroupId,
  OperationsFocusParams,
  OperationsViewState,
  OperationsGroupMeta,
  OperationsPanelId,
} from './operations.types';
import {
  getOperationsGroupMeta,
  buildOperationsHref,
  OPERATIONS_CANONICAL_GROUPS,
  coerceOperationsPanel,
} from './operations-registry';

export type UseOperationsControllerProps = {
  group?: CanonicalOperationsGroupId | undefined;
  orderId?: string | undefined;
  panel?: OperationsPanelId | undefined;
  state?: OperationsViewState | undefined;
  searchParams?: {
    get: (key: string) => string | null;
  } | undefined;
  router?: {
    push: (href: string) => void;
  } | undefined;
};

function isCanonicalOperationsGroupId(value: string | undefined | null): value is CanonicalOperationsGroupId {
  return OPERATIONS_CANONICAL_GROUPS.some((groupMeta) => groupMeta.id === value);
}

function resolveCanonicalOperationsGroup(
  value: string | undefined | null,
): CanonicalOperationsGroupId | undefined {
  return isCanonicalOperationsGroupId(value) ? value : undefined;
}

function resolveSubGroupForGroup(
  groupMeta: OperationsGroupMeta,
  value: string | undefined,
) {
  const subGroups = groupMeta.subGroups ?? [];
  return subGroups.find((subGroupMeta) => subGroupMeta.id === value)?.id ?? subGroups[0]?.id;
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

  const [activeGroupState, setActiveGroupState] = useState<CanonicalOperationsGroupId>(groupProp ?? 'command-center');

  useEffect(() => {
    if (!hasUrlState) {
      setActiveGroupState(groupProp ?? 'command-center');
    }
  }, [groupProp, hasUrlState]);

  const activeGroup = hasUrlState
    ? workspaceParam ?? groupProp ?? 'command-center'
    : activeGroupState;

  const activeGroupMeta = useMemo(() => getOperationsGroupMeta(activeGroup), [activeGroup]);
  
  const getParam = useCallback((key: string) => {
    return searchParams?.get(key) ?? undefined;
  }, [searchParams]);

  const activeSubGroup = useMemo(() => {
    return resolveSubGroupForGroup(activeGroupMeta, getParam('subGroup'));
  }, [activeGroupMeta, getParam]);

  const activeSubGroupMeta = useMemo(() => {
    return activeGroupMeta.subGroups?.find((sub) => sub.id === activeSubGroup);
  }, [activeGroupMeta, activeSubGroup]);

  const focusParams = useMemo<OperationsFocusParams>(() => {
    const resolvedPanel = coerceOperationsPanel(getParam('panel')) ?? coerceOperationsPanel(panel);

    return {
      orderId: getParam('orderId') || orderId,
      customerId: getParam('customerId'),
      ticketId: getParam('ticketId'),
      callId: getParam('callId'),
      panel: resolvedPanel,
      subGroup: activeSubGroup,
    };
  }, [orderId, getParam, panel, activeSubGroup]);

  const hubHref = useMemo(() => buildOperationsHref(activeGroup, focusParams), [activeGroup, focusParams]);

  const tabItems = useMemo(() => {
    return OPERATIONS_CANONICAL_GROUPS.map((item) => {
      const id = item.id;
      const label = item.label;
      const active = item.id === activeGroup;
      return { id, label, active };
    });
  }, [activeGroup]);

  const subTabItems = useMemo(() => {
    return activeGroupMeta.subGroups?.map((sub) => {
      const id = sub.id;
      const label = sub.label;
      const active = activeSubGroup === sub.id;
      return { id, label, active };
    }) ?? [];
  }, [activeGroupMeta, activeSubGroup]);

  const focusContextItems = useMemo(() => {
    return [
      focusParams.orderId ? { label: 'orderId', value: focusParams.orderId } : null,
      focusParams.customerId ? { label: 'customerId', value: focusParams.customerId } : null,
      focusParams.ticketId ? { label: 'ticketId', value: focusParams.ticketId } : null,
      focusParams.callId ? { label: 'callId', value: focusParams.callId } : null,
    ].filter((item): item is { label: string; value: string } => item !== null);
  }, [focusParams]);

  const handleSelectTab = useCallback((id: string) => {
    const groupId = resolveCanonicalOperationsGroup(id);
    if (!groupId) {
      return;
    }

    const nextParams = {
      orderId: focusParams.orderId,
      customerId: focusParams.customerId,
      ticketId: focusParams.ticketId,
      callId: focusParams.callId,
      panel: focusParams.panel,
    };

    if (router) {
      router.push(buildOperationsHref(groupId, nextParams));
    } else {
      setActiveGroupState(groupId);
    }
  }, [focusParams, router]);

  const handleSelectSubTab = useCallback((id: string) => {
    const nextSubGroup = resolveSubGroupForGroup(activeGroupMeta, id);
    if (nextSubGroup !== id) {
      return;
    }

    if (router) {
      router.push(buildOperationsHref(activeGroup, { ...focusParams, subGroup: nextSubGroup }));
    }
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
