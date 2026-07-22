import type { DshPartnerActivationStatus } from "./partner-activation.model";
import type { DshPartner, DshPartnerReadiness } from "./partner.types";

export type DshPartnerAllowedAction =
  | "read_owned_draft"
  | "read_readiness"
  | "update_owned_draft"
  | "update_first_store"
  | "upload_document"
  | "capture_field_visit"
  | "submit_for_review"
  | "read_partner"
  | "read_documents"
  | "read_field_visits"
  | "read_audit"
  | "link_unowned_store"
  | "review_documents"
  | "approve_partner"
  | "reject_partner"
  | "activate_partner"
  | "deactivate_partner"
  | "publish_store"
  | "hide_store"
  | "read_own_status"
  | "read_own_readiness"
  | "manage_authorized_store_team"
  | "manage_store_settings"
  | string;

export type DshGovernedPartner = DshPartner & {
  readonly payoutDestinationId?: string;
  readonly maskedAccountNumber?: string;
  readonly maskedIban?: string;
  readonly maskedMobileNumber?: string;
  readonly allowedActions?: readonly DshPartnerAllowedAction[];
  readonly allowedTransitions?: readonly DshPartnerActivationStatus[];
};

export type PartnerMutationContext = {
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly expectedVersion?: number;
};

export type PartnerOnboardingRuntimeState =
  | "idle"
  | "loading"
  | "empty"
  | "ready"
  | "saving"
  | "submitting"
  | "offline"
  | "forbidden"
  | "conflict"
  | "readiness_blocked"
  | "wlt_unavailable"
  | "partial"
  | "error";

export type PartnerOnboardingFailure = {
  readonly state: Exclude<PartnerOnboardingRuntimeState, "idle" | "loading" | "empty" | "ready" | "saving" | "submitting">;
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly reloadRequired: boolean;
};

export type PartnerOnboardingViewModel = {
  readonly partner: DshGovernedPartner;
  readonly readiness: DshPartnerReadiness | null;
  readonly allowedActions: readonly DshPartnerAllowedAction[];
  readonly allowedTransitions: readonly DshPartnerActivationStatus[];
  readonly canEditDraft: boolean;
  readonly canCaptureEvidence: boolean;
  readonly canSubmit: boolean;
  readonly canApprove: boolean;
  readonly canPublish: boolean;
  readonly payoutConfigured: boolean;
  readonly payoutDisplay: string;
  readonly readinessBlockers: readonly string[];
};

let attemptSequence = 0;

function randomToken(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  attemptSequence += 1;
  return `${Date.now().toString(36)}-${attemptSequence.toString(36)}`;
}

export function createPartnerMutationContext(
  operation: string,
  resourceId: string,
  expectedVersion?: number,
): PartnerMutationContext {
  const suffix = randomToken();
  const prefix = `${operation}-${resourceId}`.replace(/[^a-zA-Z0-9_.-]+/g, "-").slice(0, 64);
  return {
    idempotencyKey: `${prefix}-${suffix}`,
    correlationId: `jrn001-${prefix}-${suffix}`,
    ...(expectedVersion !== undefined ? { expectedVersion } : {}),
  };
}

export function derivePartnerOnboardingViewModel(
  partner: DshGovernedPartner,
  readiness: DshPartnerReadiness | null = null,
): PartnerOnboardingViewModel {
  const allowedActions = partner.allowedActions ?? [];
  const allowedTransitions = partner.allowedTransitions ?? [];
  const has = (action: DshPartnerAllowedAction) => allowedActions.includes(action);
  const payoutDisplay =
  partner.maskedAccountNumber ||
  partner.maskedIban ||
  partner.maskedMobileNumber ||
  "";
  const readinessBlockers = readiness?.checklist
    .filter((item) => !item.satisfied)
    .map((item) => item.blockedReason || item.label) ?? [];

  return {
    partner,
    readiness,
    allowedActions,
    allowedTransitions,
    canEditDraft: has("update_owned_draft"),
    canCaptureEvidence: has("capture_field_visit") || has("upload_document"),
    canSubmit: has("submit_for_review") && readinessBlockers.length === 0,
    canApprove: has("approve_partner"),
    canPublish: has("publish_store"),
    payoutConfigured: Boolean(partner.payoutDestinationId || payoutDisplay),
    payoutDisplay,
    readinessBlockers,
  };
}

type HttpLikeError = {
  readonly kind?: string;
  readonly status?: number;
  readonly code?: string;
  readonly message?: string;
};

export function mapPartnerOnboardingFailure(error: unknown): PartnerOnboardingFailure {
  const value = (error && typeof error === "object" ? error : {}) as HttpLikeError;
  const status = value.status ?? 0;
  const code = value.code ?? (value.kind === "network" ? "NETWORK_ERROR" : "UNKNOWN_ERROR");
  const serverMessage = value.message?.trim();

  if (value.kind === "network" || status === 0) {
    return {
      state: "offline",
      code,
      message: serverMessage || "تعذر الاتصال بالخادم. احتفظ بالمسودة وأعد المحاولة عند عودة الشبكة.",
      retryable: true,
      reloadRequired: false,
    };
  }
  if (status === 401 || status === 403) {
    return {
      state: "forbidden",
      code,
      message: serverMessage || "لا تملك صلاحية تنفيذ هذا الإجراء على ملف الشريك.",
      retryable: false,
      reloadRequired: false,
    };
  }
  if (status === 409) {
    return {
      state: "conflict",
      code,
      message: serverMessage || "تغير ملف الشريك من سطح آخر. أعد تحميل الحالة قبل الحفظ.",
      retryable: true,
      reloadRequired: true,
    };
  }
  if (status === 422 || status === 428) {
    return {
      state: "readiness_blocked",
      code,
      message: serverMessage || "لا يمكن تنفيذ الإجراء قبل استكمال متطلبات الجاهزية.",
      retryable: false,
      reloadRequired: status === 428,
    };
  }
  if (status === 502 || status === 503) {
    return {
      state: "wlt_unavailable",
      code,
      message: serverMessage || "خدمة وجهة الصرف غير متاحة حاليًا. لم تُحفظ بيانات مالية خام في DSH.",
      retryable: true,
      reloadRequired: false,
    };
  }
  return {
    state: "error",
    code,
    message: serverMessage || "تعذر إكمال عملية تأهيل الشريك.",
    retryable: status >= 500,
    reloadRequired: false,
  };
}

export function assertPartnerReadback(
  expectedPartnerId: string,
  expectedMinimumVersion: number,
  partner: DshGovernedPartner,
): DshGovernedPartner {
  if (partner.id !== expectedPartnerId) {
    throw { kind: "integrity", code: "PARTNER_READBACK_MISMATCH", message: "partner readback identity mismatch" };
  }
  if (!Number.isInteger(partner.version) || partner.version < expectedMinimumVersion) {
    throw { kind: "integrity", code: "PARTNER_READBACK_STALE", message: "partner readback version is stale" };
  }
  return partner;
}
