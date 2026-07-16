import type { DshSpecialRequestResponse, ClassifiedSpecialRequestError } from "./special-requests.types";
import type { DshSpecialRequestState } from "./special-requests.states";
import {
  specialRequestConflictState,
  specialRequestOfflineState,
  specialRequestRecoverableErrorState,
  specialRequestSubmittedState,
  specialRequestSubmittingState,
  specialRequestValidatingState,
} from "./special-requests.states";

export function beginValidate(): DshSpecialRequestState {
  return specialRequestValidatingState();
}

export function beginSubmit(): DshSpecialRequestState {
  return specialRequestSubmittingState();
}

export function resolveSubmitSuccess(request: DshSpecialRequestResponse): DshSpecialRequestState {
  return specialRequestSubmittedState(request);
}

export function resolveSubmitError(classified: ClassifiedSpecialRequestError): DshSpecialRequestState {
  if (classified.kind === "network") {
    return specialRequestOfflineState();
  }
  if (classified.kind === "conflict") {
    return specialRequestConflictState(classified.message ?? "تم تعديل الطلب من جهة أخرى — أعد التحميل ثم حاول مجددًا.");
  }
  if (classified.kind === "forbidden") {
    return specialRequestRecoverableErrorState("يلزم تسجيل الدخول لإتمام هذا الطلب.");
  }
  if (classified.kind === "not_found") {
    return specialRequestRecoverableErrorState("تعذر العثور على الطلب.");
  }
  if (classified.kind === "invalid") {
    return specialRequestRecoverableErrorState("بيانات الطلب غير صالحة.");
  }
  if (classified.kind === "unavailable") {
    return specialRequestRecoverableErrorState("خدمة الدفع غير متاحة حاليًا، حاول لاحقًا.");
  }
  return specialRequestRecoverableErrorState("تعذر تنفيذ الطلب.");
}

export function resolveCancelSuccess(request: DshSpecialRequestResponse): DshSpecialRequestState {
  return specialRequestSubmittedState(request);
}

export function resolveApproveQuoteSuccess(request: DshSpecialRequestResponse): DshSpecialRequestState {
  return specialRequestSubmittedState(request);
}

export function resolveMutationError(classified: ClassifiedSpecialRequestError): DshSpecialRequestState {
  return resolveSubmitError(classified);
}
