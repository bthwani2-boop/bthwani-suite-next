import { corrId, createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  ActivationCodeResult,
  Captain,
  CaptainDetail,
  CaptainListFilter,
  CreateCaptainInput,
  CreateFieldAgentInput,
  FieldAgent,
  FieldAgentDetail,
  FieldAgentListFilter,
  ProviderKind,
  SupervisorCandidate,
  UpdateCaptainInput,
  UpdateFieldAgentInput,
  UpdateSelfInput,
  WorkforceCity,
  WorkforceMe,
  WorkforceShift,
} from "./workforce.types";

// Same-origin BFF proxy (browser control-panel). Native apps import
// workforce-me.api.ts, which targets the workforce runtime directly.
const { request } = createDshHttpClient("/api/workforce", "workforce", 15000);

export function workforceErrorCode(error: unknown): string | null {
  return typeof error === "object" && error !== null && "code" in error && typeof (error as { code: unknown }).code === "string"
    ? (error as { code: string }).code
    : null;
}

// Distinguishes "the operator's control-panel session expired" (must
// redirect to login) from every other failure mode (network outage,
// service-down, forbidden, validation) which keeps the existing
// retry-in-place UX. The two must never be rendered with the same
// "retry" affordance — a static retry can never fix an expired session.
const SESSION_EXPIRED_CODES = new Set(["SESSION_NOT_FOUND", "SESSION_EXPIRED", "UNAUTHENTICATED"]);

export function isSessionExpiredCode(error: unknown): boolean {
  const code = workforceErrorCode(error);
  return code !== null && SESSION_EXPIRED_CODES.has(code);
}

export function workforceErrorMessage(error: unknown): string {
  switch (workforceErrorCode(error)) {
    case "PROFILE_NOT_PROVISIONED":
      return "لا يوجد ملف مقدم خدمة لهذا الحساب";
    case "PROFILE_INCOMPLETE":
      return "الملف السيادي ناقص: أكمل الاسم والرقم والمدينة والوردية قبل إصدار الكود";
    case "ENGAGEMENT_SUSPENDED":
      return "الحساب موقوف — لا يمكن تنفيذ هذا الإجراء";
    case "STATUS_NOT_ALLOWED":
      return "حالة الارتباط الحالية لا تسمح بهذا الإجراء";
    case "VERSION_CONFLICT":
      return "تم تعديل الملف من جهة أخرى — أعد التحميل ثم حاول مجددًا";
    case "DUPLICATE_PHONE":
      return "رقم الهاتف مرتبط بحساب آخر بالفعل";
    case "DUPLICATE_PROVIDER_CODE":
      return "رقم المزود مستخدم بالفعل";
    case "IDEMPOTENCY_CONFLICT":
      return "تم إرسال طلب مختلف بنفس مفتاح التكرار — أعد المحاولة بطلب جديد";
    case "INVALID_REFERENCE_CODE":
      return "كود المدينة أو الوردية غير معروف أو غير مفعل";
    case "REFERENCE_EXISTS":
      return "الكود المرجعي موجود بالفعل";
    case "ACTIVATION_RATE_LIMITED":
      return "تم إصدار كود حديثًا لهذا الحساب، أعد المحاولة بعد دقيقة";
    case "IDENTITY_UNAVAILABLE":
      return "خدمة الهوية غير متاحة حاليًا";
    case "INVALID_SUPERVISOR":
      return "المشرف المختار غير موجود أو غير مفعل — اختر مشرفًا آخر";
    case "PROVIDER_KIND_CONFLICT":
      return "هذا الحساب مسجل بالفعل كنوع آخر من مقدمي الخدمة";
    case "FORBIDDEN":
      return "جلسة لوحة التحكم لا تملك صلاحية هذا الإجراء";
    case "SESSION_NOT_FOUND":
    case "SESSION_EXPIRED":
    case "UNAUTHENTICATED":
      return "انتهت جلسة لوحة التحكم، سجّل الدخول مرة أخرى";
    default:
      return "تعذر تنفيذ الطلب على خدمة Workforce";
  }
}

function listQuery(filter: FieldAgentListFilter): string {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.city) params.set("city", filter.city);
  if (filter.q) params.set("q", filter.q);
  if (filter.limit) params.set("limit", String(filter.limit));
  if (filter.offset) params.set("offset", String(filter.offset));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function listFieldAgents(filter: FieldAgentListFilter = {}): Promise<readonly FieldAgent[]> {
  const result = await request<{ fieldAgents: FieldAgent[] }>(`/workforce/field-agents${listQuery(filter)}`);
  return result.fieldAgents;
}

export async function getFieldAgent(actorId: string): Promise<FieldAgentDetail> {
  return request<FieldAgentDetail>(`/workforce/field-agents/${encodeURIComponent(actorId)}`);
}

export async function createFieldAgent(input: CreateFieldAgentInput): Promise<FieldAgent> {
  return request<FieldAgent>("/workforce/field-agents", {
    method: "POST",
    idempotencyKey: corrId("wf-create"),
    body: input,
  });
}

export async function updateFieldAgent(actorId: string, input: UpdateFieldAgentInput): Promise<FieldAgent> {
  return request<FieldAgent>(`/workforce/field-agents/${encodeURIComponent(actorId)}`, {
    method: "PATCH",
    body: input,
  });
}

export async function suspendFieldAgent(actorId: string, expectedVersion: number, reason: string): Promise<FieldAgent> {
  return request<FieldAgent>(`/workforce/field-agents/${encodeURIComponent(actorId)}/suspend`, {
    method: "POST",
    body: { expectedVersion, reason },
  });
}

export async function reactivateFieldAgent(actorId: string, expectedVersion: number, reason: string): Promise<FieldAgent> {
  return request<FieldAgent>(`/workforce/field-agents/${encodeURIComponent(actorId)}/reactivate`, {
    method: "POST",
    body: { expectedVersion, reason },
  });
}

export async function issueFieldAgentActivationCode(actorId: string, expectedVersion: number): Promise<ActivationCodeResult> {
  return request<ActivationCodeResult>(`/workforce/field-agents/${encodeURIComponent(actorId)}/activation-codes`, {
    method: "POST",
    idempotencyKey: corrId("wf-activation"),
    body: { expectedVersion },
  });
}

export async function revokeFieldAgentActivationCodes(actorId: string): Promise<void> {
  await request<void>(`/workforce/field-agents/${encodeURIComponent(actorId)}/activation-codes`, {
    method: "DELETE",
  });
}

export async function listCaptains(filter: CaptainListFilter = {}): Promise<readonly Captain[]> {
  const result = await request<{ captains: Captain[] }>(`/workforce/captains${listQuery(filter)}`);
  return result.captains;
}

export async function getCaptain(actorId: string): Promise<CaptainDetail> {
  return request<CaptainDetail>(`/workforce/captains/${encodeURIComponent(actorId)}`);
}

export async function createCaptain(input: CreateCaptainInput): Promise<Captain> {
  return request<Captain>("/workforce/captains", {
    method: "POST",
    idempotencyKey: corrId("wf-create"),
    body: input,
  });
}

export async function updateCaptain(actorId: string, input: UpdateCaptainInput): Promise<Captain> {
  return request<Captain>(`/workforce/captains/${encodeURIComponent(actorId)}`, {
    method: "PATCH",
    body: input,
  });
}

export async function suspendCaptain(actorId: string, expectedVersion: number, reason: string): Promise<Captain> {
  return request<Captain>(`/workforce/captains/${encodeURIComponent(actorId)}/suspend`, {
    method: "POST",
    body: { expectedVersion, reason },
  });
}

export async function reactivateCaptain(actorId: string, expectedVersion: number, reason: string): Promise<Captain> {
  return request<Captain>(`/workforce/captains/${encodeURIComponent(actorId)}/reactivate`, {
    method: "POST",
    body: { expectedVersion, reason },
  });
}

export async function issueCaptainActivationCode(actorId: string, expectedVersion: number): Promise<ActivationCodeResult> {
  return request<ActivationCodeResult>(`/workforce/captains/${encodeURIComponent(actorId)}/activation-codes`, {
    method: "POST",
    idempotencyKey: corrId("wf-activation"),
    body: { expectedVersion },
  });
}

export async function revokeCaptainActivationCodes(actorId: string): Promise<void> {
  await request<void>(`/workforce/captains/${encodeURIComponent(actorId)}/activation-codes`, {
    method: "DELETE",
  });
}

export async function searchSupervisors(kind: ProviderKind, q: string): Promise<readonly SupervisorCandidate[]> {
  const params = new URLSearchParams();
  if (kind) params.set("kind", kind);
  if (q) params.set("q", q);
  const qs = params.toString();
  const result = await request<{ supervisors: SupervisorCandidate[] }>(
    `/workforce/reference/supervisors${qs ? `?${qs}` : ""}`,
  );
  return result.supervisors;
}

export async function listWorkforceCities(includeInactive = false): Promise<readonly WorkforceCity[]> {
  const result = await request<{ cities: WorkforceCity[] }>(
    `/workforce/reference/cities${includeInactive ? "?includeInactive=true" : ""}`,
  );
  return result.cities;
}

export async function createWorkforceCity(city: WorkforceCity): Promise<WorkforceCity> {
  return request<WorkforceCity>("/workforce/reference/cities", { method: "POST", body: city });
}

export async function updateWorkforceCity(city: WorkforceCity): Promise<WorkforceCity> {
  const { code, ...body } = city;
  return request<WorkforceCity>(`/workforce/reference/cities/${encodeURIComponent(code)}`, {
    method: "PATCH",
    body,
  });
}

export async function listWorkforceShifts(includeInactive = false): Promise<readonly WorkforceShift[]> {
  const result = await request<{ shifts: WorkforceShift[] }>(
    `/workforce/reference/shifts${includeInactive ? "?includeInactive=true" : ""}`,
  );
  return result.shifts;
}

export async function createWorkforceShift(shift: WorkforceShift): Promise<WorkforceShift> {
  return request<WorkforceShift>("/workforce/reference/shifts", { method: "POST", body: shift });
}

export async function updateWorkforceShift(shift: WorkforceShift): Promise<WorkforceShift> {
  const { code, ...body } = shift;
  return request<WorkforceShift>(`/workforce/reference/shifts/${encodeURIComponent(code)}`, {
    method: "PATCH",
    body,
  });
}

// Self endpoints are exported for completeness in browser contexts, but the
// canonical consumer is the native field app via workforce-me.api.ts.
export async function getWorkforceMe(): Promise<WorkforceMe> {
  return request<WorkforceMe>("/workforce/me");
}

export async function updateWorkforceMe(input: UpdateSelfInput): Promise<WorkforceMe> {
  return request<WorkforceMe>("/workforce/me", { method: "PATCH", body: input });
}
