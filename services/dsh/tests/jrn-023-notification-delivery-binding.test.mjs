import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("JRN-023 notification delivery audit and dead-letter closure", () => {
  const migration = source("../database/migrations/dsh-097_notification_delivery_audit.sql");
  const outbox = source("../backend/internal/operationaloutbox/operationaloutbox.go");
  const domain = source("../backend/internal/notifications/delivery_audit.go");
  const routes = source("../backend/internal/http/notification_routes.go");
  const api = source("../frontend/shared/notifications/notifications.api.ts");
  const controller = source("../frontend/shared/notifications/use-notifications-controller.tsx");
  const screen = source("../frontend/control-panel/support/PlatformNotificationConfigScreen.tsx");

  it("persists bounded retry attempts and a terminal dead-letter state", () => {
    assert.match(migration, /dsh_notification_delivery_attempts/);
    assert.match(migration, /dead_letter/);
    assert.match(outbox, /MaxDeliveryAttempts\s*=\s*10/);
    assert.match(outbox, /status = "failed"/);
    assert.match(outbox, /outcome = "dead_letter"/);
  });

  it("exposes delivery attempts only through the operator boundary", () => {
    assert.match(domain, /ListDeliveryAttempts/);
    assert.match(routes, /GET \/dsh\/operator\/notifications\/delivery-attempts/);
    assert.match(api, /fetchNotificationDeliveryAttempts/);
    assert.match(controller, /useNotificationDeliveryAuditController/);
    assert.match(screen, /تدقيق تسليم الإشعارات/);
    assert.match(screen, /Dead letter/);
  });
});
