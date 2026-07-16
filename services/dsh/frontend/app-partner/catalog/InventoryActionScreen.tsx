import React from 'react';
import { Box, Button } from '@bthwani/ui-kit';
import { OperationHeader } from '../account/OperationHeader';
import { DshPartnerInventoryActionPanel, type PartnerInventoryFlowId } from './PartnerInventoryActionPanel';

export type InventoryActionScreenProps = {
  activeFlowId?: PartnerInventoryFlowId;
  onBack?: () => void;
  onOpenScreen?: (screenId: PartnerInventoryFlowId) => void;
  onSecondaryAction?: () => void;
};

const inventoryFlowCopy: Record<PartnerInventoryFlowId, { title: string; subtitle: string }> = {
  'inventory-adjust': {
    title: 'تعديل مخزون سريع',
    subtitle: 'صحّح الكمية أو الإتاحة لعنصر واحد بسرعة من داخل نفس المسار.',
  },
  'inventory-update': {
    title: 'تحديث مخزون جماعي',
    subtitle: 'راجع التغييرات الأوسع على المخزون والأسعار والتوفر.',
  },
  'items-upsert': {
    title: 'إضافة أو تحديث منتج',
    subtitle: 'ابدأ دائمًا بالبحث في الكتالوج قبل إنشاء عنصر جديد أو تعديله.',
  },
};

export function InventoryActionScreen({ activeFlowId = 'inventory-adjust', onBack, onOpenScreen, onSecondaryAction }: InventoryActionScreenProps) {
  const activeCopy = inventoryFlowCopy[activeFlowId];

  return (
    <Box gap={4}>
      <OperationHeader
        title={activeCopy.title}
        subtitle={activeCopy.subtitle}
        actions={
          <>
            {onBack ? <Button label="العودة" tone="secondary" fullWidth={false} onPress={onBack} /> : null}
            {onSecondaryAction ? <Button label="العودة لدليل العمليات" fullWidth={false} onPress={onSecondaryAction} /> : null}
          </>
        }
      />

      <DshPartnerInventoryActionPanel
        activeFlowId={activeFlowId}
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
