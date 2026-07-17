'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PartnerWorkspaceTabId, PartnerSubTabItem, PartnerWorkspaceTabItem } from './partner-registry';
import {
  PARTNER_PRIMARY_TABS,
  PARTNER_SUB_TAB_DEFINITIONS,
  buildPartnersHref,
  isPartnerWorkspaceTabId,
  resolvePartnerSubTab,
} from './partner-registry';
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

const ACTIVE_PARTNER_STATUSES = new Set(['partner_active', 'client_visible']);
const CLOSED_PARTNER_STATUSES = new Set(['ops_rejected', 'partner_deactivated']);

export function usePartnersController({
  initialWorkspace = 'inbox',
  searchParams,
  router,
  authKind,
}: UsePartnersControllerProps) {
  const workspaceValue = searchParams?.get('workspace');
  const workspaceParam = isPartnerWorkspaceTabId(workspaceValue) ? workspaceValue : null;
  const [activeTabState, setActiveTabState] = useState<PartnerWorkspaceTabId>(initialWorkspace);

  useEffect(() => {
    setActiveTabState(workspaceParam ?? initialWorkspace);
  }, [workspaceParam, initialWorkspace]);

  const activeTab = workspaceParam ?? activeTabState;
  const subTabDefinitions = PARTNER_SUB_TAB_DEFINITIONS[activeTab];
  const activeSubTab = resolvePartnerSubTab(activeTab, searchParams?.get('subGroup'));

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
    if (adminController.listState.kind !== 'success') return 0;
    return adminController.listState.partners.filter((partner) => ACTIVE_PARTNER_STATUSES.has(partner.activationStatus)).length;
  }, [adminController.listState]);

  const pendingCount = useMemo(() => {
    if (adminController.listState.kind !== 'success') return 0;
    return adminController.listState.partners.filter((partner) => (
      !ACTIVE_PARTNER_STATUSES.has(partner.activationStatus)
      && !CLOSED_PARTNER_STATUSES.has(partner.activationStatus)
    )).length;
  }, [adminController.listState]);

  const handleSelectTab = useCallback((id: PartnerWorkspaceTabId) => {
    if (router) router.push(buildPartnersHref(id));
  }, [router]);

  const handleSelectSubTab = useCallback((subId: string) => {
    if (router) router.push(buildPartnersHref(activeTab, { subGroup: subId }));
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
