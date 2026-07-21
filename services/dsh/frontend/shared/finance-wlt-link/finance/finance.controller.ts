'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CanonicalFinanceGroupId,
  FinancePanelId,
  FinanceViewState,
} from './finance.types';
import {
  getFinanceGroupMeta,
  buildFinanceHref,
  FINANCE_CANONICAL_GROUPS,
} from './finance-registry';
import { buildWltDshFinanceHubViewModel } from '@bthwani/wlt';
import {
  loadDshFinanceRuntimeReadModel,
  approvePayoutRequest,
  rejectPayoutRequest,
  processPayoutRequest,
  completePayoutRequest,
  failPayoutRequest,
  transitionPayoutRequest,
  upsertSettlementPolicy,
  createSettlementFromDeliveredOrders,
  assignReconciliationCase,
  loadOpenReconciliationCases,
  resolveReconciliationCase,
} from './finance-hub-runtime.api';
import type {
  FinanceActionResult,
  FinancePayoutRequest,
  GovernedSettlementInput,
  PayoutTransition,
  ReconciliationCase,
  SettlementActionResult,
  SettlementPolicyInput,
} from './finance-hub-runtime.api';
import type {
  WltDshFinanceRuntimeResult,
  WltDshFinanceHubViewModel,
} from '@bthwani/wlt';

export type UseFinanceControllerProps = {
  group?: CanonicalFinanceGroupId;
  panel?: FinancePanelId;
  state?: FinanceViewState;
  searchParams?: { get: (key: string) => string | null };
  router?: { push: (href: string) => void };
};

export function useFinanceController({
  group = 'financial-command-center',
  panel,
  state = 'ready',
  searchParams,
  router,
}: UseFinanceControllerProps) {
  const workspaceParam = searchParams?.get('workspace') as CanonicalFinanceGroupId | null;
  const [activeGroupState, setActiveGroupState] = useState<CanonicalFinanceGroupId>(group);

  useEffect(() => {
    if (workspaceParam) setActiveGroupState(workspaceParam);
    else setActiveGroupState(group);
  }, [workspaceParam, group]);

  const activeGroup = workspaceParam || activeGroupState;
  const activeGroupMeta = useMemo(() => getFinanceGroupMeta(activeGroup), [activeGroup]);
  const getParam = useCallback((key: string) => searchParams?.get(key) ?? undefined, [searchParams]);

  const activeSubGroup = useMemo(
    () => getParam('subGroup') || activeGroupMeta.subGroups?.[0]?.id || undefined,
    [activeGroupMeta, getParam],
  );
  const activeSubGroupMeta = useMemo(
    () => activeGroupMeta.subGroups?.find((sub) => sub.id === activeSubGroup),
    [activeGroupMeta, activeSubGroup],
  );
  const hubHref = useMemo(
    () => buildFinanceHref(activeGroup, { subGroup: activeSubGroup, panel }),
    [activeGroup, activeSubGroup, panel],
  );

  const tabItems = useMemo(
    () => FINANCE_CANONICAL_GROUPS.map((item) => ({ id: item.id, label: item.label, active: item.id === activeGroup })),
    [activeGroup],
  );
  const subTabItems = useMemo(
    () => activeGroupMeta.subGroups?.map((sub) => ({ id: sub.id, label: sub.label, active: activeSubGroup === sub.id })) ?? [],
    [activeGroupMeta, activeSubGroup],
  );

  const [runtimeFinance, setRuntimeFinance] = useState<WltDshFinanceRuntimeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadDshFinanceRuntimeReadModel();
      setRuntimeFinance(result);
      setErrorMsg(null);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unknown loading error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const financeHubView = useMemo<WltDshFinanceHubViewModel>(
    () => buildWltDshFinanceHubViewModel(runtimeFinance),
    [runtimeFinance],
  );

  const activeState: FinanceViewState = useMemo(() => {
    if (loading) return 'loading';
    if (errorMsg) return 'error';
    if (!runtimeFinance) return 'empty';
    if (runtimeFinance.state === 'blocked') return 'offline';
    return state;
  }, [loading, errorMsg, runtimeFinance, state]);

  const onTabSelect = useCallback((id: string) => {
    const nextGroup = id as CanonicalFinanceGroupId;
    const meta = getFinanceGroupMeta(nextGroup);
    if (router) router.push(buildFinanceHref(nextGroup, { subGroup: meta.subGroups?.[0]?.id, panel }));
  }, [router, panel]);

  const onSubTabSelect = useCallback((subId: string) => {
    if (router) router.push(buildFinanceHref(activeGroup, { subGroup: subId, panel }));
  }, [router, activeGroup, panel]);

  return {
    activeGroup,
    activeGroupMeta,
    activeSubGroup,
    activeSubGroupMeta,
    activeState,
    tabItems,
    subTabItems,
    hubHref,
    financeHubView,
    runtimeFinance,
    reload: loadData,
    onTabSelect,
    onSubTabSelect,
  };
}

export {
  approvePayoutRequest,
  rejectPayoutRequest,
  processPayoutRequest,
  completePayoutRequest,
  failPayoutRequest,
  transitionPayoutRequest,
  upsertSettlementPolicy,
  createSettlementFromDeliveredOrders,
  assignReconciliationCase,
  loadOpenReconciliationCases,
  resolveReconciliationCase,
};
export type {
  FinanceActionResult,
  FinancePayoutRequest,
  GovernedSettlementInput,
  PayoutTransition,
  ReconciliationCase,
  SettlementActionResult,
  SettlementPolicyInput,
};
