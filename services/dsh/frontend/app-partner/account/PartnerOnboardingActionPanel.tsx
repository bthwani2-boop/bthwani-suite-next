import React from 'react';
import { Badge, Box, Button, ListItem, SectionHeader, Surface, Text } from '@bthwani/ui-kit';
import type { DshStoreOnboardingFeePolicy } from '../../shared/platform-policies';

export type PartnerOnboardingFlowId = 'doc-upload' | 'intake-start' | 'store-nomination';

const ONBOARDING_ITEMS: Array<{ id: PartnerOnboardingFlowId; title: string; subtitle: string }> = [
  { id: 'doc-upload', title: 'رفع المستندات', subtitle: 'أكمل متطلبات الامتثال الخاصة بالفرع.' },
  { id: 'intake-start', title: 'بدء الاستقبال', subtitle: 'ابدأ تسلسل إدخال الفرع أو الملف البديل.' },
  { id: 'store-nomination', title: 'ترشيح متجر', subtitle: 'رشّح فرعًا جديدًا قبل الدخول في خطوات أعمق.' },
];

export type DshPartnerOnboardingActionPanelProps = {
  activeFlowId?: PartnerOnboardingFlowId;
  onSelectFlow?: (flowId: PartnerOnboardingFlowId) => void;
  /** Read-only reference — control-panel owns this policy; never mutated here. */
  feePolicy?: DshStoreOnboardingFeePolicy;
};

const CHARGE_TIMING_LABELS: Record<DshStoreOnboardingFeePolicy['chargeTiming'], string> = {
  on_approval: 'عند الاعتماد',
  on_publication: 'عند النشر',
  on_first_order: 'عند أول طلب',
  manual: 'يدويًا',
};

export function DshPartnerOnboardingActionPanel({ activeFlowId, onSelectFlow, feePolicy }: DshPartnerOnboardingActionPanelProps) {
  return (
    <Surface tone="raised" gap={3}>
      <SectionHeader title="مسارات التهيئة والإدخال" subtitle="هذه اللوحة تنظم المسارات التشغيلية الأولية دون توسيع النطاق إلى شاشات مستقلة." />
      {feePolicy ? (
        <Text role="bodySm" tone="muted">
          {`رسوم إضافة متجر: ${feePolicy.amount} ${feePolicy.currency} — تُحصَّل ${CHARGE_TIMING_LABELS[feePolicy.chargeTiming]}.`}
        </Text>
      ) : null}
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

// export default DshPartnerOnboardingActionPanel; // Unused default export