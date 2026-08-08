export type FieldReadinessProblemKind =
  | "permission_denied"
  | "offline"
  | "not_found"
  | "validation"
  | "blocked"
  | "conflict"
  | "already_complete"
  | "location"
  | "internal";

export type FieldReadinessNextAction =
  | "reauthenticate"
  | "refresh_scope"
  | "complete_checklist"
  | "add_evidence"
  | "resolve_escalation"
  | "refresh_record"
  | "recapture_location"
  | "enable_location"
  | "move_into_geofence"
  | "recover_queue"
  | "correct_input"
  | "retry"
  | "contact_support"
  | "none";

export type FieldReadinessProblem = {
  readonly kind: FieldReadinessProblemKind;
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly nextAction: FieldReadinessNextAction;
  readonly status?: number;
  readonly serverMessage?: string;
  /** Support reference echoed from the request that produced this failure. */
  readonly correlationId?: string;
};

type ProblemDefinition = Omit<
  FieldReadinessProblem,
  "code" | "status" | "serverMessage" | "correlationId"
>;

type ErrorLike = {
  readonly kind?: unknown;
  readonly status?: unknown;
  readonly code?: unknown;
  readonly message?: unknown;
  readonly body?: unknown;
  readonly correlationId?: unknown;
};

const DEFINITIONS: Readonly<Record<string, ProblemDefinition>> = {
  AUTHENTICATION_REQUIRED: {
    kind: "permission_denied",
    message: "انتهت جلسة العمل أو لم تعد صالحة. سجّل الدخول مجددًا ثم أعد فتح المهمة.",
    retryable: false,
    nextAction: "reauthenticate",
  },
  UNAUTHORIZED: {
    kind: "permission_denied",
    message: "انتهت جلسة العمل أو لم تعد صالحة. سجّل الدخول مجددًا ثم أعد فتح المهمة.",
    retryable: false,
    nextAction: "reauthenticate",
  },
  SESSION_EXPIRED: {
    kind: "permission_denied",
    message: "انتهت جلسة العمل. سجّل الدخول مجددًا ثم أعد فتح المهمة.",
    retryable: false,
    nextAction: "reauthenticate",
  },
  FORBIDDEN: {
    kind: "permission_denied",
    message: "لا تملك صلاحية الوصول إلى هذا المتجر أو هذه الزيارة. حدّث التكليفات أو تواصل مع المشرف.",
    retryable: false,
    nextAction: "refresh_scope",
  },
  NOT_FOUND: {
    kind: "not_found",
    message: "لم يعد السجل متاحًا ضمن نطاقك الحالي. حدّث البيانات ثم ارجع إلى قائمة المهام.",
    retryable: false,
    nextAction: "refresh_record",
  },
  CHECKLIST_INCOMPLETE: {
    kind: "blocked",
    message: "لا يمكن إكمال الزيارة قبل اجتياز جميع عناصر قائمة التحقق الإلزامية.",
    retryable: false,
    nextAction: "complete_checklist",
  },
  EVIDENCE_REQUIRED: {
    kind: "blocked",
    message: "لا يمكن متابعة العملية قبل إضافة الأدلة المطلوبة لعناصر التحقق.",
    retryable: false,
    nextAction: "add_evidence",
  },
  OPEN_ESCALATION: {
    kind: "blocked",
    message: "يوجد تصعيد مفتوح يمنع إغلاق الزيارة. عالج التصعيد أو انتظر قرار العمليات.",
    retryable: false,
    nextAction: "resolve_escalation",
  },
  VISIT_ALREADY_COMPLETE: {
    kind: "already_complete",
    message: "اكتملت هذه الزيارة مسبقًا. حدّث الشاشة لقراءة النتيجة المعتمدة.",
    retryable: false,
    nextAction: "refresh_record",
  },
  VISIT_ALREADY_IN_PROGRESS: {
    kind: "conflict",
    message: "توجد زيارة أخرى قيد التنفيذ لهذا المتجر أو لهذا الموظف. حدّث قائمة المهام قبل المتابعة.",
    retryable: false,
    nextAction: "refresh_record",
  },
  LOCATION_REQUIRED: {
    kind: "location",
    message: "يلزم التقاط موقع الجهاز لإثبات الزيارة.",
    retryable: true,
    nextAction: "recapture_location",
  },
  // Client-origin location codes. They intentionally share the taxonomy with
  // the server codes above so a locally detected refusal reads the same as a
  // server refusal on every surface.
  LOCATION_PERMISSION_DENIED: {
    kind: "location",
    message: "لم تُمنح صلاحية الوصول إلى الموقع. فعّل إذن الموقع للتطبيق ثم أعد المحاولة.",
    retryable: false,
    nextAction: "enable_location",
  },
  LOCATION_SERVICES_DISABLED: {
    kind: "location",
    message: "خدمة تحديد الموقع متوقفة على الجهاز. شغّلها ثم التقط الموقع مجددًا.",
    retryable: false,
    nextAction: "enable_location",
  },
  MEDIA_PERMISSION_DENIED: {
    kind: "permission_denied",
    message: "لم تُمنح صلاحية الكاميرا أو الملفات. فعّل الإذن من إعدادات الجهاز ثم أعد التقاط الدليل.",
    retryable: false,
    nextAction: "add_evidence",
  },
  MEDIA_UPLOAD_FAILED: {
    kind: "internal",
    message: "تعذر رفع الدليل. تحقق من الاتصال ثم أعد المحاولة؛ لم يُفقد الدليل الملتقط.",
    retryable: true,
    nextAction: "retry",
  },
  OFFLINE_QUEUE_CORRUPT: {
    kind: "conflict",
    message: "تعذّرت قراءة طابور العمليات المحفوظة. حُفظت نسخة للاسترجاع، ويلزم تشغيل الاستعادة قبل المزامنة.",
    retryable: false,
    nextAction: "recover_queue",
  },
  LOCATION_STALE: {
    kind: "location",
    message: "قراءة الموقع قديمة. التقط الموقع مجددًا وأعد المحاولة.",
    retryable: true,
    nextAction: "recapture_location",
  },
  LOCATION_ACCURACY: {
    kind: "location",
    message: "دقة الموقع غير كافية. انتقل إلى مكان مفتوح قرب المتجر والتقط الموقع مجددًا.",
    retryable: true,
    nextAction: "recapture_location",
  },
  LOCATION_MOCKED: {
    kind: "location",
    message: "تم رفض الموقع لأنه صادر من محاكاة. أوقف تطبيقات الموقع الوهمي والتقط موقع الجهاز الحقيقي.",
    retryable: false,
    nextAction: "recapture_location",
  },
  GEOFENCE_VIOLATION: {
    kind: "location",
    message: "أنت خارج النطاق الجغرافي المسموح لإكمال الزيارة. اقترب من موقع المتجر ثم التقط الموقع مجددًا.",
    retryable: true,
    nextAction: "move_into_geofence",
  },
  INVALID_INPUT: {
    kind: "validation",
    message: "توجد بيانات غير صالحة أو ناقصة. راجع الحقول المطلوبة ثم أعد الإرسال.",
    retryable: false,
    nextAction: "correct_input",
  },
  INTERNAL_ERROR: {
    kind: "internal",
    message: "تعذر إكمال العملية بسبب خلل تشغيلي. أعد المحاولة، وإن استمر الخلل فتواصل مع الدعم مستخدمًا رمز السبب.",
    retryable: true,
    nextAction: "contact_support",
  },
};

const AUTHENTICATION_REQUIRED = DEFINITIONS.AUTHENTICATION_REQUIRED!;
const FORBIDDEN = DEFINITIONS.FORBIDDEN!;
const NOT_FOUND = DEFINITIONS.NOT_FOUND!;
const INTERNAL_ERROR = DEFINITIONS.INTERNAL_ERROR!;

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseBody(body: unknown): { readonly code?: string; readonly message?: string } {
  if (typeof body !== "string" || !body.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== "object") return {};
    const candidate = parsed as { readonly code?: unknown; readonly message?: unknown };
    const code = asNonEmptyString(candidate.code);
    const message = asNonEmptyString(candidate.message);
    return {
      ...(code ? { code } : {}),
      ...(message ? { message } : {}),
    };
  } catch {
    return {};
  }
}

function normalizeCode(value: string | undefined): string | undefined {
  return value?.trim().toUpperCase().replaceAll("-", "_");
}

export function createFieldReadinessProblem(
  code: string,
  message: string,
  options: {
    readonly kind?: FieldReadinessProblemKind;
    readonly retryable?: boolean;
    readonly nextAction?: FieldReadinessNextAction;
    readonly status?: number;
    readonly serverMessage?: string;
    readonly correlationId?: string;
  } = {},
): FieldReadinessProblem {
  return {
    kind: options.kind ?? "validation",
    code: normalizeCode(code) ?? "CLIENT_ERROR",
    message,
    retryable: options.retryable ?? false,
    nextAction: options.nextAction ?? "correct_input",
    ...(options.status !== undefined ? { status: options.status } : {}),
    ...(options.serverMessage ? { serverMessage: options.serverMessage } : {}),
    ...(options.correlationId ? { correlationId: options.correlationId } : {}),
  };
}

/**
 * Classifies a transport/domain failure into the governed field taxonomy and
 * attaches the request correlation id so every surface can render a support
 * reference instead of collapsing the failure into a generic message.
 */
export function classifyFieldReadinessError(error: unknown): FieldReadinessProblem {
  const problem = classifyProblem(error);
  const typed = (error && typeof error === "object" ? error : {}) as ErrorLike;
  const correlationId = asNonEmptyString(typed.correlationId);
  return correlationId ? { ...problem, correlationId } : problem;
}

function classifyProblem(error: unknown): FieldReadinessProblem {
  const typed = (error && typeof error === "object" ? error : {}) as ErrorLike;
  const status = typeof typed.status === "number" && Number.isFinite(typed.status)
    ? typed.status
    : undefined;
  const parsedBody = parseBody(typed.body);
  const rawCode = asNonEmptyString(typed.code) ?? parsedBody.code;
  const code = normalizeCode(rawCode);
  const serverMessage = asNonEmptyString(typed.message) ?? parsedBody.message;

  if (typed.kind === "network") {
    return {
      kind: "offline",
      code: "NETWORK_UNAVAILABLE",
      message: "لا يوجد اتصال بالخدمة. حُفظت العملية للمزامنة عندما يكون ذلك آمنًا، أو يمكنك إعادة المحاولة بعد عودة الشبكة.",
      retryable: true,
      nextAction: "retry",
      ...(serverMessage ? { serverMessage } : {}),
    };
  }

  if (typed.kind === "invalid_request") {
    return createFieldReadinessProblem(
      "INVALID_REQUEST",
      serverMessage ?? "تعذر إرسال العملية بسبب بيانات غير صالحة. راجع المدخلات ثم أعد المحاولة.",
      {
        kind: "validation",
        retryable: false,
        nextAction: "correct_input",
        ...(status !== undefined ? { status } : {}),
        ...(serverMessage ? { serverMessage } : {}),
      },
    );
  }

  const definition = code ? DEFINITIONS[code] : undefined;
  if (code && definition) {
    return {
      ...definition,
      code,
      ...(status !== undefined ? { status } : {}),
      ...(serverMessage ? { serverMessage } : {}),
    };
  }

  if (status === 401) {
    return {
      ...AUTHENTICATION_REQUIRED,
      code: code ?? "AUTHENTICATION_REQUIRED",
      status,
      ...(serverMessage ? { serverMessage } : {}),
    };
  }
  if (status === 403) {
    return {
      ...FORBIDDEN,
      code: code ?? "FORBIDDEN",
      status,
      ...(serverMessage ? { serverMessage } : {}),
    };
  }
  if (status === 404) {
    return {
      ...NOT_FOUND,
      code: code ?? "NOT_FOUND",
      status,
      ...(serverMessage ? { serverMessage } : {}),
    };
  }
  if (status === 409) {
    return {
      kind: "conflict",
      code: code ?? "STATE_CONFLICT",
      message: "تغيّرت حالة المهمة أو نُفذت العملية مسبقًا. حدّث البيانات قبل إعادة المحاولة.",
      retryable: false,
      nextAction: "refresh_record",
      status,
      ...(serverMessage ? { serverMessage } : {}),
    };
  }
  if (status !== undefined && status >= 400 && status < 500) {
    return {
      kind: "validation",
      code: code ?? `HTTP_${status}`,
      message: "تعذر تنفيذ العملية بسبب بيانات أو حالة غير صالحة. راجع المهمة ثم أعد المحاولة.",
      retryable: false,
      nextAction: "correct_input",
      status,
      ...(serverMessage ? { serverMessage } : {}),
    };
  }

  const errorMessage = error instanceof Error ? asNonEmptyString(error.message) : undefined;
  return {
    ...INTERNAL_ERROR,
    code: code ?? (status ? `HTTP_${status}` : "UNKNOWN_ERROR"),
    message: errorMessage ?? INTERNAL_ERROR.message,
    ...(status !== undefined ? { status } : {}),
    ...(serverMessage ? { serverMessage } : {}),
  };
}
