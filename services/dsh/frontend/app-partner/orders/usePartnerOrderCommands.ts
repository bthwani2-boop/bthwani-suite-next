import React from 'react';
import {
  acceptOrder,
  classifyOrderError,
  confirmStoreCaptainHandoff,
  markOrderPreparing,
  markOrderReady,
} from '../../shared/orders';
import type { DshPartnerOrderAction } from '../../shared/orders';

export type PartnerOrderMutationCommand = 'accept' | 'prepare' | 'ready' | 'handoff';

export type PartnerOrderCommandState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting'; readonly command: PartnerOrderMutationCommand; readonly orderId: string }
  | {
      readonly kind: 'success';
      readonly command: PartnerOrderMutationCommand;
      readonly orderId: string;
      readonly readback: 'fresh' | 'stale';
      readonly message?: string;
    }
  | { readonly kind: 'error'; readonly command: PartnerOrderMutationCommand; readonly orderId: string; readonly message: string };

export function resolvePartnerOrderMutation(
  actionId: string,
  allowedActions: readonly DshPartnerOrderAction[],
): PartnerOrderMutationCommand | null {
  if (actionId === 'accept' && allowedActions.includes('accept')) return 'accept';
  if (actionId === 'ready' && allowedActions.includes('ready')) return 'ready';
  if (actionId === 'handoff' && allowedActions.includes('handoff')) return 'handoff';
  if (actionId === 'prepare') {
    if (allowedActions.includes('prepare')) return 'prepare';
    if (allowedActions.includes('ready')) return 'ready';
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
  ): Promise<boolean> => {
    if (!orderId) return false;

    setState({ kind: 'submitting', command, orderId });
    try {
      if (command === 'accept') await acceptOrder(orderId);
      else if (command === 'prepare') await markOrderPreparing(orderId);
      else if (command === 'ready') await markOrderReady(orderId);
      else await confirmStoreCaptainHandoff(orderId);
    } catch (error) {
      setState({ kind: 'error', command, orderId, message: resolveErrorMessage(error) });
      try {
        await refreshOrders();
      } catch {
        // Preserve the canonical mutation failure; a readback failure must not replace it.
      }
      return false;
    }

    setState({ kind: 'success', command, orderId, readback: 'stale' });
    try {
      await refreshOrders();
      setState({ kind: 'success', command, orderId, readback: 'fresh' });
    } catch {
      setState({
        kind: 'success',
        command,
        orderId,
        readback: 'stale',
        message: 'تم تنفيذ الإجراء، لكن تعذر تحديث القائمة. أعد المحاولة من شاشة الطلبات.',
      });
    }
    return true;
  }, [refreshOrders]);

  const reset = React.useCallback(() => setState({ kind: 'idle' }), []);

  return { state, execute, reset } as const;
}
