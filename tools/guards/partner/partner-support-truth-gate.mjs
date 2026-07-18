import { fail, lineNumber, read } from "../../_guard-utils.mjs";

const guardId = "partner-support-truth-gate";
const violations = [];

const checks = [
  {
    file: "services/dsh/frontend/app-partner/account/PartnerSupportScreen.tsx",
    required: [
      "usePartnerSupportController",
      "controller.createTicket",
      "controller.sendMessage",
      "controller.detailState.messages",
      "initialCaseId ? { orderId: initialCaseId }",
    ],
    forbidden: [
      [/دعم الشريك غير مفعّل تشغيليًا/g, "PARTNER_SUPPORT_PLACEHOLDER_FORBIDDEN"],
      [/ORD-\d+/g, "FIXED_PARTNER_SUPPORT_ORDER_FORBIDDEN"],
      [/Promise\.resolve\s*\(/g, "LOCAL_PARTNER_SUPPORT_SUCCESS_FORBIDDEN"],
      [/Math\.random\s*\(/g, "RANDOM_PARTNER_SUPPORT_ID_FORBIDDEN"],
    ],
  },
  {
    file: "services/dsh/frontend/shared/support/partner-support.api.ts",
    required: [
      "createDshHttpClient",
      "/dsh/partner/support/tickets",
      "idempotencyKey: context.idempotencyKey",
      "correlationId: context.correlationId",
    ],
    forbidden: [[/\bfetch\s*\(/g, "RAW_PARTNER_SUPPORT_FETCH_FORBIDDEN"]],
  },
  {
    file: "services/dsh/frontend/shared/support/partner-support-attempt.ts",
    required: [
      "AsyncStorage",
      "getOrCreatePartnerTicketAttempt",
      "getOrCreatePartnerMessageAttempt",
      "clearPartnerTicketAttempt",
      "clearPartnerMessageAttempt",
    ],
    forbidden: [[/Math\.random\s*\(/g, "RANDOM_SUPPORT_RETRY_ID_FORBIDDEN"]],
  },
  {
    file: "services/dsh/backend/internal/http/partner_support.go",
    required: [
      'requireActor(w, r, "partner")',
      'r.Header.Get("Idempotency-Key")',
      "support.CreatePartnerTicket",
      "support.GetPartnerTicket",
      "support.AddPartnerMessage",
      "support.ListPartnerMessages",
    ],
    forbidden: [],
  },
  {
    file: "services/dsh/backend/internal/support/partner.go",
    required: [
      "dsh_store_actor_scopes",
      "reporter_role = 'partner'",
      "create_idempotency_key",
      "pg_advisory_xact_lock",
      "writePartnerTicketEventTx",
      "m.is_internal = FALSE",
    ],
    forbidden: [],
  },
  {
    file: "services/dsh/backend/internal/http/server.go",
    required: [
      'POST /dsh/partner/support/tickets',
      'GET /dsh/partner/support/tickets',
      'GET /dsh/partner/support/tickets/{ticketId}',
      'GET /dsh/partner/support/tickets/{ticketId}/messages',
      'POST /dsh/partner/support/tickets/{ticketId}/messages',
    ],
    forbidden: [],
  },
  {
    file: "services/dsh/database/migrations/dsh-059_partner_support_integrity.sql",
    required: [
      "uq_dsh_support_ticket_reporter_idempotency",
      "uq_dsh_support_message_sender_idempotency",
      "dsh_support_ticket_events",
      "idx_dsh_support_tickets_reporter_role_created",
    ],
    forbidden: [],
  },
  {
    file: "services/dsh/contracts/dsh.partner-support.openapi.yaml",
    required: [
      "listDshPartnerSupportTickets",
      "createDshPartnerSupportTicket",
      "getDshPartnerSupportTicket",
      "listDshPartnerSupportMessages",
      "addDshPartnerSupportMessage",
      "x-bthwani-client-binding: MANUAL_TYPED_ADAPTER",
    ],
    forbidden: [],
  },
  {
    file: "services/dsh/contracts/contract-registry.ts",
    required: [
      'id: "dsh-partner-support"',
      'path: "contracts/dsh.partner-support.openapi.yaml"',
      'adapterOwner: "frontend/shared/support"',
    ],
    forbidden: [],
  },
  {
    file: "contracts/master.openapi.yaml",
    required: ["dshPartnerSupport: ../services/dsh/contracts/dsh.partner-support.openapi.yaml"],
    forbidden: [],
  },
];

for (const check of checks) {
  const content = read(check.file);
  for (const marker of check.required) {
    if (!content.includes(marker)) {
      violations.push({ file: check.file, line: 0, message: `REQUIRED_PARTNER_SUPPORT_MARKER_MISSING ${marker}` });
    }
  }
  for (const [pattern, message] of check.forbidden) {
    for (const match of content.matchAll(pattern)) {
      violations.push({ file: check.file, line: lineNumber(content, match.index), message });
    }
  }
}

fail(guardId, violations);
