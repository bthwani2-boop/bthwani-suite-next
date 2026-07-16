import React from 'react';
import { Box, Button } from '@bthwani/ui-kit';
import { OperationHeader } from '../account/OperationHeader';
import type { DshPartnerSupportIssueCategoryId } from '../dsh-partner.types';
import {
  DshPartnerOrderIssuePanel,
  resolvePartnerOrderIssueDefaultCategory,
  type PartnerOrderIssueFlowId,
} from './PartnerOrderIssuePanel';

export type OrderIssueScreenProps = {
  activeFlowId?: PartnerOrderIssueFlowId;
  selectedCategoryId?: DshPartnerSupportIssueCategoryId;
  onBack?: () => void;
  onOpenScreen?: (screenId: PartnerOrderIssueFlowId) => void;
  onSecondaryAction?: () => void;
};

const orderIssueFlowCopy: Record<PartnerOrderIssueFlowId, { title: string; subtitle: string; secondaryLabel: string }> = {
  'order-issue-queue': {
    title: 'طابور مشكلات الطلبات',
    subtitle: 'اعرض الطلبات التي تحتاج قرارًا تشغيليًا سريعًا دون مغادرة سياق الدعم.',
    secondaryLabel: 'العودة لدليل العمليات',
  },
  'order-reject': {
    title: 'رفض الطلب',
    subtitle: 'استخدم هذا المسار فقط عند وجود سبب تشغيلي صريح ومعلن ومراجعته داخل نفس السياق.',
    secondaryLabel: 'إغلاق مسار الرفض',
  },
};

export function OrderIssueScreen({
  activeFlowId = 'order-issue-queue',
  selectedCategoryId,
  onBack,
  onOpenScreen,
  onSecondaryAction,
}: OrderIssueScreenProps) {
  const activeCopy = orderIssueFlowCopy[activeFlowId];
  const resolvedCategoryId = selectedCategoryId ?? resolvePartnerOrderIssueDefaultCategory(activeFlowId);

  return (
    <Box gap={4}>
      <OperationHeader
        title={activeCopy.title}
        subtitle={activeCopy.subtitle}
        actions={
          <>
            {onBack ? <Button label="العودة" tone="secondary" fullWidth={false} onPress={onBack} /> : null}
            {onSecondaryAction ? <Button label={activeCopy.secondaryLabel} fullWidth={false} onPress={onSecondaryAction} /> : null}
          </>
        }
      />

      <DshPartnerOrderIssuePanel
        activeFlowId={activeFlowId}
        selectedCategoryId={resolvedCategoryId}
        onSelectFlow={(flowId) => {
          if (flowId === activeFlowId) {
            onSecondaryAction?.();
            return;
          }
          onOpenScreen?.(flowId);
        }}
      />
    </Box>
  );
}
