import React from 'react';
import { useIdentitySession } from '@bthwani/core-identity';
import { Box, Button } from '@bthwani/ui-kit';
import { useStoreOnboardingFeeReferenceController } from '../../shared/platform';
import { OperationHeader } from './OperationHeader';
import { DshPartnerOnboardingActionPanel, type PartnerOnboardingFlowId } from './PartnerOnboardingActionPanel';

export type OnboardingActionScreenProps = {
  activeFlowId?: PartnerOnboardingFlowId;
  onBack?: () => void;
  onOpenScreen?: (screenId: PartnerOnboardingFlowId) => void;
  onSecondaryAction?: () => void;
};

const onboardingFlowCopy: Record<PartnerOnboardingFlowId, { title: string; subtitle: string }> = {
  'doc-upload': {
    title: 'رفع المستندات',
    subtitle: 'أكمل متطلبات المستندات والامتثال للفرع من نفس المسار التشغيلي.',
  },
  'intake-start': {
    title: 'بدء الاستقبال',
    subtitle: 'ابدأ تسلسل الإدخال أو التهيئة الأولية دون توسيع النطاق إلى شاشة منفصلة جديدة.',
  },
  'store-nomination': {
    title: 'ترشيح متجر',
    subtitle: 'رشّح فرعًا جديدًا أو راجع جاهزية الفرع الحالي قبل المتابعة.',
  },
};

export function OnboardingActionScreen({ activeFlowId = 'doc-upload', onBack, onOpenScreen, onSecondaryAction }: OnboardingActionScreenProps) {
  const activeCopy = onboardingFlowCopy[activeFlowId];
  const identity = useIdentitySession();
  const { state: feeRefState } = useStoreOnboardingFeeReferenceController(identity.state.kind);
  const feePolicy = feeRefState.kind === 'success' && feeRefState.data.enabled ? feeRefState.data : undefined;

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

      <DshPartnerOnboardingActionPanel
        activeFlowId={activeFlowId}
        {...(feePolicy ? { feePolicy } : {})}
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
