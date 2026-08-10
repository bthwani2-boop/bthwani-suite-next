import { fail, lineNumber, read } from "../_guard-utils.mjs";

const guardId = "partner-support-truth-gate";
const violations = [];

// Partner support is served by the actor-generic /dsh/support/tickets family.
// The actor and its scope are derived from the trusted session, not from a
// /dsh/partner/... path segment, so there is deliberately no partner-specific
// route, handler or contract to assert. This gate keeps the partner surface
// bound to that one implementation and blocks a partner-local fork.
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
      "/dsh/support/tickets",
      "idempotencyKey: context.idempotencyKey",
      "correlationId: context.correlationId",
    ],
    forbidden: [
      [/\bfetch\s*\(/g, "RAW_PARTNER_SUPPORT_FETCH_FORBIDDEN"],
      [/\/dsh\/partner\/support\/tickets/g, "RETIRED_PARTNER_SUPPORT_PATH_FORBIDDEN"],
    ],
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
    file: "services/dsh/backend/internal/http/support_actor_routes.go",
    required: [
      'requireActor(w, r, "client", "partner", "captain")',
      "actorSupportRole(actor.Role)",
      "support.CreateActorTicket",
      "support.GetActorTicket",
      "support.ListActorTickets",
      "support.ListActorRichMessages",
    ],
    forbidden: [
      // The partner must never be identified by a client-supplied path or body
      // value; authority comes from the resolved session actor.
      [/PathValue\("partnerId"\)/g, "PARTNER_SCOPE_FROM_REQUEST_FORBIDDEN"],
    ],
  },
  {
    file: "services/dsh/backend/internal/support/actor.go",
    required: ["create_idempotency_key", "pg_advisory_xact_lock", "reporter_role"],
    forbidden: [],
  },
  {
    // Reporter-facing reads must never expose operator-internal notes. That
    // invariant is owned here, by the includeInternal flag, not by the caller.
    file: "services/dsh/backend/internal/support/rich_message_media.go",
    required: [
      "func ListActorRichMessages",
      "return listRichMessages(db, actorID, role, ticketID, false)",
    ],
    forbidden: [],
  },
  {
    file: "services/dsh/backend/internal/http/server.go",
    required: [
      'POST /dsh/support/tickets',
      'GET /dsh/support/tickets',
      'GET /dsh/support/tickets/{ticketId}',
      'GET /dsh/support/tickets/{ticketId}/messages',
      'POST /dsh/support/tickets/{ticketId}/messages',
    ],
    forbidden: [
      [/\/dsh\/partner\/support\/tickets/g, "RETIRED_PARTNER_SUPPORT_ROUTE_FORBIDDEN"],
    ],
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
    file: "services/dsh/contracts/dsh.openapi.yaml",
    required: [
      "/dsh/support/tickets:",
      "/dsh/support/tickets/{ticketId}:",
      "/dsh/support/tickets/{ticketId}/messages:",
    ],
    forbidden: [
      [/dsh\.partner-support\.openapi\.yaml/g, "RETIRED_PARTNER_SUPPORT_CONTRACT_REFERENCE_FORBIDDEN"],
    ],
  },
  {
    file: "services/dsh/contracts/contract-registry.ts",
    required: ['id: "dsh-support-governance"', 'adapterOwner: "frontend/shared/support"'],
    forbidden: [
      [/dsh-partner-support/g, "RETIRED_PARTNER_SUPPORT_REGISTRY_ENTRY_FORBIDDEN"],
    ],
  },
  {
    file: "contracts/openapi/index.yaml",
    required: ["dsh: ../../services/dsh/contracts/dsh.openapi.yaml"],
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
