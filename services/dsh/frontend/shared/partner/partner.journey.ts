// partner.journey.ts — partner lifecycle journey stubs
// Authority: dsh/frontend/shared/partner
// These represent the onboarding and lifecycle stages for a DSH partner.

export type DshPartnerLifecycleStage =
  | 'prospecting'
  | 'onboarding'
  | 'active'
  | 'suspended'
  | 'offboarded';

export type DshPartnerJourneyStep = {
  readonly stage: DshPartnerLifecycleStage;
  readonly label: string;
  readonly completed: boolean;
};

export function getDshPartnerJourneyStep(
  stage: DshPartnerLifecycleStage | undefined,
): DshPartnerJourneyStep {
  return {
    stage: stage ?? 'onboarding',
    label: resolveStageLabel(stage ?? 'onboarding'),
    completed: stage === 'active' || stage === 'offboarded',
  };
}

export function resolveDshPartnerLifecycleStageLabel(
  stage: DshPartnerLifecycleStage | undefined,
): string {
  return resolveStageLabel(stage ?? 'onboarding');
}

function resolveStageLabel(stage: DshPartnerLifecycleStage): string {
  const labels: Record<DshPartnerLifecycleStage, string> = {
    prospecting: 'استكشاف',
    onboarding: 'تأهيل',
    active: 'نشط',
    suspended: 'موقوف',
    offboarded: 'منتهي',
  };
  return labels[stage] ?? stage;
}
