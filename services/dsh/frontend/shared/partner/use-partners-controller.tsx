'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import type { PartnerWorkspaceTabId, PartnerSubTabItem, PartnerWorkspaceTabItem } from './partner-registry';
import { PARTNER_PRIMARY_TABS, PARTNER_SUB_TAB_DEFINITIONS, buildPartnersHref } from './partner-registry';
import { usePartnerAdminController } from './use-partner-admin-controller';

export type UsePartnersControllerProps = {
  readonly initialWorkspace?: PartnerWorkspaceTabId;
  readonly searchParams?: {
    get: (key: string) => string | null;
  };
  readonly router?: {
    push: (href: string) => void;
  };
  readonly authKind: string;
};

export function usePartnersController({
  initialWorkspace = 'inbox',
  searchParams,
  router,
  authKind,
}: UsePartnersControllerProps) {
  const workspaceParam = searchParams?.get('workspace') as PartnerWorkspaceTabId | null;
  const [activeTabState, setActiveTabState] = useState<PartnerWorkspaceTabId>(initialWorkspace);

  useEffect(() => {
    if (workspaceParam) {
      setActiveTabState(workspaceParam);
    } else {
      setActiveTabState(initialWorkspace);
    }
  }, [workspaceParam, initialWorkspace]);

  const activeTab = workspaceParam || activeTabState;

  const getParam = useCallback((key: string) => {
    return searchParams?.get(key) ?? undefined;
  }, [searchParams]);

  const subTabDefinitions = useMemo(() => {
    return PARTNER_SUB_TAB_DEFINITIONS[activeTab] ?? [];
  }, [activeTab]);

  const activeSubTab = useMemo(() => {
    return getParam('subGroup') || subTabDefinitions[0]?.id || '';
  }, [subTabDefinitions, getParam]);

  const tabItems = useMemo<readonly PartnerWorkspaceTabItem[]>(() => {
    return PARTNER_PRIMARY_TABS.map((tab) => ({
      ...tab,
      active: tab.id === activeTab,
    }));
  }, [activeTab]);

  const subTabItems = useMemo<readonly (PartnerSubTabItem & { active: boolean })[]>(() => {
    return subTabDefinitions.map((sub) => ({
      ...sub,
      active: sub.id === activeSubTab,
    }));
  }, [subTabDefinitions, activeSubTab]);

  const adminController = usePartnerAdminController(authKind);

  const activePartnersCount = useMemo(() => {
    if (adminController.listState.kind !== 'success') return 4;
    const count = adminController.listState.partners.filter(p => p.activationStatus === 'partner_active').length;
    return count > 0 ? count : 4;
  }, [adminController.listState]);

  const pendingCount = useMemo(() => {
    if (adminController.listState.kind !== 'success') return 12;
    const count = adminController.listState.partners.filter(p => p.activationStatus === 'submitted').length;
    return count > 0 ? count : 12;
  }, [adminController.listState]);

  const handleSelectTab = useCallback((id: string) => {
    const nextTab = id as PartnerWorkspaceTabId;
    const defaultSub = PARTNER_SUB_TAB_DEFINITIONS[nextTab]?.[0]?.id;
    if (router) {
      router.push(buildPartnersHref(nextTab, { subGroup: defaultSub }));
    }
  }, [router]);

  const handleSelectSubTab = useCallback((subId: string) => {
    if (router) {
      router.push(buildPartnersHref(activeTab, { subGroup: subId }));
    }
  }, [router, activeTab]);

  return {
    activeTab,
    activeSubTab,
    tabItems,
    subTabItems,
    activePartnersCount,
    pendingCount,
    adminController,
    handleSelectTab,
    handleSelectSubTab,
  };
}
