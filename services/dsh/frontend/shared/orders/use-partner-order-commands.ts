import React from 'react';
import {
  acceptOrder,
  classifyOrderError,
  confirmStoreCaptainHandoff,
  markOrderPreparing,
  markOrderReady,
} from './orders.api';
import {
  type PartnerOrderMutationCommand,
  resolvePartnerOrderMutation,
} from './partner-order-mutation.policy';

export { resolvePartnerOrderMutation } from './partner-order-mutation.policy';
export type { PartnerOrderMutationCommand } from './partner-order-mutation.policy';

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

function resolveErrorMessage(error: unknown): string {
  const classified = classifyOrderError(error);
  if (classified.kind === 'permission_denied') return 'لا تملك صلاحية تنفيذ هذا الإجراء على الطلب.';
  if (classified.kind === 'offline') return 'تعذر الاتصال. لم يتم تغيير حالة الطلب.';
  if (classified.kind === 'conflict') return classified.message ?? 'تغيرت حالة الطلب. أعد تحميل القائمة.';
  if (classified.kind === 'not_found') return 'الطلب غير موجود أو لم يعد ضمن نطاق المتجر.';
  return classified.message ?? 'تعذر تنفيذ عملية الطلب.';
}

/** Shared mutation/readback controller for partner order preparation and handoff. */
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
        // Preserve the canonical mutation failure; readback failure is secondary.
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
