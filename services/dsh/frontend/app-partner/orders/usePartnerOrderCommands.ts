import React from 'react';
import {
  acceptOrder,
  classifyOrderError,
  markOrderPreparing,
  markOrderReady,
  rejectOrder,
} from '../../shared/orders/orders.api';
import type { PartnerOrderItem } from '../../shared/orders/orders.contract';

export type PartnerOrderMutationCommand = 'accept' | 'prepare' | 'ready' | 'reject';

export type PartnerOrderCommandState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting'; readonly command: PartnerOrderMutationCommand; readonly orderId: string }
  | { readonly kind: 'success'; readonly command: PartnerOrderMutationCommand; readonly orderId: string }
  | { readonly kind: 'error'; readonly command: PartnerOrderMutationCommand; readonly orderId: string; readonly message: string };

export function resolvePartnerOrderMutation(
  actionId: string,
  status: PartnerOrderItem['status'],
): PartnerOrderMutationCommand | null {
  if (actionId === 'accept') return 'accept';
  if (actionId === 'ready') return 'ready';
  if (actionId === 'prepare') {
    return status === 'preparation_started' ? 'prepare' : 'ready';
  }
  return null;
}

function resolveErrorMessage(error: unknown): string {
  const classified = classifyOrderError(error);
  if (classified.kind === 'permission_denied') return 'لا تملك صلاحية تنفيذ هذا الإجراء على الطلب.';
  if (classified.kind === 'offline') return 'تعذر الاتصال. لم يتم تغيير حالة الطلب.';
  if (classified.kind === 'conflict') return classified.message ?? 'تغيرت حالة الطلب. أعد تحميل القائمة.';
  if (classified.kind === 'not_found') return 'الطلب غير موجود أو لم يعد ضمن نطاق المتجر.';
  return classified.message ?? 'تعذر تنفيذ عملية الطلب.';
}

export function usePartnerOrderCommands(refreshOrders: () => void | Promise<void>) {
  const [state, setState] = React.useState<PartnerOrderCommandState>({ kind: 'idle' });

  const execute = React.useCallback(async (
    command: PartnerOrderMutationCommand,
    orderId: string,
    reason?: string,
  ): Promise<boolean> => {
    if (!orderId) return false;
    if (command === 'reject' && !reason?.trim()) {
      setState({ kind: 'error', command, orderId, message: 'سبب رفض الطلب مطلوب.' });
      return false;
    }

    setState({ kind: 'submitting', command, orderId });
    try {
      if (command === 'accept') await acceptOrder(orderId);
      else if (command === 'prepare') await markOrderPreparing(orderId);
      else if (command === 'ready') await markOrderReady(orderId);
      else await rejectOrder(orderId, { reason: reason!.trim() });

      await refreshOrders();
      setState({ kind: 'success', command, orderId });
      return true;
    } catch (error) {
      setState({ kind: 'error', command, orderId, message: resolveErrorMessage(error) });
      await refreshOrders();
      return false;
    }
  }, [refreshOrders]);

  const reset = React.useCallback(() => setState({ kind: 'idle' }), []);

  return { state, execute, reset } as const;
}
