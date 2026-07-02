import React from 'react';
import type { DshCaptainOrderBellItem, DshCaptainOrderId } from '../orders/orders.contract';

export type ClientBellModelProps = {
  notificationsModel: any;
};

export function useDshClientBellModel({
  notificationsModel,
}: ClientBellModelProps) {
  const { handleServiceLauncherPress } = notificationsModel;

  return {
    handleServiceLauncherPress,
  };
}

export type DshCaptainBellModelProps = {
  items: DshCaptainOrderBellItem[];
  onOpenOrder?: (orderId: DshCaptainOrderId) => void;
  onOpenNextOrder?: (orderId: DshCaptainOrderId) => void;
};

export function useDshCaptainBellModel({
  items,
  onOpenOrder,
  onOpenNextOrder,
}: DshCaptainBellModelProps) {
  const handleOpenNextOrder = React.useCallback(() => {
    const nextOrder = items[0];
    if (!nextOrder) return;
    if (onOpenNextOrder) {
      onOpenNextOrder(nextOrder.id);
    } else {
      onOpenOrder?.(nextOrder.id);
    }
  }, [items, onOpenOrder, onOpenNextOrder]);

  return {
    items,
    handleOpenNextOrder,
  };
}
