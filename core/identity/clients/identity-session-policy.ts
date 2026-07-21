import type { IdentitySessionState } from "./identity-session-store.ts";

export type IdentitySessionAction =
  | "configure"
  | "login"
  | "request_activation"
  | "consume_activation"
  | "read_session"
  | "list_sessions"
  | "revoke_session"
  | "logout"
  | "change_password"
  | "delete_account";

export type IdentityErrorPresentation = {
  readonly title: string;
  readonly description: string;
  readonly retryable: boolean;
};

export function identitySessionAllowedActions(state: IdentitySessionState): readonly IdentitySessionAction[] {
  switch (state.kind) {
    case "unconfigured":
      return ["configure"];
    case "restoring":
    case "authenticating":
      return [];
    case "signed_out":
    case "error":
      return ["login", "request_activation", "consume_activation"];
    case "authenticated":
      return [
        "read_session",
        "list_sessions",
        "revoke_session",
        "logout",
        "change_password",
        "delete_account",
      ];
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

export function identityErrorPresentation(code: string): IdentityErrorPresentation {
  switch (code) {
    case "FORBIDDEN":
    case "CORS_ORIGIN_FORBIDDEN":
      return {
        title: "الوصول غير مسموح",
        description: "لا يملك هذا الحساب أو السطح صلاحية تنفيذ العملية.",
        retryable: false,
      };
    case "PHONE_ALREADY_BOUND":
    case "USERNAME_TAKEN":
    case "SESSION_NOT_FOUND":
      return {
        title: "تعارض في الهوية",
        description: "تغيّرت حالة الحساب. حدّث البيانات ثم أعد المحاولة.",
        retryable: true,
      };
    case "ACTIVATION_RATE_LIMITED":
    case "LOGIN_RATE_LIMITED":
      return {
        title: "محاولات كثيرة",
        description: "انتظر قليلًا قبل إعادة المحاولة.",
        retryable: true,
      };
    case "IDENTITY_SESSION_INVALID":
    case "INVALID_REFRESH_TOKEN":
    case "UNAUTHENTICATED":
      return {
        title: "انتهت الجلسة",
        description: "سجّل الدخول أو فعّل الحساب من جديد.",
        retryable: true,
      };
    case "IDENTITY_UNAVAILABLE":
    case "IDENTITY_NOT_READY":
    case "INTERNAL_API_UNAVAILABLE":
      return {
        title: "الخدمة غير متاحة",
        description: "تحقق من الاتصال ثم أعد المحاولة دون فقد البيانات المدخلة.",
        retryable: true,
      };
    default:
      return {
        title: "تعذر إكمال العملية",
        description: "أعد المحاولة. إذا استمرت المشكلة تواصل مع الدعم واذكر رمز الخطأ.",
        retryable: true,
      };
  }
}
