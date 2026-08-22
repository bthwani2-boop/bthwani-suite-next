import type { DshFieldVisit, DshReadinessCheck, DshOnboardingStatus, DshCheckType } from "./field-readiness.types";
import { VISIT_STATUS_LABELS } from "./field-readiness.types";
import { canCompleteVisit } from "./field-readiness.policy";

export type DshFieldVisitViewModel = {
  readonly id: string;
  readonly storeId: string;
  readonly statusLabel: string;
  readonly visitTypeLabel: string;
  readonly isInProgress: boolean;
  readonly isComplete: boolean;
  readonly startedAt: string;
  readonly completedAt: string | null;
};

export type DshChecklistViewModel = {
  readonly visitId: string;
  readonly checks: readonly DshCheckItemViewModel[];
  readonly allPassed: boolean;
  readonly passedCount: number;
  readonly totalCount: number;
  readonly canComplete: boolean;
  readonly blockers: readonly DshCheckItemViewModel[];
};

export type DshCheckItemViewModel = {
  readonly checkType: DshCheckType;
  readonly label: string;
  readonly status: "pending" | "passed" | "failed";
  readonly evidenceUrl: string;
  readonly notes: string;
  readonly required: boolean;
  readonly critical: boolean;
};

export type DshOnboardingStatusViewModel = {
  readonly storeId: string;
  readonly statusLabel: string;
  readonly isComplete: boolean;
  readonly hasOpenEscalations: boolean;
  readonly completedVisits: number;
  readonly totalVisits: number;
};

export function buildVisitViewModel(visit: DshFieldVisit): DshFieldVisitViewModel {
  return {
    id: visit.id,
    storeId: visit.storeId,
    statusLabel: VISIT_STATUS_LABELS[visit.status],
    visitTypeLabel: VISIT_TYPE_LABELS[visit.visitType] ?? visit.visitType,
    isInProgress: visit.status === "in_progress",
    isComplete: visit.status === "complete",
    startedAt: visit.startedAt,
    completedAt: visit.completedAt ?? null,
  };
}

export function buildChecklistViewModel(visit: DshFieldVisit, checks: readonly DshReadinessCheck[]): DshChecklistViewModel {
  const items: DshCheckItemViewModel[] = [...checks]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((check) => ({
      checkType: check.checkType,
      label: check.labelAr,
      status: check.status,
      evidenceUrl: check.evidenceUrl,
      notes: check.notes,
      required: check.required,
      critical: check.critical,
    }));
  const requiredItems = items.filter((item) => item.required);
  const passedCount = requiredItems.filter((item) => item.status === "passed").length;
  return {
    visitId: visit.id,
    checks: items,
    allPassed: requiredItems.length > 0 && passedCount === requiredItems.length,
    passedCount,
    totalCount: requiredItems.length,
    canComplete: canCompleteVisit(visit, checks),
    blockers: visit.status === "in_progress"
      ? requiredItems.filter((item) => item.status !== "passed")
      : [],
  };
}

function buildOnboardingStatusViewModel(status: DshOnboardingStatus): DshOnboardingStatusViewModel {
  return {
    storeId: status.storeId,
    statusLabel: ONBOARDING_STATUS_LABELS[status.status] ?? status.status,
    isComplete: status.onboardingComplete,
    hasOpenEscalations: status.openEscalations > 0,
    completedVisits: status.completedVisits,
    totalVisits: status.totalVisits,
  };
}

const VISIT_TYPE_LABELS: Record<string, string> = {
  onboarding: "تأهيل",
  periodic: "دورية",
  escalation_followup: "متابعة تصعيد",
};

const ONBOARDING_STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  complete: "مكتمل",
  escalation_required: "يتطلب حلاً للتصعيد",
};
