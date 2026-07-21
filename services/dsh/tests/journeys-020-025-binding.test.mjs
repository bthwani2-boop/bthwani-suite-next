import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync } from "node:fs";

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function exists(relativePath) {
  return existsSync(new URL(relativePath, import.meta.url));
}

describe("JRN-020 delivery exceptions and return custody", () => {
  const transport = source("../frontend/shared/dispatch/dispatch.api.ts");

  it("re-reads captain exception truth after report and return arrival", () => {
    assert.match(transport, /reportDeliveryException[\s\S]*return fetchCaptainDeliveryException\(assignmentId\)/);
    assert.match(transport, /arriveCaptainReturnToStore[\s\S]*return fetchCaptainDeliveryException\(assignmentId\)/);
  });

  it("re-reads partner custody after accepting the returned order", () => {
    assert.match(transport, /acceptPartnerReturnToStore[\s\S]*return fetchPartnerReturnToStore\(orderId\)/);
  });
});

describe("JRN-021 support conversation and order rescue", () => {
  const actorApi = source("../frontend/shared/support/actor-support.api.ts");
  const deliveryApi = source("../frontend/shared/support/support-message-delivery.api.ts");
  const deliveryDomain = source("../backend/internal/support/message_delivery.go");
  const deliveryRoutes = source("../backend/internal/http/support_message_delivery_routes.go");
  const migration = source("../database/migrations/dsh-096_support_message_delivery.sql");
  const conversation = source("../frontend/app-captain/orders/CaptainOrderSupportConversationScreen.tsx");
  const navigation = source("../frontend/shared/delivery/captain-navigation.model.ts");
  const policy = source("../frontend/shared/delivery/delivery.policy.ts");
  const apiMain = source("../backend/cmd/dsh-api/main.go");

  it("uses governed actor support routes for captain conversations", () => {
    assert.match(actorApi, /\/dsh\/support\/tickets/);
    assert.match(actorApi, /idempotencyKey: context\.idempotencyKey/);
    assert.match(conversation, /fetchActorSupportMessages/);
    assert.doesNotMatch(conversation, /setMessages\(\(current\)/);
    assert.doesNotMatch(conversation, /تم الإرسال بنجاح/);
  });

  it("persists attachment references and read receipts through the shared boundary", () => {
    assert.match(migration, /dsh_support_message_attachments/);
    assert.match(migration, /dsh_support_message_read_receipts/);
    assert.match(deliveryDomain, /AttachActorMessageAsset/);
    assert.match(deliveryDomain, /MarkActorTicketMessagesRead/);
    assert.match(deliveryRoutes, /messages\/\{messageId\}\/attachments/);
    assert.match(deliveryRoutes, /messages\/read/);
    assert.match(deliveryApi, /attachActorSupportMessageAsset/);
    assert.match(deliveryApi, /markActorSupportMessagesRead/);
    assert.match(conversation, /markActorSupportMessagesRead/);
    assert.match(apiMain, /RegisterSupportMessageDeliveryRoutes\(router/);
  });

  it("routes the order chat command to the live support screen", () => {
    assert.match(policy, /orderchat: 'support-screen'/);
    assert.match(navigation, /command\.target === 'orderchat'/);
    assert.match(navigation, /setSelectedSupportScreen\('chat-send'\)/);
  });
});

describe("JRN-022 Awnak and SHEIN special requests", () => {
  const controller = source("../frontend/shared/special-requests/use-special-requests-controller.tsx");

  it("requires canonical readback after client mutations", () => {
    assert.match(controller, /createSpecialRequest[\s\S]*fetchClientSpecialRequest\(created\.id\)/);
    assert.match(controller, /cancelSpecialRequest[\s\S]*fetchClientSpecialRequest\(id\)/);
    assert.match(controller, /approveSpecialRequestQuote[\s\S]*fetchClientSpecialRequest\(id\)/);
  });

  it("requires canonical readback after operator updates and dispatch assignment", () => {
    assert.match(controller, /updateOperatorSpecialRequest[\s\S]*fetchOperatorSpecialRequest\(id\)/);
    assert.match(controller, /assignSpecialRequestDispatch[\s\S]*fetchOperatorSpecialRequest\(id\)/);
  });
});

describe("JRN-023 actor notifications", () => {
  const api = source("../frontend/shared/notifications/notifications.api.ts");
  const controller = source("../frontend/shared/notifications/use-notifications-controller.tsx");

  it("reads preferences before presenting actor controls", () => {
    assert.match(api, /GET|fetchNotificationPreferences/);
    assert.match(api, /request\("\/dsh\/notifications\/preferences"\)/);
    assert.match(controller, /fetchNotificationPreferences/);
  });

  it("re-reads preferences after every update", () => {
    assert.match(controller, /updateNotificationPreferences\(topic, enabled\)[\s\S]*loadPreferences\(\)/);
  });
});

describe("JRN-024 field visits and readiness", () => {
  const controller = source("../frontend/shared/field-readiness/use-field-readiness-controller.tsx");
  const routeRegistrar = source("../backend/internal/http/field_readiness_routes.go");
  const apiMain = source("../backend/cmd/dsh-api/main.go");

  it("refreshes visit and checklist truth after writes", () => {
    assert.match(controller, /createFieldVisit[\s\S]*await load\(\)/);
    assert.match(controller, /completeFieldVisit[\s\S]*await load\(\)/);
    assert.match(controller, /upsertReadinessCheck[\s\S]*await load\(\)/);
  });

  it("keeps offline work explicitly queued rather than locally successful", () => {
    assert.match(controller, /visitActionQueuedState/);
    assert.match(controller, /checkActionQueuedState/);
    assert.match(controller, /escalationActionQueuedState/);
  });

  it("mounts the governed field readiness routes in the DSH runtime", () => {
    assert.match(routeRegistrar, /POST \/dsh\/field\/stores\/\{storeId\}\/visits/);
    assert.match(routeRegistrar, /GET \/dsh\/operator\/field-readiness\/escalations/);
    assert.match(apiMain, /RegisterFieldReadinessRoutes\(router/);
  });
});

describe("JRN-025 campaigns, tickers, and partner offers", () => {
  const controller = source("../frontend/shared/marketing/use-marketing-controller.tsx");
  const wltBoundaryGuard = source("../../../tools/guards/wlt-financial-boundary-gate.mjs");

  it("refreshes API truth after ticker and partner-offer mutations", () => {
    assert.match(controller, /createTicker[\s\S]*await load\(\)/);
    assert.match(controller, /updateTicker[\s\S]*await load\(\)/);
    assert.match(controller, /updatePartnerOffer[\s\S]*await load\(\)/);
    assert.match(controller, /submitPartnerSelfOffer[\s\S]*await load\(\)/);
  });

  it("does not expose a client-side visibility gate bypass", () => {
    assert.doesNotMatch(controller, /toggleBypass\s*[:=]/);
    assert.doesNotMatch(controller, /bypassedGates\s*[:=]/);
  });

  it("keeps governance guards outside runtime-provider scanning without exempting scripts", () => {
    assert.match(wltBoundaryGuard, /"tools\/guards\/"/);
    assert.doesNotMatch(wltBoundaryGuard, /"tools\/guards\/wlt-financial-boundary-gate\.mjs"/);
    assert.match(wltBoundaryGuard, /"tools\/scripts\/smoke-wlt-provider-through-wlt\.ps1"/);
  });
});

describe("JRN-020..025 verification hygiene", () => {
  const verifierPath = "../../../.github/workflows/jrn-020-025-sambassam-verify.yml";

  it("keeps one permanent verifier and removes one-off repair workflows", () => {
    assert.equal(exists(verifierPath), true);
    for (const workflow of [
      "jrn-020-025-boundary-diagnostic.yml",
      "jrn-020-025-wlt-boundary-diagnostic.yml",
      "jrn-020-025-surface-import-repair.yml",
      "jrn-020-025-wlt-guard-scope-repair.yml",
    ]) {
      assert.equal(exists(`../../../.github/workflows/${workflow}`), false, `${workflow} must remain removed`);
    }
  });

  it("keeps both sovereign boundary gates in the permanent verifier", () => {
    const verifier = source(verifierPath);
    assert.match(verifier, /guard:fullstack-boundary/);
    assert.match(verifier, /guard:wlt-financial-boundary/);
    assert.match(verifier, /TestJourneys020To025ExposeGovernedRoutes/);
  });
});
