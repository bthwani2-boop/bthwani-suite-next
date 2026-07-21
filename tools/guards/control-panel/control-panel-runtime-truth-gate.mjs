import { fail, lineNumber, read } from "../_guard-utils.mjs";

const guardId = "control-panel-runtime-truth-gate";
const violations = [];

const checks = [
  {
    file: "services/dsh/frontend/control-panel/operations/AssistedOrderDeskScreen.tsx",
    forbidden: [
      [/Math\.random\s*\(/g, "RANDOM_ASSISTED_ORDER_ID_FORBIDDEN"],
      [/Promise\.resolve\s*\(/g, "SYNTHETIC_ASSISTED_ORDER_SUBMIT_FORBIDDEN"],
      [/منتج افتراضي/g, "SYNTHETIC_ASSISTED_PRODUCT_FORBIDDEN"],
      [/setSubmitStatus\s*\(\s*['\"]success['\"]\s*\)/g, "LOCAL_ASSISTED_SUCCESS_FORBIDDEN"],
    ],
    required: [
      "Assisted-order mutation is intentionally fail-closed",
      "لا يوجد حاليًا عقد سيادي",
      "buildOperationsHref('live-orders'",
      "buildOperationsHref('special-ops'",
    ],
  },
  {
    file: "services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx",
    forbidden: [
      [/applyEscalateLocally/g, "LOCAL_ESCALATION_MUTATION_FORBIDDEN"],
      [/applyResolveLocally/g, "LOCAL_RESOLUTION_MUTATION_FORBIDDEN"],
      [/preview-temp-/g, "SYNTHETIC_TICKET_REFERENCE_FORBIDDEN"],
      [/simulated default owners/gi, "SIMULATED_ESCALATION_OWNER_FORBIDDEN"],
    ],
    required: [
      "fetchOperatorEscalations",
      "updateEscalation",
      "fetchDshRuntimeOrders",
      "التعديلات متاحة فقط لتصعيدات الجاهزية ذات معرف DSH حقيقي",
      "الطلبات الملغاة للقراءة والتنقل فقط",
    ],
  },
  {
    file: "services/dsh/frontend/control-panel/operations/GeoHeatmapScreen.tsx",
    forbidden: [
      [/Math\.random\s*\(/g, "RANDOM_HEATMAP_POINTS_FORBIDDEN"],
      [/generateHeatmapPoints/g, "SYNTHETIC_HEATMAP_GENERATOR_FORBIDDEN"],
    ],
    required: ["DSH_GEO_HEATMAP_QUARANTINED", "لا توجد نقاط خرائط تشغيلية قابلة للعرض"],
  },
  {
    file: "services/dsh/frontend/control-panel/platform/DshPlatformVarsWorkspace.tsx",
    forbidden: [
      [/usePlatformAuditStateHook/g, "LOCAL_PLATFORM_AUDIT_HOOK_FORBIDDEN"],
      [/platform-audit-state/g, "LOCAL_PLATFORM_AUDIT_IMPORT_FORBIDDEN"],
    ],
    required: [
      "عقد platform-control فعلياً",
      "disabled",
      "usePlatformVarsModel({ activeDomain })",
    ],
  },
  {
    file: "services/dsh/frontend/shared/platform/platform-vars.model.ts",
    forbidden: [
      [/addAuditEvent/g, "LOCAL_PLATFORM_AUDIT_WRITE_FORBIDDEN"],
      [/Math\.random\s*\(/g, "RANDOM_PLATFORM_AUDIT_ID_FORBIDDEN"],
    ],
    required: [
      "Read-only platform variables model",
      "PLATFORM_CONTROL_MUTATION_CONTRACT_REQUIRED",
      "no local state or audit event is written",
    ],
  },
  {
    file: "services/dsh/frontend/shared/platform/index.ts",
    forbidden: [[/platform-audit-state/g, "DELETED_PLATFORM_AUDIT_EXPORT_FORBIDDEN"]],
    required: [],
  },
  {
    file: "services/dsh/frontend/shared/store/store-role.api.ts",
    forbidden: [[/Math\.random\s*\(/g, "RANDOM_STORE_ROLE_IDEMPOTENCY_FORBIDDEN"]],
    required: ["auth: DshMutationAuth", "idempotencyKey: auth.idempotencyKey", "correlationId: auth.correlationId"],
  },
  {
    file: "services/dsh/frontend/shared/store/use-store-role-context-controller.tsx",
    forbidden: [],
    required: ["resolveStoreRoleMutationAttempt", "mutationAttemptRef.current = attempt", "إعادة الإجراء نفسه ستستخدم مفتاحه السابق"],
  },
  {
    file: "services/dsh/frontend/shared/store/use-store-admin-controller.tsx",
    forbidden: [],
    required: ["resolveStoreRoleMutationAttempt", "mutationAttemptRef.current = attempt", "إعادة إجراء الحوكمة نفسه ستستخدم مفتاحه السابق"],
  },
  {
    file: "services/wlt/frontend/shared/dsh/wlt-dsh-http-request.ts",
    forbidden: [[/Math\.random\s*\(/g, "RANDOM_WLT_CORRELATION_FORBIDDEN"]],
    required: ["wltCorrelationSequence", "crypto?.randomUUID"],
  },
];

for (const check of checks) {
  const content = read(check.file);
  for (const [pattern, message] of check.forbidden) {
    for (const match of content.matchAll(pattern)) {
      violations.push({ file: check.file, line: lineNumber(content, match.index), message });
    }
  }
  for (const marker of check.required) {
    if (!content.includes(marker)) {
      violations.push({
        file: check.file,
        line: 0,
        message: `REQUIRED_CONTROL_PANEL_TRUTH_MARKER_MISSING:${marker}`,
      });
    }
  }
}

fail(guardId, violations);
