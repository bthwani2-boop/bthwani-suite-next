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
  OPERATIONS_CANONICAL_GROUP_IDS,
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

export function useOperationsController({
  group = 'command-center',
  orderId,
  panel,
  state = 'ready',
  searchParams,
  router,
}: UseOperationsControllerProps) {
  const rawWorkspaceParam = searchParams?.get('workspace');
  const workspaceParam = (
    rawWorkspaceParam && OPERATIONS_CANONICAL_GROUP_IDS.includes(rawWorkspaceParam as CanonicalOperationsGroupId)
      ? rawWorkspaceParam
      : null
  ) as CanonicalOperationsGroupId | null;

  const [activeGroupState, setActiveGroupState] = useState<CanonicalOperationsGroupId>(group);

  useEffect(() => {
    if (workspaceParam) {
      setActiveGroupState(workspaceParam);
    } else {
      setActiveGroupState(group);
    }
  }, [workspaceParam, group]);

  const activeGroup = workspaceParam || activeGroupState;
  const setActiveGroup = setActiveGroupState;

  // getOperationsGroupMeta always falls back to OPERATIONS_CANONICAL_GROUPS[0], so never undefined
  const activeGroupMeta = useMemo(() => getOperationsGroupMeta(activeGroup)!, [activeGroup]);
  
  const getParam = useCallback((key: string) => {
    return searchParams?.get(key) ?? undefined;
  }, [searchParams]);

  const activeSubGroup = useMemo(() => {
    const rawSubGroup = getParam('subGroup');
    const validSubGroups = activeGroupMeta.subGroups;
    if (rawSubGroup && validSubGroups?.some(sub => sub.id === rawSubGroup)) {
      return rawSubGroup;
    }
    return validSubGroups?.[0]?.id || undefined;
  }, [activeGroupMeta, getParam]);

  const activeSubGroupMeta = useMemo(() => {
    return activeGroupMeta.subGroups?.find((sub) => sub.id === activeSubGroup);
  }, [activeGroupMeta, activeSubGroup]);

  const focusParams = useMemo<OperationsFocusParams>(() => {
    return {
      orderId: getParam('orderId') || orderId,
      customerId: getParam('customerId'),
      ticketId: getParam('ticketId'),
      callId: getParam('callId'),
      panel: (getParam('panel') as OperationsPanelId) || panel,
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
    const groupId = id as CanonicalOperationsGroupId;
    setActiveGroup(groupId);
    const nextParams = {
      orderId: focusParams.orderId,
      customerId: focusParams.customerId,
      ticketId: focusParams.ticketId,
      callId: focusParams.callId,
      panel: focusParams.panel,
    };
    if (router) {
      router.push(buildOperationsHref(groupId, nextParams));
    }
  }, [focusParams, router]);

  const handleSelectSubTab = useCallback((id: string) => {
    if (router) {
      router.push(buildOperationsHref(activeGroup, { ...focusParams, subGroup: id }));
    }
  }, [activeGroup, focusParams, router]);

  return {
    activeGroup,
    setActiveGroup,
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
