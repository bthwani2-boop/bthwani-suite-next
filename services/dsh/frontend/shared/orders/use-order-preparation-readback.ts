import React from 'react';
import {
  classifyOrderError,
  fetchOrderPreparation,
  fetchOrderPreparationIssues,
} from './orders.api';
import type {
  DshOrderPreparation,
  DshPreparationIssue,
} from './orders.types';

export type DshOrderPreparationReadbackState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'offline'; readonly message: string }
  | { readonly kind: 'forbidden'; readonly message: string }
  | { readonly kind: 'not_found'; readonly message: string }
  | { readonly kind: 'error'; readonly message: string }
  | {
      readonly kind: 'ready';
      readonly preparation: DshOrderPreparation;
      readonly issues: readonly DshPreparationIssue[];
      readonly openCount: number;
      readonly pendingCustomerDecisionCount: number;
    };

function readbackFailure(error: unknown): Exclude<
  DshOrderPreparationReadbackState,
  { readonly kind: 'idle' | 'loading' | 'ready' }
> {
  const classified = classifyOrderError(error);
  if (classified.kind === 'offline') {
    return { kind: 'offline', message: 'تعذر الاتصال بحقيقة تجهيز الطلب.' };
  }
  if (classified.kind === 'permission_denied') {
    return { kind: 'forbidden', message: 'لا تسمح صلاحية الحساب بقراءة تجهيز هذا الطلب.' };
  }
  if (classified.kind === 'not_found') {
    return { kind: 'not_found', message: 'الطلب غير مرتبط بهذا الحساب أو لم يعد متاحًا.' };
  }
  return { kind: 'error', message: classified.message ?? 'تعذر تحميل تجهيز الطلب.' };
}

export function useOrderPreparationReadback(
  orderId: string,
  options: { readonly pollIntervalMs?: number } = {},
) {
  const [state, setState] = React.useState<DshOrderPreparationReadbackState>(
    orderId.trim() ? { kind: 'loading' } : { kind: 'idle' },
  );

  const refresh = React.useCallback(async () => {
    const normalizedOrderId = orderId.trim();
    if (!normalizedOrderId) {
      setState({ kind: 'idle' });
      return;
    }
    setState((current) => current.kind === 'ready' ? current : { kind: 'loading' });
    try {
      const [preparation, issueList] = await Promise.all([
        fetchOrderPreparation(normalizedOrderId),
        fetchOrderPreparationIssues(normalizedOrderId),
      ]);
      setState({
        kind: 'ready',
        preparation,
        issues: issueList.issues,
        openCount: issueList.openCount,
        pendingCustomerDecisionCount: issueList.pendingCustomerDecisionCount,
      });
    } catch (error) {
      setState(readbackFailure(error));
    }
  }, [orderId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    const intervalMs = options.pollIntervalMs ?? 0;
    if (!orderId.trim() || intervalMs < 5_000) return undefined;
    const interval = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(interval);
  }, [options.pollIntervalMs, orderId, refresh]);

  return { state, refresh } as const;
}
