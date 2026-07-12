import { createDshHttpClient } from "../_kernel/dsh-http-request";

export type FieldActivationIssueResult = {
  readonly activationId: string;
  readonly code: string;
  readonly maskedPhone: string;
  readonly expiresAt: string;
};

const { request } = createDshHttpClient("/api/auth", "field-activation", 10000);

function errorCode(error: unknown): string | null {
  return typeof error === "object" && error !== null && "code" in error && typeof (error as { code: unknown }).code === "string"
    ? (error as { code: string }).code
    : null;
}

function activationIssueMessage(error: unknown): string {
  switch (errorCode(error)) {
    case "ACTIVATION_TARGET_NOT_FOUND":
      return "لا يوجد موظف ميداني مسجل بهذا الرقم في خدمة الهوية";
    case "ACTIVATION_UNAVAILABLE":
      return "خدمة التفعيل غير مهيأة: تحقق من إعداد IDENTITY_ACTIVATION_HMAC_SECRET";
    case "ACTIVATION_RATE_LIMITED":
      return "تم إصدار كود لهذا الرقم حديثًا، أعد المحاولة بعد دقيقة";
    case "FORBIDDEN":
      return "جلسة لوحة التحكم لا تملك صلاحية إصدار كود تفعيل";
    case "SESSION_NOT_FOUND":
    case "UNAUTHENTICATED":
      return "انتهت جلسة لوحة التحكم، سجّل الدخول مرة أخرى";
    default:
      return "تعذر إصدار كود التفعيل من خدمة الهوية";
  }
}

export async function issueFieldActivationCode(phone: string): Promise<FieldActivationIssueResult> {
  try {
    return await request<FieldActivationIssueResult>("/activations", {
      method: "POST",
      idempotencyKey: `field-activation-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString()}`,
      body: { phone },
    });
  } catch (error) {
    throw new Error(activationIssueMessage(error));
  }
}
