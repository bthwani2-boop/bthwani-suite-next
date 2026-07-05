import React from 'react';
import { Badge, Box, Button, ListItem, SectionHeader, Surface } from '@bthwani/ui-kit';

export type PartnerOnboardingFlowId = 'doc-upload' | 'intake-start' | 'store-nomination';

const ONBOARDING_ITEMS: Array<{ id: PartnerOnboardingFlowId; title: string; subtitle: string }> = [
  { id: 'doc-upload', title: 'رفع المستندات', subtitle: 'أكمل متطلبات الامتثال الخاصة بالفرع.' },
  { id: 'intake-start', title: 'بدء الاستقبال', subtitle: 'ابدأ تسلسل إدخال الفرع أو الملف البديل.' },
  { id: 'store-nomination', title: 'ترشيح متجر', subtitle: 'رشّح فرعًا جديدًا قبل الدخول في خطوات أعمق.' },
];

export type DshPartnerOnboardingActionPanelProps = {
  activeFlowId?: PartnerOnboardingFlowId;
  onSelectFlow?: (flowId: PartnerOnboardingFlowId) => void;
};

export function DshPartnerOnboardingActionPanel({ activeFlowId, onSelectFlow }: DshPartnerOnboardingActionPanelProps) {
  return (
    <Surface tone="raised" gap={3}>
      <SectionHeader title="مسارات التهيئة والإدخال" subtitle="هذه اللوحة تنظم المسارات التشغيلية الأولية دون توسيع النطاق إلى شاشات مستقلة." />
      <Box gap={2}>
        {ONBOARDING_ITEMS.map((item) => (
          <ListItem
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            meta={activeFlowId === item.id ? 'المسار النشط' : 'افتح المسار'}
            trailing={<Badge label="Onboarding" tone="neutral" />}
            onPress={() => onSelectFlow?.(item.id)}
          />
        ))}
      </Box>
      <Button label="فتح المسار المحدد" tone="secondary" onPress={activeFlowId ? () => onSelectFlow?.(activeFlowId) : undefined} />
    </Surface>
  );
}

export default DshPartnerOnboardingActionPanel;
