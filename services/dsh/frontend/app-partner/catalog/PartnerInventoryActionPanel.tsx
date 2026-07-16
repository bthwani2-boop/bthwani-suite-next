import React from 'react';
import { Badge, Box, Button, ListItem, SectionHeader, Surface, Text } from '@bthwani/ui-kit';

export type PartnerInventoryFlowId = 'inventory-adjust' | 'inventory-update' | 'items-upsert';

const INVENTORY_FLOW_ITEMS: Array<{
  id: PartnerInventoryFlowId;
  title: string;
  subtitle: string;
}> = [
  { id: 'inventory-adjust', title: 'تعديل مخزون سريع', subtitle: 'صحّح كمية أو إتاحة عنصر واحد بسرعة.' },
  { id: 'inventory-update', title: 'تحديث مخزون جماعي', subtitle: 'راجع دفعة أوسع من تغييرات المخزون والأسعار.' },
  { id: 'items-upsert', title: 'إضافة أو تحديث منتج', subtitle: 'ابدأ دائمًا بالبحث في الكتالوج قبل الحفظ.' },
];

export type DshPartnerInventoryActionPanelProps = {
  activeFlowId?: PartnerInventoryFlowId;
  onSelectFlow?: (flowId: PartnerInventoryFlowId) => void;
};

export function DshPartnerInventoryActionPanel({ activeFlowId, onSelectFlow }: DshPartnerInventoryActionPanelProps) {
  return (
    <Surface tone="raised" gap={3}>
      <SectionHeader title="إجراءات المخزون والكتالوج" subtitle="لوحة خفيفة لتصنيف إجراءات المخزون بدون إنشاء شاشات إضافية الآن." />
      <Box gap={2}>
        {INVENTORY_FLOW_ITEMS.map((item) => (
          <ListItem
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            meta={activeFlowId === item.id ? 'المسار النشط' : 'افتح المسار'}
            trailing={<Badge label="Catalog" tone="neutral" />}
            onPress={() => onSelectFlow?.(item.id)}
          />
        ))}
      </Box>
      <Text role="bodySm" tone="muted">لا يوجد API أو استيراد runtime جديد في هذا panel.</Text>
      <Button label="متابعة من داخل لوحة المخزون" tone="secondary" onPress={activeFlowId ? () => onSelectFlow?.(activeFlowId) : undefined} />
    </Surface>
  );
}

// export default DshPartnerInventoryActionPanel; // Unused default export